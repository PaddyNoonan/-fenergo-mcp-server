#!/usr/bin/env node

/**
 * AppRunner Backend Service for Fenergo Insights API
 * Runs on AWS AppRunner and provides /execute endpoint for MCP connector
 * Handles requests with payload structure:
 * {
 *   "data": {
 *     "message": "...",
 *     "scope": { ... },
 *     "conversationHistory": []
 *   }
 * }
 */

import express from 'express';
import https from 'https';
import { URL } from 'url';
import FenergoOAuthAuth from './oauth-auth.js';
import FenergoOIDCAuth from './oidc-auth.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const FENERGO_API_URL = 'https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights';
const API_TOKEN = process.env.FENERGO_API_TOKEN;
const TENANT_ID = process.env.FENERGO_TENANT_ID;

// OAuth Configuration
const FENERGO_OAUTH_ENDPOINT = process.env.FENERGO_OAUTH_ENDPOINT || 'https://identity.fenxstable.com/connect/token';
const FENERGO_CLIENT_ID = process.env.FENERGO_CLIENT_ID || 'quasar-sandbox';
const FENERGO_CLIENT_SECRET = process.env.FENERGO_CLIENT_SECRET;

console.error('[STARTUP] OAuth Configuration:');
console.error(`  FENERGO_OAUTH_ENDPOINT: ${FENERGO_OAUTH_ENDPOINT}`);
console.error(`  FENERGO_CLIENT_ID: ${FENERGO_CLIENT_ID}`);
console.error(`  FENERGO_CLIENT_SECRET: ${FENERGO_CLIENT_SECRET ? 'SET (' + FENERGO_CLIENT_SECRET.length + ' chars)' : 'NOT SET - OAuth will fail!'}`);

const oauthAuth = new FenergoOAuthAuth({
  tokenEndpoint: FENERGO_OAUTH_ENDPOINT,
  clientId: FENERGO_CLIENT_ID,
  clientSecret: FENERGO_CLIENT_SECRET
});

// OIDC Configuration for SSO
// Note: FENERGO_OIDC_REDIRECT_URI is hardcoded to match the registered callback URI in Fenergo
// because Fenergo requires exact matching and the environment variable may have stale values
const FENERGO_OIDC_CLIENT_ID = process.env.FENERGO_OIDC_CLIENT_ID || 'mcp-client';
const FENERGO_OIDC_CLIENT_SECRET = process.env.FENERGO_OIDC_CLIENT_SECRET;
const FENERGO_OIDC_AUTHORITY = process.env.FENERGO_OIDC_AUTHORITY || 'https://identity.fenxstable.com';
const FENERGO_OIDC_REDIRECT_URI = 'https://tc8srxrkcp.eu-west-1.awsapprunner.com/signin-oidc'; // Fenergo registered callback endpoint
const FENERGO_OIDC_SCOPES = (process.env.FENERGO_OIDC_SCOPES || 'openid profile email').split(' ');

console.error('[STARTUP] OIDC Configuration:');
console.error(`  FENERGO_OIDC_AUTHORITY: ${FENERGO_OIDC_AUTHORITY}`);
console.error(`  FENERGO_OIDC_CLIENT_ID: ${FENERGO_OIDC_CLIENT_ID}`);
if (FENERGO_OIDC_CLIENT_SECRET) {
  console.error(`  FENERGO_OIDC_CLIENT_SECRET: SET (${FENERGO_OIDC_CLIENT_SECRET.length} chars)`);
  console.error(`    First 10 chars: ${FENERGO_OIDC_CLIENT_SECRET.substring(0, 10)}`);
  console.error(`    Last 10 chars: ${FENERGO_OIDC_CLIENT_SECRET.substring(FENERGO_OIDC_CLIENT_SECRET.length - 10)}`);
  console.error(`    Full value: ${FENERGO_OIDC_CLIENT_SECRET}`);
} else {
  console.error(`  FENERGO_OIDC_CLIENT_SECRET: NOT SET - SSO will fail!`);
}
console.error(`  FENERGO_OIDC_REDIRECT_URI: ${FENERGO_OIDC_REDIRECT_URI}`);
console.error(`  FENERGO_OIDC_SCOPES: ${FENERGO_OIDC_SCOPES.join(', ')}`);

// In-memory session store for SSO state and tokens (development only - use Redis in production)
const sessionStore = new Map();

