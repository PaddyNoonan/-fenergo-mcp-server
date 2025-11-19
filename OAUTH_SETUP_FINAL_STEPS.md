# OAuth 2.0 Setup - Final Steps

## Summary

The OAuth 2.0 authentication implementation is complete in code, but requires one final configuration step in AWS AppRunner to activate.

### What Was Implemented

✅ **oauth-auth.js** - OAuth module that implements password grant flow
✅ **apprunner-backend.js** - Added `/authenticate` endpoint and OAuth integration
✅ **apprunner-mcp-connector.js** - Added `authenticate_fenergo` tool with session-level token caching
✅ **Code committed and pushed** to GitHub (commit: a28500a)
✅ **AppRunner auto-deployment** - Will automatically build from latest GitHub code

### What's Needed

⏳ **ONE FINAL STEP** - Add environment variables to AWS AppRunner service

---

## Step 1: Update AppRunner Environment Variables

### Via AWS Console (Recommended - Easiest)

1. **Open AWS AppRunner Console**
   - Go to: https://eu-west-1.console.aws.amazon.com/apprunner/home
   - Select region: **eu-west-1**

2. **Find Your Service**
   - Click on service: `fenergo-mcp-server`
   - You should see URL: `https://brruyqnwu2.eu-west-1.awsapprunner.com`

3. **Edit Service Configuration**
   - Click **Edit** button (top right)
   - Scroll down to **Environment variables** section

4. **Add Three New Environment Variables**

   Add these variables (copy the exact values):

   ```
   Variable 1:
   Name: FENERGO_CLIENT_ID
   Value: quasar-sandbox

   Variable 2:
   Name: FENERGO_CLIENT_SECRET
   Value: 4dxIqk+/MnT6hIKecUFa1iqjLs/AhorbUQgMWjTDQqI=

   Variable 3:
   Name: FENERGO_OAUTH_ENDPOINT
   Value: https://identity.fenxstable.com/connect/token
   ```

5. **Save Configuration**
   - Click **Save** button
   - AppRunner will automatically restart the service (2-3 minutes)

6. **Wait for Deployment**
   - Status will show "Operation in progress"
   - Wait until status returns to "Running"
   - You'll see a green checkmark when complete

### Via AWS CLI (Alternative)

If you prefer command line:

```bash
# Set variables
$ServiceArn = "arn:aws:apprunner:eu-west-1:541796865884:service/fenergo-mcp-server/aa6f1077658c4a6a863becb27fc89b44"

# Update service (note: this is a more complex CLI operation)
# Easiest to use the Console above
```

---

## Step 2: Verify AppRunner Has Restarted

After saving, wait 2-3 minutes and verify:

```bash
# Test health endpoint
curl https://brruyqnwu2.eu-west-1.awsapprunner.com/health

# Should return:
# {"status":"healthy","timestamp":"2025-11-19T...","service":"apprunner-backend"}
```

---

## Step 3: Test OAuth Authentication

### Option A: Test via Claude Desktop (Recommended)

1. **Restart Claude Desktop**
   - Close Claude Desktop completely
   - Wait 2 seconds
   - Reopen Claude Desktop

2. **Start New Chat**
   - Create a fresh conversation

3. **Test authenticate_fenergo Tool**

   Ask Claude:
   ```
   Can you authenticate me to Fenergo?
   Username: [your fenergo username]
   Password: [your fenergo password]
   Tenant ID: f488cdba-2122-448d-952c-7a2a47f78f1b
   ```

4. **Check Response**
   - ✅ **Success**: "Successfully authenticated as [username]. Token cached for session."
   - ❌ **Still uses fallback**: "Using configured API token as fallback" (OAuth may still be failing)
   - ❌ **Error**: Check AppRunner logs (see Step 4)

### Option B: Direct API Test

