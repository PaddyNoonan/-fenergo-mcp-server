#!/usr/bin/env node

/**
 * SSO Authentication Flow
 * Generates OIDC authorization URL for user to authenticate
 */

import FenergoOIDCAuth from './oidc-auth.js';

const TENANT_ID = 'f488cdba-2122-448d-952c-7a2a47f78f1b';

async function getAuthUrl() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  SSO Authentication Flow                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const oidcAuth = new FenergoOIDCAuth({
      authority: 'https://identity.fenxstable.com',
      clientId: 'mcp-client',
      redirectUri: 'http://localhost:3000/auth/callback',
      scopes: ['openid', 'profile', 'fenx.all'],
      tenantId: TENANT_ID
    });

    console.log('📋 Configuration:');
    console.log(`   Tenant ID: ${TENANT_ID}`);
    console.log(`   Client ID: mcp-client`);
    console.log(`   Scopes: openid, profile, fenx.all\n`);

    console.log('🔐 Generating Authorization URL...\n');

    const state = oidcAuth.generateState();
    const { authorizationUrl, codeVerifier } = oidcAuth.getAuthorizationUrl(TENANT_ID, state);

    console.log('✅ Authorization URL generated:\n');
    console.log(authorizationUrl);
    console.log('\n');

    console.log('📌 Instructions:');
    console.log('1. Copy the URL above and open it in your browser');
    console.log('2. Log in with your Fenergo credentials');
    console.log('3. You will be redirected with an authorization code');
    console.log('4. Share the full redirect URL or just the authorization code\n');

    console.log('🔑 State Token (for verification):');
    console.log(state);
    console.log('\n');

    console.log('💾 Code Verifier (save for token exchange):');
    console.log(codeVerifier);
    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getAuthUrl();