const oidcAuth = new FenergoOIDCAuth({
  authorityUrl: FENERGO_OIDC_AUTHORITY,
  clientId: FENERGO_OIDC_CLIENT_ID,
  clientSecret: FENERGO_OIDC_CLIENT_SECRET,
  redirectUri: FENERGO_OIDC_REDIRECT_URI,
  scopes: FENERGO_OIDC_SCOPES
});

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health endpoint
app.get('/health', (req, res) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Health check request`);
  res.json({
    status: 'healthy',
    timestamp,
    service: 'apprunner-backend'
  });
});

// Diagnostic endpoint - shows environment variable status
app.get('/diagnostic', (req, res) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Diagnostic request`);

  res.json({
    timestamp,
    oidc: {
      clientId: FENERGO_OIDC_CLIENT_ID,
      clientSecret: {
        isSet: !!FENERGO_OIDC_CLIENT_SECRET,
        length: FENERGO_OIDC_CLIENT_SECRET ? FENERGO_OIDC_CLIENT_SECRET.length : null,
        firstChars: FENERGO_OIDC_CLIENT_SECRET ? FENERGO_OIDC_CLIENT_SECRET.substring(0, 5) : null,
        lastChars: FENERGO_OIDC_CLIENT_SECRET ? FENERGO_OIDC_CLIENT_SECRET.substring(FENERGO_OIDC_CLIENT_SECRET.length - 5) : null,
        fullValue: FENERGO_OIDC_CLIENT_SECRET,
        hasWhitespace: FENERGO_OIDC_CLIENT_SECRET ? /\s/.test(FENERGO_OIDC_CLIENT_SECRET) : null,
        base64Decoded: FENERGO_OIDC_CLIENT_SECRET ? Buffer.from(FENERGO_OIDC_CLIENT_SECRET, 'base64').toString('utf-8') : null
      },
      authority: FENERGO_OIDC_AUTHORITY,
      redirectUri: FENERGO_OIDC_REDIRECT_URI,
      redirectUriEncoded: encodeURIComponent(FENERGO_OIDC_REDIRECT_URI),
      scopes: FENERGO_OIDC_SCOPES,
      allEnvironmentVars: {
        FENERGO_OIDC_CLIENT_ID: process.env.FENERGO_OIDC_CLIENT_ID,
        FENERGO_OIDC_CLIENT_SECRET: process.env.FENERGO_OIDC_CLIENT_SECRET,
        FENERGO_OIDC_AUTHORITY: process.env.FENERGO_OIDC_AUTHORITY,
        FENERGO_OIDC_REDIRECT_URI: process.env.FENERGO_OIDC_REDIRECT_URI,
        FENERGO_OIDC_SCOPES: process.env.FENERGO_OIDC_SCOPES
      }
    }
  });
});

// Test token exchange endpoint - for manual testing
app.post('/test-token-exchange', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] === TEST TOKEN EXCHANGE START ===`);

  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        error: 'Missing code or state'
      });
    }

    console.error(`[${timestamp}] Testing token exchange with code and state...`);
    const tokenResponse = await oidcAuth.exchangeCodeForToken(code, state);

    return res.json({
      success: true,
      message: 'Token exchange successful',
      token: tokenResponse
    });
  } catch (error) {
    console.error(`[${timestamp}] ERROR in test-token-exchange:`, error.message);
    return res.status(500).json({
      error: 'Token exchange failed',
      message: error.message
    });
  }
});

// OAuth Authentication endpoint
app.post('/authenticate', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] === START /authenticate request ===`);

  try {
    // For client credentials grant flow, only tenantId is required
    const { tenantId } = req.body;

    // Validate input
    if (!tenantId) {
      console.error(`[${timestamp}] ERROR: Missing required field - tenantId`);
      return res.status(400).json({
        error: 'Missing required field: tenantId',
        timestamp
      });
    }

    console.error(`[${timestamp}] Authenticating with client credentials for tenant: ${tenantId}`);

    // Try OAuth token exchange (client credentials grant flow)
    try {
      const tokenResponse = await oauthAuth.authenticate(tenantId);

      console.error(`[${timestamp}] Authentication successful via OAuth`);
      console.error(`[${timestamp}] === END /authenticate request (SUCCESS - OAuth) ===`);

      // Return token response
      return res.json({
        success: true,
        accessToken: tokenResponse.accessToken,
        tokenType: tokenResponse.tokenType,
        expiresIn: tokenResponse.expiresIn,
        scope: tokenResponse.scope,
        timestamp
      });
    } catch (oauthError) {
      console.error(`[${timestamp}] OAuth authentication failed: ${oauthError.message}`);
      console.error(`[${timestamp}] OAuth credentials may be invalid. Check:`);
      console.error(`[${timestamp}]   - FENERGO_CLIENT_ID is registered in OAuth provider`);
      console.error(`[${timestamp}]   - FENERGO_CLIENT_SECRET is correct`);
      console.error(`[${timestamp}]   - Client is enabled for client_credentials grant type`);

      // Fallback: If OAuth fails and we have a static token configured, return it
      if (API_TOKEN) {
        console.error(`[${timestamp}] WARNING: Falling back to static API token - OAuth not working`);
        console.error(`[${timestamp}] === END /authenticate request (SUCCESS - Fallback - OAUTH ISSUE) ===`);

        return res.json({
          success: true,
          accessToken: API_TOKEN.replace('Bearer ', ''),
          tokenType: 'Bearer',
          expiresIn: 3600,
          scope: 'fallback',
          timestamp,
          warning: 'OAuth authentication failed - using fallback static token',
          oauthError: oauthError.message,
          note: 'Using configured API token as fallback because OAuth failed'
        });
      }

      throw oauthError;
    }

  } catch (error) {
    console.error(`[${timestamp}] ERROR in /authenticate:`, error.message);
    console.error(`[${timestamp}] Error stack:`, error.stack);
    console.error(`[${timestamp}] === END /authenticate request (ERROR) ===`);

    return res.status(401).json({
      error: 'Authentication failed',
      message: error.message,
      timestamp
    });
  }
});