```bash
# Test /authenticate endpoint directly
curl -X POST https://brruyqnwu2.eu-west-1.awsapprunner.com/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your.email@example.com",
    "password": "your-password",
    "tenantId": "f488cdba-2122-448d-952c-7a2a47f78f1b"
  }'

# Success response (should NOT have "fallback" note):
# {"success":true,"accessToken":"...","tokenType":"Bearer","expiresIn":3600,"scope":"..."}

# Fallback response (OAuth failed):
# {"success":true,"accessToken":"...","tokenType":"Bearer",...,"note":"Using configured API token as fallback"}
```

---

## Step 4: Check AppRunner Logs (If Authentication Fails)

### View Real-Time Logs

```bash
# Watch logs in real-time
aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow --region eu-west-1

# Or view last 50 lines
aws logs tail /aws/apprunner/fenergo-mcp-server/service --limit 50 --region eu-west-1
```

### Look For These Log Messages

**Success indicators:**
- `[OAuth] Token acquired (expires in 3600s)`
- `[OAuth] Token type: Bearer`
- `Authentication successful via OAuth`

**Failure indicators:**
- `[OAuth] Request error: ...` - Network error connecting to Fenergo OAuth
- `[OAuth] Error response: invalid_request` - Missing/invalid OAuth parameters
- `[OAuth] Failed to parse response` - OAuth endpoint returned unexpected format

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `invalid_request` error | Client secret not set or wrong format | Verify FENERGO_CLIENT_SECRET is set in AppRunner |
| `invalid_client` error | Client ID wrong | Verify FENERGO_CLIENT_ID is `quasar-sandbox` |
| Connection timeout | Network issue | Check AppRunner can reach `identity.fenxstable.com` |
| 401 Unauthorized | Fenergo username/password wrong | Verify credentials are correct |
| Still using fallback | OAuth failing silently | Check AppRunner logs |

---

## Step 5: Test Full OAuth Flow

Once OAuth is working, test the complete flow:

1. **Restart Claude Desktop**

2. **Test authenticate_fenergo Tool**
   - Should return: "Successfully authenticated"
   - Should NOT return: "Using configured API token as fallback"

3. **Test investigate_journey Tool**
   - Ask: "Can you tell me documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
   - Should use the cached OAuth token
   - Should return actual documents

4. **Verify Token Caching Works**
   - Call investigate_journey multiple times in same conversation
   - Each call should use the same cached token
   - Should NOT require re-authentication

---

## Architecture Overview

```
Claude Desktop
    ↓
[User: "Authenticate me to Fenergo"]
    ↓
apprunner-mcp-connector.js
    ├─ Calls authenticate_fenergo tool
    │  ├─ Sends POST to /authenticate endpoint
    │  └─ Gets back OAuth token
    ├─ Caches token in this.tokenCache
    └─ Returns: "Successfully authenticated"
    ↓
User: "What documents do we have?"
    ↓
apprunner-mcp-connector.js
    ├─ Calls investigate_journey tool
    ├─ Uses cached token from authenticate step
    ├─ Sends payload with cached Bearer token
    └─ Gets documents from Fenergo
    ↓
Claude returns documents to user
```

### OAuth Flow Details

```
apprunner-mcp-connector.js (/authenticate request)
    ↓
apprunner-backend.js (/authenticate endpoint)
    ├─ Extract username/password/tenantId
    ├─ Create OAuth request with:
    │  ├─ grant_type: "password"
    │  ├─ username: [user input]
    │  ├─ password: [user input]
    │  ├─ client_id: "quasar-sandbox" (from env)
    │  ├─ client_secret: "..." (from env - NEEDS TO BE SET)
    │  └─ scope: "openid profile email tenant fenergo.all ..."
    ├─ Call Fenergo OAuth endpoint
    ├─ Get access_token back
    ├─ Return to connector
    └─ Connector caches token for session
```

---

## Environment Variables Summary

### AppRunner (AWS) - SET THESE IN AWS CONSOLE

