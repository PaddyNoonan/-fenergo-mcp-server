#!/usr/bin/env node

/**
 * Test script to simulate OIDC callback
 * This simulates what happens when Fenergo redirects back to /auth/callback
 *
 * In a real flow:
 * 1. User visits authorization URL
 * 2. Fenergo shows login page
 * 3. User logs in
 * 4. Fenergo redirects to /auth/callback?code=XXXX&state=YYYY
 *
 * This script allows testing that flow by providing a code and state
 */

import https from 'https';
import { URL } from 'url';
import readline from 'readline';

const APPRUNNER_BASE = 'https://tc8srxrkcp.eu-west-1.awsapprunner.com';

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
        try {
          const parsed = JSON.parse(data);
          console.log(`Response:`, JSON.stringify(parsed, null, 2));
          resolve(parsed);
        } catch (e) {
          console.log(`Response (raw):`, data);
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

async function testCallbackWithCode(code, state) {
  console.log('\n====================================');
  console.log('OIDC Callback Test');
  console.log('====================================');

  try {
    console.log('\nAttempting to complete OIDC callback with provided code and state...');
    console.log(`Code: ${code.substring(0, 20)}...`);
    console.log(`State: ${state.substring(0, 20)}...`);

    const result = await makeRequest('POST', `${APPRUNNER_BASE}/auth/callback`, {
      code: code,
      state: state
    });

    if (result.success) {
      console.log('\n✓ SUCCESS! Token exchange successful');
      console.log(`\nToken Details:`);
      console.log(`  - Access Token: ${result.accessToken.substring(0, 50)}...`);
      console.log(`  - Token Type: ${result.tokenType}`);
      console.log(`  - Expires In: ${result.expiresIn}s`);
      console.log(`  - Tenant ID: ${result.tenantId}`);
    } else {
      console.log('\n✗ FAILED! Check the error details above');
    }
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  }
}

async function testCallbackInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  };

  console.log('\n====================================');
  console.log('OIDC Callback Test - Interactive Mode');
  console.log('====================================\n');

  try {
    const code = await question('Enter the authorization code from the callback URL: ');
    const state = await question('Enter the state token from the callback URL: ');

    rl.close();

    await testCallbackWithCode(code, state);
  } catch (error) {
    console.error('ERROR:', error.message);
    rl.close();
  }
}

// Check if code and state were provided as command line arguments
const args = process.argv.slice(2);
if (args.length === 2) {
  testCallbackWithCode(args[0], args[1]);
} else if (args.length === 0) {
  testCallbackInteractive();
} else {
  console.error('Usage:');
  console.error('  node test-oidc-callback.js <code> <state>');
  console.error('  node test-oidc-callback.js (for interactive mode)');
  process.exit(1);
}
