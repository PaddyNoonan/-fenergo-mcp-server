#!/usr/bin/env node

/**
 * OIDC/SSO Authentication Module for Fenergo Nebula API
 * Implements OpenID Connect Authorization Code Flow
 * Handles user login via Fenergo identity provider
 */

import https from 'https';
import { URL } from 'url';
import crypto from 'crypto';

class FenergoOIDCAuth {
  constructor(options = {}) {
    this.authorityUrl = options.authorityUrl || 'https://identity.fenxstable.com';
    this.clientId = options.clientId || 'mcp-client';
    this.clientSecret = options.clientSecret;
    this.redirectUri = options.redirectUri || 'https://tc8srxrkcp.eu-west-1.awsapprunner.com/auth/callback';
    this.scopes = options.scopes || ['openid', 'profile', 'email'];

    // Token cache per session/tenant
    this.tokenCache = new Map();
  }

  /**
   * Generate authorization URL for user login
   * @param {string} tenantId - Tenant ID for multi-tenancy
   * @param {string} state - CSRF protection state token
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(tenantId, state) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: this.scopes.join(' '),
      redirect_uri: this.redirectUri,
      state: state,
      prompt: 'login' // Force fresh login
    });

    // Note: tenantId is stored server-side in session, not passed to identity provider
    return `${this.authorityUrl}/connect/authorize?${params.toString()}`;
  }

  /**
   * Generate CSRF state token
   * @returns {string} Random state token
   */
  generateState() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from callback
   * @param {string} state - State token for CSRF verification
   * @returns {Promise<object>} Token response with access_token, refresh_token, etc.
   */
  async exchangeCodeForToken(code, state) {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString();

      // Prepare token request body
      const postData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri
      });

      const url = new URL(`${this.authorityUrl}/connect/token`);
      const postBody = postData.toString();

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postBody),
        'Accept': 'application/json',
        'User-Agent': 'Fenergo-OIDC-Client/1.0'
      };

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: headers,
        timeout: 30000
      };

      console.error(`[${timestamp}] [OIDC] ========== TOKEN EXCHANGE REQUEST START ==========`);
      console.error(`[${timestamp}] [OIDC] Authority URL: ${this.authorityUrl}`);
      console.error(`[${timestamp}] [OIDC] Target hostname: ${url.hostname}`);
      console.error(`[${timestamp}] [OIDC] Target path: ${url.pathname}`);
      console.error(`[${timestamp}] [OIDC] Client ID: ${this.clientId}`);
      console.error(`[${timestamp}] [OIDC] Client Secret - SET: ${!!this.clientSecret}`);
      if (this.clientSecret) {
        console.error(`[${timestamp}] [OIDC] Client Secret - LENGTH: ${this.clientSecret.length}`);
        console.error(`[${timestamp}] [OIDC] Client Secret - FIRST 5 CHARS: ${this.clientSecret.substring(0, 5)}`);
        console.error(`[${timestamp}] [OIDC] Client Secret - LAST 5 CHARS: ${this.clientSecret.substring(this.clientSecret.length - 5)}`);
        console.error(`[${timestamp}] [OIDC] Client Secret - FULL VALUE: ${this.clientSecret}`);
      }
      console.error(`[${timestamp}] [OIDC] Redirect URI: ${this.redirectUri}`);
      console.error(`[${timestamp}] [OIDC] Code: ${code.substring(0, 20)}...`);
      console.error(`[${timestamp}] [OIDC] State: ${state.substring(0, 20)}...`);
      console.error(`[${timestamp}] [OIDC] Request Body: ${postBody}`);
      console.error(`[${timestamp}] [OIDC] Headers:`, JSON.stringify(headers, null, 2));

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          console.error(`[${timestamp}] [OIDC] ========== TOKEN EXCHANGE RESPONSE ==========`);
          console.error(`[${timestamp}] [OIDC] Response Status Code: ${res.statusCode}`);
          console.error(`[${timestamp}] [OIDC] Response Headers:`, JSON.stringify(res.headers, null, 2));
          console.error(`[${timestamp}] [OIDC] Response Body: ${data}`);

          if (res.statusCode < 200 || res.statusCode >= 300) {
            console.error(`[${timestamp}] [OIDC] ========== ERROR: TOKEN EXCHANGE FAILED ==========`);
            console.error(`[${timestamp}] [OIDC] Status: ${res.statusCode}`);
            console.error(`[${timestamp}] [OIDC] Error Response:`, data);

            try {
              const errorData = JSON.parse(data);
              console.error(`[${timestamp}] [OIDC] Error Details:`, JSON.stringify(errorData, null, 2));
            } catch (e) {
              console.error(`[${timestamp}] [OIDC] Could not parse error response as JSON`);
            }

            reject(new Error(`OIDC token exchange failed: ${res.statusCode} - ${data}`));
            return;
          }

          try {
            const parsed = JSON.parse(data);

            if (!parsed.access_token) {
              console.error(`[${timestamp}] [OIDC] ERROR: No access_token in response`);
              console.error(`[${timestamp}] [OIDC] Response was:`, JSON.stringify(parsed, null, 2));
              reject(new Error('OIDC response missing access_token'));
              return;
            }

            console.error(`[${timestamp}] [OIDC] ========== SUCCESS: TOKEN ACQUIRED ==========`);
            console.error(`[${timestamp}] [OIDC] Token expires in: ${parsed.expires_in}s`);
            console.error(`[${timestamp}] [OIDC] Scope: ${parsed.scope}`);

            resolve({
              accessToken: parsed.access_token,
              refreshToken: parsed.refresh_token,
              tokenType: parsed.token_type || 'Bearer',
              expiresIn: parsed.expires_in,
              scope: parsed.scope,
              idToken: parsed.id_token,
              acquiredAt: Date.now()
            });
          } catch (e) {
            console.error(`[${timestamp}] [OIDC] ERROR: Failed to parse token response:`, e.message);
            console.error(`[${timestamp}] [OIDC] Raw response was:`, data);
            reject(e);
          }
        });
      });

      req.on('error', (err) => {
        console.error(`[${timestamp}] [OIDC] Request error:`, err.message);
        reject(err);
      });

      req.on('timeout', () => {
        console.error(`[${timestamp}] [OIDC] Request timeout`);
        req.destroy();
        reject(new Error('OIDC token exchange timeout'));
      });

      req.write(postBody);
      req.end();
    });
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<object>} New token response
   */
  async refreshAccessToken(refreshToken) {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString();

      const postData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      const url = new URL(`${this.authorityUrl}/connect/token`);
      const postBody = postData.toString();

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postBody),
        'Accept': 'application/json'
      };

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: headers,
        timeout: 30000
      };

      console.error(`[${timestamp}] [OIDC] Token refresh request`);

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Token refresh failed: ${res.statusCode}`));
            return;
          }

          try {
            const parsed = JSON.parse(data);
            console.error(`[${timestamp}] [OIDC] Token refreshed successfully`);

            resolve({
              accessToken: parsed.access_token,
              refreshToken: parsed.refresh_token || refreshToken,
              tokenType: parsed.token_type || 'Bearer',
              expiresIn: parsed.expires_in,
              acquiredAt: Date.now()
            });
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(postBody);
      req.end();
    });
  }

  /**
   * Check if token is expired
   * @param {object} token - Token object with acquiredAt and expiresIn
   * @returns {boolean} True if token is expired or about to expire
   */
  isTokenExpired(token) {
    if (!token || !token.acquiredAt || !token.expiresIn) {
      return true;
    }

    // Consider token expired if less than 60 seconds remaining
    const expiryBuffer = 60 * 1000;
    const expiresAt = token.acquiredAt + (token.expiresIn * 1000);
    return Date.now() >= (expiresAt - expiryBuffer);
  }

  /**
   * Store token in cache
   * @param {string} cacheKey - Cache key (e.g., tenant ID or session ID)
   * @param {object} token - Token object
   */
  cacheToken(cacheKey, token) {
    this.tokenCache.set(cacheKey, token);
    console.error(`[Token cached for: ${cacheKey}]`);
  }

  /**
   * Retrieve cached token
   * @param {string} cacheKey - Cache key
   * @returns {object|null} Cached token or null if not found/expired
   */
  getCachedToken(cacheKey) {
    const token = this.tokenCache.get(cacheKey);
    if (token && !this.isTokenExpired(token)) {
      return token;
    }
    if (token) {
      this.tokenCache.delete(cacheKey);
    }
    return null;
  }

  /**
   * Clear cached token
   * @param {string} cacheKey - Cache key
   */
  clearCachedToken(cacheKey) {
    this.tokenCache.delete(cacheKey);
  }
}

export default FenergoOIDCAuth;
