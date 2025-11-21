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

// OAuth Authentication endpoint
app.post('/authenticate', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] === START /authenticate request ===`);

  try {
    // For password grant flow, username, password, and tenantId are all required
    const { username, password, tenantId } = req.body;

    // Validate input
    if (!username || !password || !tenantId) {
      console.error(`[${timestamp}] ERROR: Missing required fields`);
      return res.status(400).json({
        error: 'Missing required fields: username, password, or tenantId',
        timestamp
      });
    }

    console.error(`[${timestamp}] Authenticating user: ${username}`);

    // Try OAuth token exchange (password grant flow)
    try {
      const tokenResponse = await oauthAuth.authenticate(username, password, tenantId);

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
      console.error(`[${timestamp}]   - Client credentials are enabled for client_credentials grant flow`);

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
  console.error(`[${timestamp}] Health endpoint: GET http://localhost:${PORT}/health`);
  console.error(`[${timestamp}] Execute endpoint: POST http://localhost:${PORT}/execute`);
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