// OIDC SSO Login endpoint - initiates user login flow
app.post('/auth/login', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] === START /auth/login request ===`);

  try {
    const { tenantId } = req.body;

    if (!tenantId) {
      console.error(`[${timestamp}] ERROR: Missing required field - tenantId`);
      return res.status(400).json({
        error: 'Missing required field: tenantId',
        timestamp
      });
    }

    // Generate state token for CSRF protection
    const state = oidcAuth.generateState();
    console.error(`[${timestamp}] Generated state token for CSRF protection`);

    // Generate authorization URL
    const authorizationUrl = oidcAuth.getAuthorizationUrl(tenantId, state);
    console.error(`[${timestamp}] Generated authorization URL`);

    // Store state in session for later validation in callback
    sessionStore.set(state, {
      tenantId: tenantId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (15 * 60 * 1000) // 15 minute expiry
    });
    console.error(`[${timestamp}] State stored in session (expires in 15 minutes)`);

    console.error(`[${timestamp}] === END /auth/login request (SUCCESS) ===`);

    // Return authorization URL for browser redirect
    return res.json({
      success: true,
      authorizationUrl: authorizationUrl,
      state: state,
      tenantId: tenantId,
      message: 'Please visit the authorization URL to complete SSO login',
      timestamp
    });

  } catch (error) {
    console.error(`[${timestamp}] ERROR in /auth/login:`, error.message);
    console.error(`[${timestamp}] Error stack:`, error.stack);
    console.error(`[${timestamp}] === END /auth/login request (ERROR) ===`);

    return res.status(500).json({
      error: 'Failed to initiate SSO login',
      message: error.message,
      timestamp
    });
  }
});

// OIDC SSO Callback endpoint - handles OAuth callback from Fenergo identity provider
// This is the endpoint registered in Fenergo's OIDC client configuration
app.all('/signin-oidc', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] === START /signin-oidc request ===`);
  console.error(`[${timestamp}] Method: ${req.method}`);

  try {
    // Support both GET query params and POST body
    const params = req.method === 'GET' ? req.query : req.body;
    const { code, state, error, error_description } = params;

    console.error(`[${timestamp}] Params:`, JSON.stringify(params, null, 2));

    // Check for OAuth error from identity provider
    if (error) {
      console.error(`[${timestamp}] ERROR from identity provider: ${error}`);
      console.error(`[${timestamp}] Error description: ${error_description}`);
      console.error(`[${timestamp}] === END /signin-oidc request (OAUTH ERROR) ===`);

      return res.status(400).json({
        error: 'OAuth error from identity provider',
        oauthError: error,
        oauthErrorDescription: error_description,
        timestamp
      });
    }

    // Validate required parameters
    if (!code || !state) {
      console.error(`[${timestamp}] ERROR: Missing required parameters - code or state`);
      console.error(`[${timestamp}] === END /signin-oidc request (MISSING PARAMS) ===`);

      return res.status(400).json({
        error: 'Missing required callback parameters: code or state',
        timestamp
      });
    }

    // Validate state token (CSRF protection)
    const sessionData = sessionStore.get(state);
    if (!sessionData) {
      console.error(`[${timestamp}] ERROR: Invalid state token - session not found`);
      console.error(`[${timestamp}] === END /signin-oidc request (INVALID STATE) ===`);

      return res.status(400).json({
        error: 'Invalid state token - session not found',
        timestamp
      });
    }

    // Check if state has expired
    if (Date.now() > sessionData.expiresAt) {
      console.error(`[${timestamp}] ERROR: State token expired`);
      sessionStore.delete(state);
      console.error(`[${timestamp}] === END /signin-oidc request (STATE EXPIRED) ===`);

      return res.status(400).json({
        error: 'State token expired - please restart SSO login',
        timestamp
      });
    }

    const tenantId = sessionData.tenantId;
    console.error(`[${timestamp}] State validated successfully for tenant: ${tenantId}`);

    // Exchange authorization code for tokens
    console.error(`[${timestamp}] Exchanging authorization code for tokens...`);
    const tokenResponse = await oidcAuth.exchangeCodeForToken(code, state);
    console.error(`[${timestamp}] Token exchange successful`);

    // Cache the token for this user session
    const cacheKey = `user_${tenantId}_${Date.now()}`;
    oidcAuth.cacheToken(cacheKey, tokenResponse);
    console.error(`[${timestamp}] Token cached with key: ${cacheKey}`);

    console.error(`[${timestamp}] === END /signin-oidc request (SUCCESS) ===`);

    // Return token response
    return res.json({
      success: true,
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      tokenType: tokenResponse.tokenType,
      expiresIn: tokenResponse.expiresIn,
      idToken: tokenResponse.idToken,
      tenantId: tenantId,
      cacheKey: cacheKey,
      message: 'SSO login successful - token acquired',
      timestamp
    });

  } catch (error) {
    console.error(`[${timestamp}] ERROR in /signin-oidc:`, error.message);
    console.error(`[${timestamp}] Error stack:`, error.stack);
    console.error(`[${timestamp}] === END /signin-oidc request (ERROR) ===`);

    return res.status(500).json({
      error: 'Failed to complete SSO callback',
      message: error.message,
      timestamp
    });
  }
});

