# OIDC SSO Testing - Quick Start

## TL;DR - Test in 3 Steps

### Step 1: Generate Authorization URL
```bash
node test-oidc-flow.js
```
Output: Shows authorization URL like:
```
https://identity.fenxstable.com/connect/authorize?client_id=mcp-client&...&state=6ee9caa0...
```

### Step 2: Get Authorization Code
1. Copy the authorization URL
2. Paste it in your browser
3. Complete Fenergo login
4. Fenergo redirects to callback URL with code and state parameters

### Step 3: Exchange Code for Token
```bash
node test-oidc-callback.js "your_code_here" "your_state_here"
```

Or interactive:
```bash
node test-oidc-callback.js
# Then paste code and state when prompted
```

## Expected Output

**Success:**
```
Status: 200
Response:
{
  "success": true,
  "accessToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "tenantId": "test-tenant"
}
```

**Failure:**
```
Status: 400
Response:
{
  "error": "OAuth error from identity provider",
  "oauthError": "invalid_request",
  "oauthErrorDescription": "..."
}
```

## Key Configuration

| Item | Value |
|------|-------|
| Authority | `https://identity.fenxstable.com` |
| Client ID | `mcp-client` |
| Client Secret | `fde959ef-da23-c764-c6ed-d7c679dada79` |
| Redirect URI | `https://tc8srxrkcp.eu-west-1.awsapprunner.com/auth/callback` |
| Scopes | `openid profile email` |

All verified via `/diagnostic` endpoint on AppRunner.

## Files

| File | Purpose |
|------|---------|
| `test-oidc-flow.js` | Step 1 - Generate authorization URL |
| `test-oidc-callback.js` | Step 3 - Exchange code for token |
| `TEST_OIDC_FLOW.md` | Complete detailed guide |
| `OIDC_DEBUGGING_GUIDE.md` | Troubleshooting guide |
| `oidc-auth.js` | OIDC implementation (with detailed logging) |
| `apprunner-backend.js` | Backend service |

## What's Logged

When you test, AppRunner logs will show:

**If success:**
```
[TIMESTAMP] [OIDC] ========== SUCCESS: TOKEN ACQUIRED ==========
[TIMESTAMP] [OIDC] Token expires in: 3600s
```

**If error:**
```
[TIMESTAMP] [OIDC] ========== ERROR: TOKEN EXCHANGE FAILED ==========
[TIMESTAMP] [OIDC] Status: 400
[TIMESTAMP] [OIDC] Error Response: {"error":"invalid_request",...}
```

View logs:
```bash
aws logs tail /aws/apprunner/fenergo-insights-agent/default --follow
```

## Common Issues

| Issue | Fix |
|-------|-----|
| `invalid_request` | Check redirect_uri matches exactly in Fenergo config |
| Code expired | Complete test within 10 minutes of generating URL |
| State mismatch | Use exact state from authorization URL |
| Wrong client ID | Verify `mcp-client` in AppRunner config |
| Wrong secret | Verify `fde959ef-da23-c764-c6ed-d7c679dada79` in AppRunner |

## Architecture Flow

```
Local Test Script
    ↓
AppRunner Backend
    ├→ /auth/login (generates auth URL)
    ├→ /diagnostic (shows config)
    └→ /auth/callback (exchanges code)
    ↓
Fenergo Identity Provider
    ├→ /connect/authorize (issues code)
    └→ /connect/token (issues token)
```

## Next: Use in Claude Desktop

Once testing succeeds:

1. Use `authenticate_fenergo_sso_initiate` tool
2. This generates authorization URL (like test-oidc-flow.js)
3. Complete Fenergo login in browser
4. Use `authenticate_fenergo_sso_complete` tool with code and state
5. Token is cached and used for API calls

## Need Help?

- **Setup issues?** → Read `TEST_OIDC_FLOW.md`
- **Troubleshooting?** → Read `OIDC_DEBUGGING_GUIDE.md`
- **Want to understand flow?** → Read architecture section in `TEST_OIDC_FLOW.md`
- **Check logs?** → `aws logs tail /aws/apprunner/fenergo-insights-agent/default --follow`
