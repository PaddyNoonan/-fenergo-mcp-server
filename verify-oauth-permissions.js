#!/usr/bin/env node

/**
 * OAuth Client Credentials Permission Verification Tool
 *
 * This tool tests the OAuth Client Credentials flow and verifies that
 * the quasar-sandbox client has the required API endpoint permissions.
 *
 * Prerequisites:
 * - FENERGO_API_TOKEN must be set to OAuth token from /authenticate endpoint
 * - FENERGO_TENANT_ID must be set to the target tenant ID
 *
 * Expected Results:
 * 1. OAuth authentication: SHOULD succeed (200)
 * 2. API Gateway validation: SHOULD succeed (token accepted)
 * 3. Application authorization: DEPENDS on Fenergo configuration
 *
 * If you see 403 "Client not authorized to access this endpoint",
 * the quasar-sandbox client needs permission configuration in Fenergo admin console.
 */

import https from 'https';
import { URL } from 'url';

const TENANT_ID = 'f488cdba-2122-448d-952c-7a2a47f78f1b';
const API_BASE = 'https://api.fenxstable.com/documentmanagementquery/api';

// Sample request for testing
const TEST_ENTITY_ID = '02637420-c5e0-4036-a6e1-83991d341d5a';
const TEST_JOURNEY_ID = '5a5caba1-623f-45c5-8e02-592fb6c4dc61';

function makeRequest(method, urlString, token, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': TENANT_ID,
      'Accept': 'application/json',
      'User-Agent': 'OAuth-Verify-Tool/1.0'
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

async function runDiagnostics() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Fenergo OAuth Permissions Verification Tool              ║');
  console.log('║  Testing API endpoint access with OAuth credentials      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const token = process.env.FENERGO_API_TOKEN;

  if (!token) {
    console.error('❌ ERROR: FENERGO_API_TOKEN environment variable not set');
    console.error('\nTo test OAuth permissions:');
    console.error('1. Get an OAuth token from your AppRunner /authenticate endpoint');
    console.error('2. Set it as environment variable: export FENERGO_API_TOKEN=<token>');
    process.exit(1);
  }

  console.log(`📋 Configuration:`);
  console.log(`   Tenant ID: ${TENANT_ID}`);
  console.log(`   Token Type: ${token.startsWith('Bearer ') ? 'Bearer Token' : 'Raw JWT'}`);
  console.log(`   Token Length: ${token.replace('Bearer ', '').length} chars`);
  console.log(`   Entity ID: ${TEST_ENTITY_ID}`);
  console.log(`   Journey ID: ${TEST_JOURNEY_ID}\n`);

  // Test 1: Document Requirements endpoint
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST 1: Document Requirements Endpoint');
  console.log('═══════════════════════════════════════════════════════════');

  const requirementUrl = `${API_BASE}/documentrequirement/entity/${TEST_ENTITY_ID}/journey/${TEST_JOURNEY_ID}`;
  console.log(`\nRequest: GET ${requirementUrl}`);
  console.log(`Headers: Authorization (Bearer token), X-Tenant-Id: ${TENANT_ID}\n`);

  try {
    const response = await makeRequest('GET', requirementUrl, token);

    console.log(`Status Code: ${response.statusCode}`);
    console.log(`Response Headers:`, {
      'content-type': response.headers['content-type'],
      'server': response.headers['server'],
      'date': response.headers['date']
    });

    console.log(`\nResponse Body:`);
    if (response.statusCode === 200) {
      console.log('✅ SUCCESS - API request accepted and processed');
      console.log(JSON.stringify(response.body, null, 2));
    } else if (response.statusCode === 401) {
      console.log('❌ FAILED - 401 Unauthorized');
      console.log('   Token was rejected at API Gateway level');
      console.log('   This indicates the token type (OIDC vs OAuth) is not accepted');
      console.log(`   Raw response: ${response.rawBody}`);
    } else if (response.statusCode === 403) {
      console.log('⚠️  PARTIAL - 403 Forbidden');
      console.log('   Token was accepted at gateway but rejected at application level');
      console.log('   This means the quasar-sandbox client needs explicit API permissions');
      console.log('\n   ACTION REQUIRED:');
      console.log('   1. Log into Fenergo Identity Admin Console');
      console.log('   2. Find the "quasar-sandbox" client configuration');
      console.log('   3. Add API endpoint permissions for:');
      console.log('      - /documentmanagementquery/api/documentrequirement/*');
      console.log('      - /documentmanagementquery/api/documentmanagement/insights');
      console.log(`   Raw response: ${response.rawBody}`);
    } else {
      console.log(`⚠️  Unexpected status code: ${response.statusCode}`);
      console.log(`Response: ${response.rawBody}`);
    }
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
  }

  // Test 2: Insights endpoint (alternative)
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('TEST 2: Insights Endpoint (Alternative)');
  console.log('═══════════════════════════════════════════════════════════');

  const insightsUrl = `${API_BASE}/documentmanagement/insights`;
  const insightsPayload = {
    journeyId: TEST_JOURNEY_ID,
    query: 'What documents are required?',
    scope: 'requirements'
  };

  console.log(`\nRequest: POST ${insightsUrl}`);
  console.log(`Payload:`, JSON.stringify(insightsPayload, null, 2));
  console.log(`\nHeaders: Authorization (Bearer token), X-Tenant-Id: ${TENANT_ID}\n`);

  try {
    const response = await makeRequest('POST', insightsUrl, token, insightsPayload);

    console.log(`Status Code: ${response.statusCode}`);
    console.log(`Response Headers:`, {
      'content-type': response.headers['content-type'],
      'server': response.headers['server']
    });

    if (response.statusCode === 200) {
      console.log('✅ SUCCESS - Insights endpoint accessible');
      console.log(JSON.stringify(response.body, null, 2));
    } else if (response.statusCode === 401) {
      console.log('❌ FAILED - 401 Unauthorized (token type not accepted)');
      console.log(`Raw response: ${response.rawBody}`);
    } else if (response.statusCode === 403) {
      console.log('⚠️  PARTIAL - 403 Forbidden (permissions needed)');
      console.log(`Raw response: ${response.rawBody}`);
    } else {
      console.log(`⚠️  Status ${response.statusCode}`);
      console.log(`Response: ${response.rawBody}`);
    }
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
  }

  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('INTERPRETATION GUIDE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('401 Unauthorized:');
  console.log('  → OIDC token (mcp-client) being used');
  console.log('  → API Gateway rejects OIDC tokens');
  console.log('  → Solution: Use OAuth Client Credentials from quasar-sandbox\n');

  console.log('403 Forbidden:');
  console.log('  → OAuth token (quasar-sandbox) accepted at gateway');
  console.log('  → Application rejects due to missing endpoint permissions');
  console.log('  → Solution: Configure quasar-sandbox client in Fenergo admin\n');

  console.log('200 OK:');
  console.log('  → All permissions properly configured');
  console.log('  → investigate_journey MCP tool should work\n');

  console.log('═══════════════════════════════════════════════════════════\n');
}

runDiagnostics().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
