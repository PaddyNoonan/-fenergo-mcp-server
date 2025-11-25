#!/usr/bin/env node

/**
 * Single Endpoint Authentication Test
 * Tests authentication against the specific document requirement endpoint
 */

import https from 'https';
import { URL } from 'url';

const APPRUNNER_URL = process.env.APPRUNNER_URL || 'https://tc8srxrkcp.eu-west-1.awsapprunner.com';
const TENANT_ID = 'f488cdba-2122-448d-952c-7a2a47f78f1b';
const ENDPOINT = 'https://api.fenxstable.com/documentmanagementquery/api/documentrequirement/entity/02637420-c5e0-4036-a6e1-83991d341d5a/journey/5a5caba1-623f-45c5-8e02-592fb6c4dc61';

function makeRequest(method, urlString, token = null, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);

    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'Test-Client/1.0'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Tenant-Id'] = TENANT_ID;
    }

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

async function test() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Single Endpoint Authentication Test                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`📍 Testing Endpoint:`);
  console.log(`${ENDPOINT}\n`);

  // Step 1: Get OAuth Token
  console.log('STEP 1: Getting OAuth Token');
  console.log('─────────────────────────────────────────────────────────────\n');

  const tokenUrl = `${APPRUNNER_URL}/authenticate`;
  console.log(`Request: POST ${tokenUrl}`);

  let token = null;

  try {
    const tokenResponse = await makeRequest('POST', tokenUrl, null, { tenantId: TENANT_ID });

    console.log(`Status: ${tokenResponse.statusCode}`);

    if (tokenResponse.statusCode === 200 && tokenResponse.body?.accessToken) {
      token = tokenResponse.body.accessToken;
      console.log(`✅ Token obtained`);
      console.log(`   Type: ${tokenResponse.body.tokenType}`);
      console.log(`   Expires: ${tokenResponse.body.expiresIn}s\n`);
    } else {
      console.log(`❌ Failed to get token`);
      console.log(`Response: ${tokenResponse.rawBody}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }

  // Step 2: Test the endpoint
  console.log('STEP 2: Testing Endpoint with OAuth Token');
  console.log('─────────────────────────────────────────────────────────────\n');

  console.log(`Request: GET ${ENDPOINT}`);
  console.log(`Headers: Authorization: Bearer <token>, X-Tenant-Id: ${TENANT_ID}\n`);

  try {
    const response = await makeRequest('GET', ENDPOINT, token);

    console.log(`Status Code: ${response.statusCode}\n`);
    console.log(`Response Headers:`);
    Object.entries(response.headers).forEach(([key, value]) => {
      if (key !== 'set-cookie' && key !== 'authorization') {
        console.log(`  ${key}: ${value}`);
      }
    });

    console.log(`\nResponse Body:`);
    if (response.body) {
      console.log(JSON.stringify(response.body, null, 2));
    } else {
      console.log(response.rawBody);
    }

  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
  }
}

test();
