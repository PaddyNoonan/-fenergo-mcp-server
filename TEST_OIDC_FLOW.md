# Complete OIDC SSO Flow Testing Guide

## Overview

This guide walks you through the complete OIDC SSO (Single Sign-On) authentication flow for Fenergo integration. It includes testing tools and detailed instructions for capturing and analyzing logs.

## Quick Start

### Option 1: Automated Testing (Recommended)

Run the complete test flow:

```bash
# Step 1: Generate authorization URL
node test-oidc-flow.js

# Step 2: Copy the authorization URL and visit it in your browser
# (Complete the Fenergo login when prompted)

# Step 3: After login, Fenergo redirects you to the callback with code and state
# Copy both the 'code' and 'state' parameters from the callback URL

# Step 4: Test the callback
node test-oidc-callback.js <code> <state>

# Or use interactive mode:
node test-oidc-callback.js
# Then paste the code and state when prompted
```

### Option 2: Manual Browser Testing

1. Run the test script to get the authorization URL:
   ```bash
   node test-oidc-flow.js
   ```

2. Copy the authorization URL from the output

3. Open it in your browser: `https://identity.fenxstable.com/connect/authorize?...`

4. Complete the Fenergo login

5. Fenergo redirects you back to: `https://tc8srxrkcp.eu-west-1.awsapprunner.com/auth/callback?code=XXXX&state=YYYY`

6. Note the `code` and `state` parameters from the callback URL

7. Test the callback with the code and state:
   ```bash
   node test-oidc-callback.js "code_value_here" "state_value_here"
   ```

## Understanding the Flow

### Step 1: Authorization Request (Browser)
```
User → Browser → Fenergo Identity Provider
"I want to log in as this user"
```

**Authorization URL Format:**
```
https://identity.fenxstable.com/connect/authorize?
  client_id=mcp-client
  &response_type=code
  &scope=openid+profile+email
  &redirect_uri=https://tc8srxrkcp.eu-west-1.awsapprunner.com/auth/callback
  &state=<random_token>
  &prompt=login
```

**What happens:**
- Fenergo shows login page
- User enters Fenergo credentials
- Fenergo verifies the credentials
- Fenergo generates an authorization code

### Step 2: Authorization Callback (Browser)
```
Fenergo Identity Provider → Browser → /auth/callback endpoint
"Here's your authorization code"
```

**Callback URL Format:**
```
https://tc8srxrkcp.eu-west-1.awsapprunner.com/auth/callback?
  code=<authorization_code>
  &state=<same_random_token>
```

### Step 3: Token Exchange (Backend)
```
AppRunner Backend → Fenergo Identity Provider
"Exchange this code for an access token using my credentials"
```

**Token Request Parameters:**
```
POST /connect/token

grant_type=authorization_code
client_id=mcp-client
client_secret=fde959ef-da23-c764-c6ed-d7c679dada79
code=<authorization_code>
redirect_uri=https://tc8srxrkcp.eu-west-1.awsapprunner.com/auth/callback
```

**Token Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "scope": "openid profile email"
}
```

## Monitoring Logs

### Start Log Monitoring

While testing, monitor AppRunner logs in a separate terminal:

```bash
aws logs tail /aws/apprunner/fenergo-insights-agent/default --follow
```

### What to Look For

When the callback is processed, you should see logs like:

**Authorization Request:**
```
[TIMESTAMP] [OIDC] ========== TOKEN EXCHANGE REQUEST START ==========
[TIMESTAMP] [OIDC] Authority URL: https://identity.fenxstable.com
[TIMESTAMP] [OIDC] Target hostname: identity.fenxstable.com
[TIMESTAMP] [OIDC] Target path: /connect/token
[TIMESTAMP] [OIDC] Client ID: mcp-client
[TIMESTAMP] [OIDC] Client Secret - SET: true
[TIMESTAMP] [OIDC] Client Secret - LENGTH: 36
[TIMESTAMP] [OIDC] Client Secret - FIRST 5 CHARS: fde95
[TIMESTAMP] [OIDC] Client Secret - LAST 5 CHARS: ada79
[TIMESTAMP] [OIDC] Request Body (raw): grant_type=authorization_code&code=...&client_id=...&client_secret=...&redirect_uri=...
```

**Success Response:**
```
[TIMESTAMP] [OIDC] ========== SUCCESS: TOKEN ACQUIRED ==========
[TIMESTAMP] [OIDC] Token expires in: 3600s
[TIMESTAMP] [OIDC] Scope: openid profile email
```

**Error Response:**
```
[TIMESTAMP] [OIDC] ========== ERROR: TOKEN EXCHANGE FAILED ==========
[TIMESTAMP] [OIDC] Status: 400
[TIMESTAMP] [OIDC] Error Response: {"error":"invalid_request","error_description":"..."}
```

## Troubleshooting

### Issue: "invalid_request" error (400)

This means Fenergo rejected the token exchange request. Common causes:

1. **Redirect URI Mismatch**
   - Fenergo expects: `https://tc8srxrkcp.eu-west-1.awsapprunner.com/auth/callback`
   - Check: Logs show exact redirect_uri being sent
   - Fix: Verify in Fenergo admin console that registered redirect_uri matches exactly (no trailing slash, HTTPS required)