// OIDC SSO Callback endpoint - handles OAuth callback from identity provider
// Supports both GET (from browser redirect) and POST (from MCP connector)
app.all('/auth/callback', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] === START /auth/callback request ===`);
  console.error(`[${timestamp}] Method: ${req.method}`);

  try {
    // Support both GET query params and POST body
    const params = req.method === 'GET' ? req.query : req.body;
    const { code, state, error, error_description } = params;

    console.error(`[${timestamp}] Params:`, JSON.stringify(params, null, 2));

    // Check for OAuth error from identity provider
    if (error) {
      console.error(`[${timestamp}] ERROR from identity provider: ${error}`);
      console.error(`[${timestamp}] Error description: ${error_description}`);
      console.error(`[${timestamp}] === END /auth/callback request (OAUTH ERROR) ===`);

      return res.status(400).json({
        error: 'OAuth error from identity provider',
        oauthError: error,
        oauthErrorDescription: error_description,
        timestamp
      });
    }

    // Validate required parameters
    if (!code || !state) {
      console.error(`[${timestamp}] ERROR: Missing required parameters - code or state`);
      console.error(`[${timestamp}] === END /auth/callback request (MISSING PARAMS) ===`);

      return res.status(400).json({
        error: 'Missing required callback parameters: code or state',
        timestamp
      });
    }

    // Validate state token (CSRF protection)
    const sessionData = sessionStore.get(state);
    if (!sessionData) {
      console.error(`[${timestamp}] ERROR: Invalid state token - session not found`);
      console.error(`[${timestamp}] === END /auth/callback request (INVALID STATE) ===`);

      return res.status(400).json({
        error: 'Invalid state token - session not found',
        timestamp
      });
    }

    // Check if state has expired
    if (Date.now() > sessionData.expiresAt) {
      console.error(`[${timestamp}] ERROR: State token expired`);
      sessionStore.delete(state);
      console.error(`[${timestamp}] === END /auth/callback request (STATE EXPIRED) ===`);

      return res.status(400).json({
        error: 'State token expired - please restart SSO login',
        timestamp
      });
    }

    const tenantId = sessionData.tenantId;
    console.error(`[${timestamp}] State validated successfully for tenant: ${tenantId}`);

    // Exchange authorization code for tokens
    console.error(`[${timestamp}] Exchanging authorization code for tokens...`);
    const tokenResponse = await oidcAuth.exchangeCodeForToken(code, state);
    console.error(`[${timestamp}] Token exchange successful`);

    // Cache the token for this user session
    const cacheKey = `user_${tenantId}_${Date.now()}`;
    oidcAuth.cacheToken(cacheKey, tokenResponse);
    console.error(`[${timestamp}] Token cached with key: ${cacheKey}`);

    console.error(`[${timestamp}] === END /auth/callback request (SUCCESS) ===`);

    // Return token response
    return res.json({
      success: true,
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      tokenType: tokenResponse.tokenType,
      expiresIn: tokenResponse.expiresIn,
      idToken: tokenResponse.idToken,
      tenantId: tenantId,
      cacheKey: cacheKey,
      message: 'SSO login successful - token acquired',
      timestamp
    });

  } catch (error) {
    console.error(`[${timestamp}] ERROR in /auth/callback:`, error.message);
    console.error(`[${timestamp}] Error stack:`, error.stack);
    console.error(`[${timestamp}] === END /auth/callback request (ERROR) ===`);

    return res.status(500).json({
      error: 'Failed to complete SSO callback',
      message: error.message,
      timestamp
    });
  }
});

// Main execute endpoint
app.post('/execute', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] === START /execute request ===`);

  try {
    console.error(`[${timestamp}] Request body:`, JSON.stringify(req.body, null, 2));
    console.error(`[${timestamp}] Request headers:`, JSON.stringify(req.headers, null, 2));

    // Extract Authorization header from incoming request (OAuth token from MCP connector)
    const authHeader = req.headers.authorization;
    console.error(`[${timestamp}] Authorization header present: ${!!authHeader}`);
    if (authHeader) {
      console.error(`[${timestamp}] Will use OAuth token from Authorization header`);
    } else if (API_TOKEN) {
      console.error(`[${timestamp}] No Authorization header, will use fallback API_TOKEN from environment`);
    } else {
      console.error(`[${timestamp}] ERROR: No authentication available`);
      return res.status(401).json({
        error: 'Unauthorized: No authentication token provided'
      });
    }

    // Extract payload
    const { data } = req.body;
    if (!data) {
      console.error(`[${timestamp}] ERROR: Missing 'data' field in payload`);
      return res.status(400).json({
        error: 'Invalid payload: missing "data" field',
        received: req.body
      });
    }

    const { message, scope, conversationHistory } = data;

    // Validate required fields
    if (!message || !scope) {
      console.error(`[${timestamp}] ERROR: Missing required fields in data`);
      return res.status(400).json({
        error: 'Invalid payload: missing "message" or "scope"',
        received: data
      });
    }

    console.error(`[${timestamp}] Payload validated successfully`);
    console.error(`[${timestamp}]   message: ${message}`);
    console.error(`[${timestamp}]   scope: ${JSON.stringify(scope)}`);

    // Call Fenergo insights API with either OAuth token or fallback token
    console.error(`[${timestamp}] Calling Fenergo API: ${FENERGO_API_URL}`);
    const fenergoResponse = await callFenergoAPI(req.body, timestamp, authHeader);

    console.error(`[${timestamp}] Fenergo API response received:`, JSON.stringify(fenergoResponse, null, 2));
    console.error(`[${timestamp}] === END /execute request (SUCCESS) ===`);

    // Return response to connector
    return res.json({
      result: fenergoResponse.result || fenergoResponse,
      metadata: {
        timestamp,
        fenergoStatus: fenergoResponse.status || 'processed'
      }
    });

  } catch (error) {
    console.error(`[${timestamp}] ERROR in /execute:`, error.message);
    console.error(`[${timestamp}] Error stack:`, error.stack);
    console.error(`[${timestamp}] === END /execute request (ERROR) ===`);

    return res.status(500).json({
      error: error.message,
      timestamp
    });
  }
});

