#!/usr/bin/env node

/**
 * OAuth 2.0 Authentication Module for Fenergo Nebula API
 * Implements Client Credentials flow (service-to-service authentication)
 * Used for obtaining Bearer tokens from OAuth client credentials
 */

import https from 'https';
import { URL } from 'url';

class FenergoOAuthAuth {
  constructor(options = {}) {
    this.tokenEndpoint = options.tokenEndpoint || 'https://identity.fenxstable.com/connect/token';
    this.clientId = options.clientId || 'quasar-sandbox';
    this.clientSecret = options.clientSecret || 'secret';

    // Scopes for Fenergo API access
    // Only request fenx.all - the client is only configured for this scope
    // fenx.all grants all fenx.* permissions including documents.read and journey.read
    this.scopes = options.scopes || 'fenx.all';
  }

  /**
   * Get access token using client credentials (service-to-service authentication)
   * @param {string} tenantId - Tenant ID (passed as X-Tenant-Id header)
   * @returns {Promise<object>} Token response with access_token and expires_in
   */
  async authenticate(tenantId) {
    if (!tenantId) {
      throw new Error('OAuth: tenantId is required');
    }

    const token = await this.requestToken(tenantId);
    return token;
  }

  /**
   * Request token from OAuth endpoint using client credentials grant
   * @param {string} tenantId - Tenant ID (passed as X-Tenant-Id header)
   * @returns {Promise<object>} Token response
   */
  requestToken(tenantId) {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString();

      // Prepare request body for client credentials grant (service-to-service)
      const postData = new URLSearchParams();
      postData.append('grant_type', 'client_credentials');
      postData.append('scope', this.scopes);

      // Add client credentials
      if (this.clientId) {
        postData.append('client_id', this.clientId);
      }
      if (this.clientSecret) {
        postData.append('client_secret', this.clientSecret);
      }

      const url = new URL(this.tokenEndpoint);
      const postBody = postData.toString();

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postBody),
        'Accept': 'application/json',
        'User-Agent': 'Fenergo-OAuth-Client/1.0'
      };

      // Include tenant ID as header if available
      if (tenantId) {
        headers['X-Tenant-Id'] = tenantId;
      }

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: headers,
        timeout: 30000
      };

      console.error(`[${timestamp}] [OAuth] Token request to ${this.tokenEndpoint}`);
      console.error(`[${timestamp}] [OAuth] Grant Type: client_credentials`);
      console.error(`[${timestamp}] [OAuth] Client ID: ${this.clientId}`);
      console.error(`[${timestamp}] [OAuth] Tenant: ${tenantId}`);
      console.error(`[${timestamp}] [OAuth] Request headers:`, JSON.stringify(headers, null, 2));
      // Log request body structure without exposing password
      const bodyParams = postBody.split('&').map(param => {
        const [key] = param.split('=');
        return key;
      });
      console.error(`[${timestamp}] [OAuth] Request parameters:`, bodyParams);
      console.error(`[${timestamp}] [OAuth] Body length:`, Buffer.byteLength(postBody));

      const req = https.request(options, (res) => {
        let data = '';

        console.error(`[${timestamp}] [OAuth] Response status: ${res.statusCode}`);

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          console.error(`[${timestamp}] [OAuth] Response received (${data.length} bytes)`);
          console.error(`[${timestamp}] [OAuth] Response headers:`, JSON.stringify(res.headers, null, 2));

          if (res.statusCode < 200 || res.statusCode >= 300) {
            console.error(`[${timestamp}] [OAuth] Error response body:`, data);
            try {
              const errorData = JSON.parse(data);
              console.error(`[${timestamp}] [OAuth] Parsed error:`, JSON.stringify(errorData, null, 2));
              reject(new Error(`OAuth authentication failed: ${res.statusCode} - ${errorData.error || data}`));
            } catch (e) {
              reject(new Error(`OAuth authentication failed: ${res.statusCode} - ${data}`));
            }
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