| Variable | Value | Status |
|----------|-------|--------|
| `FENERGO_API_TOKEN` | Bearer eyJ... | ✅ Already set (fallback) |
| `FENERGO_TENANT_ID` | f488cdba-2122-448d-952c-7a2a47f78f1b | ✅ Already set |
| `FENERGO_CLIENT_ID` | quasar-sandbox | ⏳ **NEEDS TO BE ADDED** |
| `FENERGO_CLIENT_SECRET` | 4dxIqk+/MnT6hIKecUFa1iqjLs/AhorbUQgMWjTDQqI= | ⏳ **NEEDS TO BE ADDED** |
| `FENERGO_OAUTH_ENDPOINT` | https://identity.fenxstable.com/connect/token | ⏳ **NEEDS TO BE ADDED** |

### Claude Desktop (Local) - ALREADY CONFIGURED

| Variable | Value | Status |
|----------|-------|--------|
| `APPRUNNER_URL` | https://brruyqnwu2.eu-west-1.awsapprunner.com | ✅ Set |
| `FENERGO_TENANT_ID` | f488cdba-2122-448d-952c-7a2a47f78f1b | ✅ Set |
| `REQUEST_TIMEOUT` | 30000 | ✅ Set |
| `MAX_RETRIES` | 2 | ✅ Set |

Note: `FENERGO_API_TOKEN` was removed from Claude Desktop config (will use OAuth instead, with fallback to AppRunner's token)

---

## Next Steps

1. **Add environment variables to AppRunner** (AWS Console) - 2 minutes
2. **Wait for AppRunner to restart** - 2-3 minutes
3. **Test health endpoint** - 1 minute
4. **Test authenticate_fenergo in Claude** - 2 minutes
5. **Test investigate_journey with cached token** - 2 minutes

**Total time: ~10-15 minutes**

---

## Code Files Modified

### oauth-auth.js (NEW)
- **Lines**: 1-180
- **Purpose**: OAuth 2.0 password grant implementation
- **Key method**: `authenticate(username, password, tenantId)`
- **Returns**: `{ accessToken, expiresIn, tokenType, scope }`

### apprunner-backend.js
- **Lines 19**: Import oauth-auth.js
- **Lines 30-38**: Initialize OAuthAuth with client credentials
- **Lines 62-129**: New `/authenticate` endpoint
- **Key feature**: Fallback to static token if OAuth fails

### apprunner-mcp-connector.js
- **Lines ~50-70**: Token cache object in constructor
- **Lines ~150-200**: New `authenticate_fenergo` tool definition
- **Lines ~280-350**: Handler for authenticate_fenergo
- **Lines ~360-400**: Updated investigate_journey to use cached token
- **Lines ~440-500**: Call /authenticate endpoint

### claude_desktop_config.json
- **Removed**: `FENERGO_API_TOKEN` from env (was fallback)
- **Kept**: `APPRUNNER_URL`, `FENERGO_TENANT_ID`, timeouts

---

## Rollback Plan

If OAuth doesn't work:

1. **System still functions** via fallback to static Bearer token
2. **No user action needed** - system gracefully degrades
3. **Debugging steps**:
   - Check AppRunner logs for OAuth errors
   - Verify environment variables are set
   - Test credentials with Fenergo directly
   - Check network connectivity to `identity.fenxstable.com`

---

## Testing Checklist

- [ ] Environment variables added to AppRunner
- [ ] AppRunner service restarted (shows "Running")
- [ ] Health endpoint responds with 200 OK
- [ ] Claude Desktop starts without errors
- [ ] `authenticate_fenergo` tool visible in Claude
- [ ] `authenticate_fenergo` returns success message
- [ ] `investigate_journey` tool works after authentication
- [ ] Token caching works (multiple calls use same token)
- [ ] AppRunner logs show OAuth token acquired

---

## Support

If you encounter issues:

1. Check AppRunner logs: `aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow`
2. Verify environment variables are set correctly
3. Test health endpoint: `curl https://brruyqnwu2.eu-west-1.awsapprunner.com/health`
4. Check Fenergo credentials are correct
5. Ensure no network blockers to `identity.fenxstable.com`