2. **Client ID Mismatch**
   - Fenergo expects: `mcp-client` (case-sensitive)
   - Check: Logs show `Client ID: mcp-client`
   - Fix: Verify in Fenergo admin console the client ID is exactly `mcp-client`

3. **Client Secret Mismatch**
   - Fenergo expects: `fde959ef-da23-c764-c6ed-d7c679dada79`
   - Check: Logs show `Client Secret - LENGTH: 36` and `FIRST 5 CHARS: fde95`
   - Fix: Verify the secret in AppRunner environment variable matches exactly

4. **Code Expired**
   - Authorization codes typically expire in 10 minutes
   - If you wait too long between steps, the code becomes invalid
   - Fix: Complete the test quickly after receiving the callback

5. **Scopes Mismatch**
   - Current scopes: `openid profile email`
   - Check: Logs show `scope=openid+profile+email` (URL-encoded)
   - Fix: Verify Fenergo client is configured to allow these scopes

### Issue: No response from Fenergo

Check:
1. Authority URL is correct: `https://identity.fenxstable.com`
2. Network connectivity to Fenergo is working
3. AppRunner security groups allow outbound HTTPS to Fenergo

### Issue: Callback not received

Check:
1. Redirect URI is correct: `https://tc8srxrkcp.eu-west-1.awsapprunner.com/auth/callback`
2. No trailing slash
3. HTTPS, not HTTP
4. Matches exactly what's registered in Fenergo

## Test Files

- **test-oidc-flow.js** - Initiates OIDC login and generates authorization URL
- **test-oidc-callback.js** - Tests token exchange after receiving authorization code
- **OIDC_DEBUGGING_GUIDE.md** - Detailed debugging guide with log analysis
- **apprunner-backend.js** - Backend service with enhanced logging
- **oidc-auth.js** - OIDC authentication module with detailed logs

## Expected Successful Flow

1. ✓ `node test-oidc-flow.js` generates authorization URL
2. ✓ Browser opens authorization URL
3. ✓ User completes Fenergo login
4. ✓ Browser receives callback with code and state
5. ✓ `node test-oidc-callback.js <code> <state>` exchanges code for token
6. ✓ AppRunner logs show token exchange success
7. ✓ Access token is returned to client

## Next Steps After Success

Once the OIDC SSO flow is working:

1. Use the `authenticate_fenergo_sso_initiate` tool in Claude Desktop
2. This generates an authorization URL
3. Copy and visit the URL in your browser
4. Complete Fenergo login
5. Use the `authenticate_fenergo_sso_complete` tool with the code and state
6. Token is cached and used for subsequent API calls

## Architecture

```
Claude Desktop
     ↓
apprunner-mcp-connector.js (MCP Server)
     ↓
apprunner-backend.js (Express server)
     │
     ├→ /auth/login (initiates OIDC flow)
     │   └→ oidc-auth.js (generates authorization URL)
     │
     ├→ /auth/callback (completes OIDC flow)
     │   └→ oidc-auth.js (exchanges code for token)
     │
     └→ Fenergo Identity Provider
         (https://identity.fenxstable.com/connect/authorize)
         (https://identity.fenxstable.com/connect/token)
```

## Environment Variables

**AppRunner Configuration:**
```
FENERGO_OIDC_AUTHORITY=https://identity.fenxstable.com
FENERGO_OIDC_CLIENT_ID=mcp-client
FENERGO_OIDC_CLIENT_SECRET=fde959ef-da23-c764-c6ed-d7c679dada79
FENERGO_OIDC_REDIRECT_URI=https://tc8srxrkcp.eu-west-1.awsapprunner.com/auth/callback
FENERGO_OIDC_SCOPES=openid profile email
```

All correctly configured and verified via `/diagnostic` endpoint.
