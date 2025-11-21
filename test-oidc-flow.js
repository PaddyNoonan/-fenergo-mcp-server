#!/usr/bin/env node

/**
 * Test script for OIDC SSO flow
 * This script helps test the full OIDC authorization code flow
 */

import https from 'https';
import { URL } from 'url';

const APPRUNNER_BASE = 'https://tc8srxrkcp.eu-west-1.awsapprunner.com';
const TENANT_ID = 'test-tenant';

// Helper to make HTTPS requests
function makeRequest(method, urlString, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'OIDC-Test-Client/1.0'
      }
    };

    if (body) {
      const jsonBody = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(jsonBody);
    }

    console.log(`\n[${new Date().toISOString()}] ${method} ${url.pathname}`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response:`, data);

        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testOIDCFlow() {
  console.log('====================================');
  console.log('OIDC SSO Flow Test');
  console.log('====================================');

  try {
    // Step 1: Check diagnostic endpoint
    console.log('\n### Step 1: Check AppRunner Configuration');
    const diagnostic = await makeRequest('GET', `${APPRUNNER_BASE}/diagnostic`);

    console.log('\nClient Configuration:');
    console.log(`  - Client ID: ${diagnostic.oidc.clientId}`);
    console.log(`  - Client Secret Length: ${diagnostic.oidc.clientSecret.length}`);
    console.log(`  - Authority: ${diagnostic.oidc.authority}`);
    console.log(`  - Redirect URI: ${diagnostic.oidc.redirectUri}`);
    console.log(`  - Scopes: ${diagnostic.oidc.scopes.join(', ')}`);

    // Step 2: Initiate login
    console.log('\n### Step 2: Initiate OIDC Login Flow');
    const loginResponse = await makeRequest('POST', `${APPRUNNER_BASE}/auth/login`, {
      tenantId: TENANT_ID
    });

    if (!loginResponse.authorizationUrl) {
      console.error('ERROR: No authorization URL received');
      return;
    }

    const authUrl = loginResponse.authorizationUrl;
    const state = loginResponse.state;

    console.log('\nAuthorization URL generated:');
    console.log(authUrl);
    console.log(`\nState Token: ${state.substring(0, 20)}...`);

    // Step 3: Parse the authorization URL
    console.log('\n### Step 3: Analyze Authorization URL');
    const parsedUrl = new URL(authUrl);
    console.log('\nAuthorization URL Parameters:');
    for (const [key, value] of parsedUrl.searchParams) {
      if (key === 'scope') {
        console.log(`  - ${key}: ${value}`);
      } else if (key === 'state') {
        console.log(`  - ${key}: ${value.substring(0, 20)}...`);
      } else {
        console.log(`  - ${key}: ${value}`);
      }
    }

    // Step 4: Simulate the next steps
    console.log('\n### Step 4: What Happens Next');
    console.log('1. User visits the authorization URL in their browser');
    console.log('2. Fenergo identity provider shows login page');
    console.log('3. User logs in successfully');
    console.log('4. Identity provider redirects to: /auth/callback?code=XXXXX&state=' + state.substring(0, 20) + '...');
    console.log('5. AppRunner exchanges code for token via OIDC token endpoint');
    console.log('   - Request logs from exchangeCodeForToken will appear in AppRunner stderr');
    console.log('6. AppRunner returns token to MCP connector');

    console.log('\n### Summary');
    console.log('✓ AppRunner is properly configured');
    console.log('✓ OIDC authorization flow can be initiated');
    console.log('\nNext Steps:');
    console.log('1. Manually visit the authorization URL in a browser');
    console.log('2. Complete the Fenergo login');
    console.log('3. Check AppRunner logs to see detailed token exchange logs');
    console.log('4. Look for "OIDC" log entries showing the exact request being sent');

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  }
}

testOIDCFlow();