/**
 * Call Fenergo Insights API
 * @param {Object} payload - Request payload
 * @param {string} timestamp - Request timestamp
 * @param {string} authHeader - Optional OAuth Authorization header from MCP connector
 */
function callFenergoAPI(payload, timestamp, authHeader = null) {
  return new Promise((resolve, reject) => {
    console.error(`[${timestamp}] [FENERGO] Building HTTPS request to ${FENERGO_API_URL}`);

    const url = new URL(FENERGO_API_URL);
    const postData = JSON.stringify(payload);

    // Use OAuth token from MCP connector if available, otherwise fall back to static API_TOKEN
    const token = authHeader || API_TOKEN;
    console.error(`[${timestamp}] [FENERGO] Using token source: ${authHeader ? 'OAuth from MCP connector' : 'Fallback API_TOKEN from environment'}`);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'AppRunner-Backend/1.0'
      },
      timeout: 30000
    };

    console.error(`[${timestamp}] [FENERGO] Request options:`, {
      hostname: options.hostname,
      method: options.method,
      path: options.path,
      tokenSource: authHeader ? 'OAuth' : 'Fallback',
      hasAuth: !!token,
      tenantId: TENANT_ID
    });

    const req = https.request(options, (res) => {
      let data = '';

      console.error(`[${timestamp}] [FENERGO] Response status: ${res.statusCode}`);
      console.error(`[${timestamp}] [FENERGO] Response headers:`, JSON.stringify(res.headers, null, 2));

      res.on('data', chunk => {
        data += chunk;
        console.error(`[${timestamp}] [FENERGO] Data chunk received (${chunk.length} bytes)`);
      });

      res.on('end', () => {
        console.error(`[${timestamp}] [FENERGO] All data received (${data.length} bytes)`);
        console.error(`[${timestamp}] [FENERGO] Response body:`, data);

        try {
          const parsedData = JSON.parse(data);
          console.error(`[${timestamp}] [FENERGO] Parsed JSON response`, JSON.stringify(parsedData, null, 2));

          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.error(`[${timestamp}] [FENERGO] === API call SUCCESS ===`);
            resolve(parsedData);
          } else {
            console.error(`[${timestamp}] [FENERGO] === API call returned error status ===`);
            reject(new Error(`Fenergo API error: ${res.statusCode} - ${data}`));
          }
        } catch (parseError) {
          console.error(`[${timestamp}] [FENERGO] Failed to parse response as JSON: ${parseError.message}`);
          // Return raw response if not JSON
          console.error(`[${timestamp}] [FENERGO] Returning raw response`);
          resolve({ result: data, raw: true });
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[${timestamp}] [FENERGO] === Request ERROR ===`);
      console.error(`[${timestamp}] [FENERGO] Error: ${err.message}`);
      console.error(`[${timestamp}] [FENERGO] Code: ${err.code}`);
      console.error(`[${timestamp}] [FENERGO] Stack:`, err.stack);
      reject(err);
    });

    req.on('timeout', () => {
      console.error(`[${timestamp}] [FENERGO] === Request TIMEOUT ===`);
      req.destroy();
      reject(new Error('Fenergo API request timeout'));
    });

    console.error(`[${timestamp}] [FENERGO] Writing payload to request...`);
    req.write(postData);
    console.error(`[${timestamp}] [FENERGO] Ending request...`);
    req.end();
  });
}

// Error handling
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Unhandled error:`, err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp
  });
});

// Start server
const server = app.listen(PORT, () => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] === AppRunner Backend Started ===`);
  console.error(`[${timestamp}] Listening on port ${PORT}`);
  console.error(`[${timestamp}] Available endpoints:`);
  console.error(`[${timestamp}]   GET  http://localhost:${PORT}/health`);
  console.error(`[${timestamp}]   POST http://localhost:${PORT}/authenticate (Client Credentials OAuth)`);
  console.error(`[${timestamp}]   POST http://localhost:${PORT}/auth/login (SSO/OIDC Login)`);
  console.error(`[${timestamp}]   GET  http://localhost:${PORT}/auth/callback (SSO/OIDC Callback)`);
  console.error(`[${timestamp}]   POST http://localhost:${PORT}/execute (Fenergo API Proxy)`);
  console.error(`[${timestamp}] Fenergo API target: ${FENERGO_API_URL}`);
  console.error(`[${timestamp}] Configuration:`);
  console.error(`[${timestamp}]   FENERGO_API_TOKEN: ${API_TOKEN ? 'SET' : 'MISSING'}`);
  console.error(`[${timestamp}]   FENERGO_TENANT_ID: ${TENANT_ID || 'MISSING'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] SIGTERM received, shutting down gracefully...`);
  server.close(() => {
    console.error(`[${timestamp}] Server closed`);
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] SIGINT received, shutting down gracefully...`);
  server.close(() => {
    console.error(`[${timestamp}] Server closed`);
    process.exit(0);
  });
});

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Uncaught exception:`, err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Unhandled rejection:`, reason);
  process.exit(1);
});
