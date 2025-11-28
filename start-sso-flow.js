#!/usr/bin/env node

/**
 * Start SSO Flow via AppRunner
 * Initiates the OIDC authorization code flow through AppRunner backend
 * which handles state management and session storage
 */

import https from 'https';
import { URL } from 'url';

const APPRUNNER_URL = 'https://tc8srxrkcp.eu-west-1.awsapprunner.com';
const TENANT_ID = 'f488cdba-2122-448d-952c-7a2a47f78f1b';

function makeRequest(method, urlString, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);

    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'SSO-Flow-Client/1.0'
    };

    if (body) {
      const jsonBody = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(jsonBody);
    }

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: headers,
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            rawBody: data
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function startSSO() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Starting SSO Flow via AppRunner                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`📍 AppRunner: ${APPRUNNER_URL}`);
  console.log(`📍 Tenant ID: ${TENANT_ID}\n`);

  try {
    // Step 1: Request AppRunner to initiate OIDC flow
    console.log('Step 1: Initiating OIDC flow via AppRunner...\n');

    const initiateUrl = `${APPRUNNER_URL}/auth/login`;
    const response = await makeRequest('POST', initiateUrl, {
      tenantId: TENANT_ID
    });

    console.log(`Response Status: ${response.statusCode}\n`);

    if (response.statusCode === 200 && response.body?.authorizationUrl) {
      const authUrl = response.body.authorizationUrl;
      const state = response.body.state;

      console.log('✅ OIDC flow initiated successfully\n');

      console.log('🔗 Authorization URL:\n');
      console.log(authUrl);
      console.log('\n');

      console.log('📌 Instructions:');
      console.log('1. Copy the URL above and open it in your browser');
      console.log('2. Log in with your Fenergo credentials');
      console.log('3. You will be redirected back to AppRunner');
      console.log('4. The authorization code will be processed automatically\n');

      console.log('🔑 State Token (for reference):');
      console.log(state.substring(0, 50) + '...\n');

    } else {
      console.log('❌ Failed to initiate OIDC flow');
      console.log(`Response: ${response.rawBody}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

startSSO();
