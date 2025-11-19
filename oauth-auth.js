#!/usr/bin/env node

/**
 * OAuth 2.0 Authentication Module for Fenergo Nebula API
 * Implements Resource Owner Password Credentials flow
 * Used for obtaining Bearer tokens from user credentials
 */

import https from 'https';
import { URL } from 'url';

class FenergoOAuthAuth {
  constructor(options = {}) {
    this.tokenEndpoint = options.tokenEndpoint || 'https://identity.fenxstable.com/connect/token';
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;

    // Scopes for Fenergo API access
    this.scopes = options.scopes || [
      'openid',
      'profile',
      'email',
      'tenant',
      'fenergo.all',
      'fenx.documents.read',
      'fenx.journey.read'
    ].join(' ');
  }

  /**
   * Get access token using username and password
   * @param {string} username - User email
   * @param {string} password - User password
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<object>} Token response with access_token and expires_in
   */
  async authenticate(username, password, tenantId) {
    if (!username || !password) {
      throw new Error('OAuth: username and password are required');
    }
    if (!tenantId) {
      throw new Error('OAuth: tenantId is required');
    }

    const token = await this.requestToken(username, password, tenantId);
    return token;
  }

  /**
   * Request token from OAuth endpoint
   * @param {string} username - User email
   * @param {string} password - User password
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<object>} Token response
   */
  requestToken(username, password, tenantId) {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString();

      // Prepare request body for password grant
      const postData = new URLSearchParams();
      postData.append('grant_type', 'password');
      postData.append('username', username);
      postData.append('password', password);
      postData.append('scope', this.scopes);

      // Add client credentials if available
      if (this.clientId) {
        postData.append('client_id', this.clientId);
      }
      if (this.clientSecret) {
        postData.append('client_secret', this.clientSecret);
      }

      const url = new URL(this.tokenEndpoint);
      const postBody = postData.toString();

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postBody),
          'Accept': 'application/json',
          'User-Agent': 'Fenergo-OAuth-Client/1.0'
        },
        timeout: 30000
      };

      console.error(`[${timestamp}] [OAuth] Token request to ${this.tokenEndpoint}`);
      console.error(`[${timestamp}] [OAuth] Username: ${username}`);
      console.error(`[${timestamp}] [OAuth] Tenant: ${tenantId}`);

      const req = https.request(options, (res) => {
        let data = '';

        console.error(`[${timestamp}] [OAuth] Response status: ${res.statusCode}`);

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          console.error(`[${timestamp}] [OAuth] Response received (${data.length} bytes)`);

          if (res.statusCode < 200 || res.statusCode >= 300) {
            console.error(`[${timestamp}] [OAuth] Error response:`, data);
            reject(new Error(`OAuth authentication failed: ${res.statusCode} - ${data}`));
            return;
          }

          try {
            const parsed = JSON.parse(data);

            if (!parsed.access_token) {
              console.error(`[${timestamp}] [OAuth] No access_token in response`);
              reject(new Error('OAuth response missing access_token'));
              return;
            }

            const expiresIn = parsed.expires_in || 3600;
            console.error(`[${timestamp}] [OAuth] Token acquired (expires in ${expiresIn}s)`);
            console.error(`[${timestamp}] [OAuth] Token type: ${parsed.token_type || 'Bearer'}`);

            resolve({
              accessToken: parsed.access_token,
              expiresIn: expiresIn,
              tokenType: parsed.token_type || 'Bearer',
              scope: parsed.scope || this.scopes
            });
          } catch (parseError) {
            console.error(`[${timestamp}] [OAuth] Failed to parse response: ${parseError.message}`);
            reject(parseError);
          }
        });
      });

      req.on('error', (err) => {
        console.error(`[${timestamp}] [OAuth] Request error: ${err.message}`);
        reject(err);
      });

      req.on('timeout', () => {
        console.error(`[${timestamp}] [OAuth] Request timeout`);
        req.destroy();
        reject(new Error('OAuth token request timeout'));
      });

      req.write(postBody);
      req.end();
    });
  }
}

export default FenergoOAuthAuth;
