#!/usr/bin/env node

/**
 * OAuth Client Credentials Flow Test
 *
 * This script:
 * 1. Obtains an OAuth token via Client Credentials flow
 * 2. Tests both API endpoints with the token
 * 3. Reports exact status codes and error messages
 *
 * Prerequisites:
 * - AppRunner backend must be running with /authenticate endpoint
 * - Set environment: APPRUNNER_URL (optional, defaults to production)
 */

import https from 'https';
import { URL } from 'url';

const APPRUNNER_URL = process.env.APPRUNNER_URL || 'https://tc8srxrkcp.eu-west-1.awsapprunner.com';
const TENANT_ID = 'f488cdba-2122-448d-952c-7a2a47f78f1b';
const API_BASE = 'https://api.fenxstable.com/documentmanagementquery/api';

const TEST_ENTITY_ID = '02637420-c5e0-4036-a6e1-83991d341d5a';
const TEST_JOURNEY_ID = '5a5caba1-623f-45c5-8e02-592fb6c4dc61';

function makeRequest(method, urlString, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);

    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'OAuth-Test-Client/1.0'
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

async function runTest() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  OAuth Client Credentials Flow & API Access Test           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`📌 Configuration:`);
  console.log(`   AppRunner: ${APPRUNNER_URL}`);
  console.log(`   Tenant ID: ${TENANT_ID}`);
  console.log(`   Journey: ${TEST_JOURNEY_ID}`);
  console.log(`   Entity: ${TEST_ENTITY_ID}\n`);

  // Step 1: Get OAuth Token
  console.log('═══════════════════════════════════════════════════════════');
  console.log('STEP 1: Obtain OAuth Token via Client Credentials');
  console.log('═══════════════════════════════════════════════════════════\n');

  const tokenUrl = `${APPRUNNER_URL}/authenticate`;
  console.log(`Request: POST ${tokenUrl}`);

  let token = null;

  try {
    const tokenResponse = await makeRequest('POST', tokenUrl, {});

    console.log(`Status: ${tokenResponse.statusCode}`);

    if (tokenResponse.statusCode === 200 && tokenResponse.body?.accessToken) {
      token = tokenResponse.body.accessToken;
      console.log(`✅ SUCCESS - OAuth token obtained`);
      console.log(`   Token Type: ${tokenResponse.body.tokenType}`);
      console.log(`   Expires In: ${tokenResponse.body.expiresIn}s`);
      console.log(`   Scope: ${tokenResponse.body.scope}`);
      console.log(`   Token: ${token.substring(0, 30)}...${token.substring(token.length - 10)}\n`);
    } else {
      console.log(`❌ FAILED to obtain token`);
      console.log(`   Response:`, tokenResponse.rawBody);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    process.exit(1);
  }

  // Step 2: Test Document Requirements Endpoint
  console.log('═══════════════════════════════════════════════════════════');
  console.log('STEP 2: Test Document Requirements Endpoint');
  console.log('═══════════════════════════════════════════════════════════\n');

  const requirementUrl = `${API_BASE}/documentrequirement/entity/${TEST_ENTITY_ID}/journey/${TEST_JOURNEY_ID}`;
  console.log(`Request: GET ${requirementUrl}`);
  console.log(`Headers: Authorization: Bearer <token>, X-Tenant-Id: ${TENANT_ID}\n`);

  try {
    const apiResponse = await makeRequest('GET', requirementUrl, null, token);

    console.log(`Status: ${apiResponse.statusCode}`);
    console.log(`Response Headers:`, {
      'content-type': apiResponse.headers['content-type'] || 'not set',
      'x-powered-by': apiResponse.headers['x-powered-by'] || 'not set'
    });

    if (apiResponse.statusCode === 200) {
      console.log(`✅ SUCCESS - Document requirements retrieved`);
      console.log(`   Response:\n${JSON.stringify(apiResponse.body, null, 2)}\n`);
    } else if (apiResponse.statusCode === 401) {
      console.log(`❌ 401 Unauthorized - Token type not accepted`);
      console.log(`   This usually means OIDC token was used instead of OAuth`);
      console.log(`   Make sure you obtained the token from /authenticate endpoint\n`);
    } else if (apiResponse.statusCode === 403) {
      console.log(`⚠️  403 Forbidden - Token accepted but authorization denied`);
      console.log(`   The quasar-sandbox client lacks API endpoint permissions`);
      console.log(`   ACTION REQUIRED: Configure permissions in Fenergo Identity Admin`);
      console.log(`   Error details:`, apiResponse.rawBody, '\n');
    } else {
      console.log(`⚠️  Unexpected status ${apiResponse.statusCode}`);
      console.log(`   Response:`, apiResponse.rawBody, '\n');
    }
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}\n`);
  }

  // Step 3: Test Insights Endpoint
  console.log('═══════════════════════════════════════════════════════════');
  console.log('STEP 3: Test Insights Endpoint (Alternative)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const insightsUrl = `${API_BASE}/documentmanagement/insights`;
  const payload = {
    journeyId: TEST_JOURNEY_ID,
    query: 'What documents are required?',
    scope: 'requirements'
  };

  console.log(`Request: POST ${insightsUrl}`);
  console.log(`Payload:`, JSON.stringify(payload, null, 2));
  console.log(`Headers: Authorization: Bearer <token>, X-Tenant-Id: ${TENANT_ID}\n`);

  try {
    const insightsResponse = await makeRequest('POST', insightsUrl, payload, token);

    console.log(`Status: ${insightsResponse.statusCode}`);

    if (insightsResponse.statusCode === 200) {
      console.log(`✅ SUCCESS - Insights retrieved`);
      console.log(`   Response:\n${JSON.stringify(insightsResponse.body, null, 2)}\n`);
    } else if (insightsResponse.statusCode === 401) {
      console.log(`❌ 401 Unauthorized\n`);
    } else if (insightsResponse.statusCode === 403) {
      console.log(`⚠️  403 Forbidden - Authorization needed`);
      console.log(`   Error:`, insightsResponse.rawBody, '\n');
    } else {
      console.log(`⚠️  Status ${insightsResponse.statusCode}`);
      console.log(`   Response:`, insightsResponse.rawBody, '\n');
    }
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}\n`);
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('✅ If you see 200 OK responses:');
  console.log('   → Configuration is complete and working');
  console.log('   → investigate_journey MCP tool should work\n');

  console.log('⚠️  If you see 403 Forbidden:');
  console.log('   → Configure quasar-sandbox API endpoint permissions');
  console.log('   → See INVESTIGATION_FINDINGS.md for step-by-step guide\n');

  console.log('❌ If you see 401 Unauthorized:');
  console.log('   → Token may be OIDC instead of OAuth');
  console.log('   → Verify token came from /authenticate endpoint');
  console.log('   → Check AppRunner logs for errors\n');
}

runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
