# OIDC SSO Debugging Guide

## Overview

The OIDC/SSO authentication flow has been enhanced with comprehensive logging to diagnose the "invalid_request" error from Fenergo's identity provider. This guide explains how to capture and analyze those logs.

## Current Status

✓ AppRunner is properly configured with:
- Client ID: `mcp-client`
- Client Secret: `fde959ef-da23-c764-c6ed-d7c679dada79` (UUID format)
- Authority: `https://identity.fenxstable.com`
- Redirect URI: `https://tc8srxrkcp.eu-west-1.awsapprunner.com/auth/callback`
- Scopes: `openid profile email`

✓ The authorization flow (Step 1) is working correctly - authorization URLs are being generated properly

✗ The token exchange (Step 5) is failing with "invalid_request" error from Fenergo

## Testing the OIDC Flow

### Using the Test Script

Run the test script to verify the authorization flow:

```bash
node test-oidc-flow.js
```

This will:
1. Check AppRunner configuration via `/diagnostic` endpoint
2. Initiate OIDC login via `/auth/login` endpoint
3. Generate an authorization URL
4. Display the parameters being sent

### What You'll See

The authorization URL will look like:
```
https://identity.fenxstable.com/connect/authorize?client_id=mcp-client&response_type=code&scope=openid+profile+email&redirect_uri=https%3A%2F%2Ftc8srxrkcp.eu-west-1.awsapprunner.com%2Fauth%2Fcallback&state=XXXX&prompt=login
```

## Capturing the Token Exchange Logs

The detailed logging happens when Fenergo redirects back to `/auth/callback` with an authorization code. This is when AppRunner exchanges the code for tokens.

### Step 1: Start Monitoring AppRunner Logs

Open a new terminal and start tailing the AppRunner logs:

```bash
aws logs tail /aws/apprunner/fenergo-insights-agent/default --follow
```

Or if you prefer, see logs for a specific service:

```bash
aws logs describe-log-streams --log-group-name /aws/apprunner/fenergo-insights-agent/default
```

### Step 2: Manually Trigger the Flow

1. Copy the authorization URL from `test-oidc-flow.js` output
2. Open it in a browser
3. Complete the Fenergo login
4. Fenergo will redirect back to AppRunner's `/auth/callback` endpoint with a code

### Step 3: Examine the Logs

When the token exchange happens, look for logs containing `[OIDC]` tags. You should see:

#### Authorization Request Log
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
[TIMESTAMP] [OIDC] Client Secret - FULL VALUE: fde959ef-da23-c764-c6ed-d7c679dada79
[TIMESTAMP] [OIDC] Redirect URI: https://tc8srxrkcp.eu-west-1.awsapprunner.com/auth/callback
[TIMESTAMP] [OIDC] Code: XXXXX...
[TIMESTAMP] [OIDC] State: XXXXX...
[TIMESTAMP] [OIDC] Request Body (raw): grant_type=authorization_code&code=XXXXX...
[TIMESTAMP] [OIDC] Request Body (parsed): {
  grant_type: 'authorization_code',
  code: 'XXXXX...',
  client_id: 'mcp-client',
  client_secret: '[SET]',
  redirect_uri: 'https://tc8srxrkcp.eu-west-1.awsapprunner.com/auth/callback'
}
[TIMESTAMP] [OIDC] Headers: {...}
[TIMESTAMP] [OIDC] Target URL: https://identity.fenxstable.com/connect/token
```

#### Response Log
```
[TIMESTAMP] [OIDC] ========== TOKEN EXCHANGE RESPONSE ==========
[TIMESTAMP] [OIDC] Response Status Code: 400
[TIMESTAMP] [OIDC] Response Headers: {...}
[TIMESTAMP] [OIDC] Response Body: {"error":"invalid_request","error_description":"..."}
```

## What to Check

When you see the logs, verify:

1. **Client ID**: Should be `mcp-client` (case-sensitive)
2. **Client Secret**: Should be `fde959ef-da23-c764-c6ed-d7c679dada79`
3. **Redirect URI**: Should be exactly `https://tc8srxrkcp.eu-west-1.awsapprunner.com/auth/callback`
   - No trailing slash
   - Must be HTTPS, not HTTP
   - Must match exactly what's registered in Fenergo
4. **Grant Type**: Should be `authorization_code`
5. **Code**: Should be the code from the authorization response
6. **Scopes**: Should be properly requested

## Common Issues

### Issue: "invalid_request" with code 400

Possible causes:

1. **Redirect URI mismatch**
   - The redirect_uri in the token exchange request doesn't match what's registered in Fenergo
   - Check if Fenergo has it registered with/without trailing slash, HTTP vs HTTPS

2. **Client ID mismatch**
   - The client_id doesn't match what's registered in Fenergo
   - Case-sensitive comparison

3. **Client Secret mismatch**
   - The client_secret is wrong
   - Has whitespace (checked in diagnostic endpoint)
   - Is encoded incorrectly

4. **Code expiration**
   - The authorization code expires after ~10 minutes
   - If you wait too long between steps 2 and 3, the code becomes invalid

5. **Parameter encoding**
   - URLSearchParams might be encoding parameters differently than expected
   - The logs will show the raw request body

## Solution Approach

1. Run `test-oidc-flow.js` to get an authorization URL
2. Copy the URL and visit it in your browser
3. Complete the Fenergo login
4. While it's processing the callback, check the AppRunner logs
5. Compare the exact parameters in the logs with what's registered in Fenergo:
   - Log into Fenergo admin console
   - Find the OIDC client configuration
   - Verify that client_id, client_secret, and redirect_uri match exactly

## Expected Success Response

When token exchange succeeds, you should see:

```
[TIMESTAMP] [OIDC] ========== SUCCESS: TOKEN ACQUIRED ==========
[TIMESTAMP] [OIDC] Token expires in: 3600s
[TIMESTAMP] [OIDC] Scope: openid profile email
```

Followed by:

```
[TIMESTAMP] === END /auth/callback request (SUCCESS) ===
{
  "success": true,
  "accessToken": "eyJ...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "idToken": "eyJ...",
  "tenantId": "test-tenant",
  ...
}
```

## Files Modified

- `oidc-auth.js`: Enhanced `exchangeCodeForToken()` method with detailed logging (lines 91-115)
- `apprunner-backend.js`: Added `/diagnostic` endpoint and `/test-token-exchange` endpoint

## Next Steps

Once you run the test and capture the logs:

1. Look at the exact parameters being sent in the token exchange request
2. Compare them with Fenergo's registered OIDC client configuration
3. Identify which parameter is causing the "invalid_request" error
4. Update the configuration or code as needed

The logs should pinpoint exactly what's different!
