# OAuth Debugging Guide

Since OAuth is still not working, follow this checklist to diagnose the issue.

## Step 1: Verify Environment Variables in AppRunner

**Critical**: The `FENERGO_CLIENT_SECRET` environment variable MUST be set in AppRunner.

### Check What's Set

1. Go to **AWS AppRunner Console**
2. Click your service: `fenergo-mcp-server`
3. Look at **Configuration** section
4. Check **Environment variables** - you should see:

```
FENERGO_CLIENT_ID = quasar-sandbox
FENERGO_CLIENT_SECRET = 4dxIqk+/MnT6hIKecUFa1iqjLs/AhorbUQgMWjTDQqI=
FENERGO_OAUTH_ENDPOINT = https://identity.fenxstable.com/connect/token
FENERGO_API_TOKEN = Bearer eyJ...
FENERGO_TENANT_ID = f488cdba-2122-448d-952c-7a2a47f78f1b
PORT = 8080
```

**If `FENERGO_CLIENT_SECRET` is missing:** Add it now!

### If Variables Are Missing

1. Click **Edit** on the service
2. Scroll to **Environment variables**
3. Add missing variables
4. Click **Save**
5. Wait 2-3 minutes for restart

---

## Step 2: Check AppRunner Startup Logs

After AppRunner restarts, the diagnostic logs will tell you if variables are set.

### View Logs (if AWS credentials are available)

```bash
# Option 1: AWS CLI
aws logs get-log-events \
  --log-group-name /aws/apprunner/fenergo-mcp-server/service \
  --log-stream-name default \
  --region eu-west-1

# Look for: [STARTUP] OAuth Configuration
# Should show:
# - FENERGO_OAUTH_ENDPOINT: https://identity.fenxstable.com/connect/token
# - FENERGO_CLIENT_ID: quasar-sandbox
# - FENERGO_CLIENT_SECRET: SET (67 chars) ← If NOT SET here, env var is missing!
```

### View Logs (via AWS Console)

1. Go to **AWS AppRunner Console**
2. Click your service
3. Click **Logs** tab
4. Look for `[STARTUP] OAuth Configuration` messages
5. Check if `FENERGO_CLIENT_SECRET` shows `SET` or `NOT SET`

---

## Step 3: Test Health Endpoint

```bash
curl https://brruyqnwu2.eu-west-1.awsapprunner.com/health
```

**Expected Response:**
```json
{"status":"healthy","timestamp":"2025-11-19T...","service":"apprunner-backend"}
```

**If fails:**
- AppRunner may be restarting (give it 2-3 minutes)
- Check service status in AWS console (should be "Running")

---

## Step 4: Test OAuth Directly

Test the `/authenticate` endpoint directly to see the exact error:

```bash
curl -X POST https://brruyqnwu2.eu-west-1.awsapprunner.com/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your.email@company.com",
    "password": "your-password",
    "tenantId": "f488cdba-2122-448d-952c-7a2a47f78f1b"
  }' 2>&1 | jq .
```

**Expected Success Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "scope": "openid profile email..."
}
```

**Fallback Response (OAuth failed, using static token):**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "scope": "fallback",
  "note": "Using configured API token as fallback"
}
```

**Error Response:**
```json
{
  "error": "Authentication failed",
  "message": "OAuth authentication failed: 401 - invalid_grant"
}
```

---

## Diagnostic Checklist

### Environment Setup
- [ ] `FENERGO_CLIENT_ID` set to `quasar-sandbox`
- [ ] `FENERGO_CLIENT_SECRET` set to the full value (67 characters)
- [ ] `FENERGO_OAUTH_ENDPOINT` set to `https://identity.fenxstable.com/connect/token`
- [ ] `FENERGO_API_TOKEN` set (fallback token)
- [ ] `FENERGO_TENANT_ID` set correctly
- [ ] AppRunner service restarted after changes (shows "Running")

### Code Deployment
- [ ] Latest code pushed to GitHub (commit c25cc99 or later)
- [ ] AppRunner auto-deployment completed
- [ ] Health endpoint responds with 200 OK

### OAuth Flow
- [ ] Direct curl test shows OAuth success (no "fallback" in response)
- [ ] Claude Desktop calls authenticate_fenergo successfully
- [ ] Claude shows "Successfully authenticated" (not "fallback")
- [ ] investigate_journey works with cached token

---

## Common Problems & Solutions

### Problem: "NOT SET - OAuth will fail!"

**Cause**: `FENERGO_CLIENT_SECRET` environment variable not set in AppRunner

**Solution**:
1. Go to AWS AppRunner service
2. Click **Edit**
3. Add `FENERGO_CLIENT_SECRET`
4. Value: `4dxIqk+/MnT6hIKecUFa1iqjLs/AhorbUQgMWjTDQqI=`
5. Click **Save**
6. Wait 2-3 minutes

### Problem: OAuth returns "invalid_request"

**Possible Causes**:
1. Client secret is wrong or truncated
2. Client ID is not "quasar-sandbox"
3. OAuth endpoint URL is different
4. Fenergo requires different request format

**Debug Steps**:
1. Check AppRunner logs for exact OAuth request/response
2. Verify Fenergo credentials are correct
3. Try with a different Fenergo account
4. Check if endpoint URL should be different

### Problem: OAuth returns "invalid_client"

**Cause**: Client ID or secret mismatch

**Check**:
- Client ID must be exactly: `quasar-sandbox`
- Client secret must be exactly: `4dxIqk+/MnT6hIKecUFa1iqjLs/AhorbUQgMWjTDQqI=` (note special characters)
- No extra spaces or quotes

### Problem: OAuth returns "invalid_grant"

**Cause**: Username/password incorrect for Fenergo account

**Check**:
1. Can you log into Fenergo with same credentials?
2. Is account active in Fenergo system?
3. Is password correct?
4. Is username the correct format (email)?

### Problem: Still Using Fallback Token

**Cause**: OAuth is failing, but fallback is working

**What to do**:
1. Check AppRunner logs for OAuth error
2. Review the specific OAuth error response
3. Verify credentials and configuration
4. Contact Fenergo support if needed

System will continue to work via fallback, but OAuth is not active.

---

## What to Report If Still Broken

If you're still having issues, provide:

1. **Health endpoint response:**
   ```bash
   curl https://brruyqnwu2.eu-west-1.awsapprunner.com/health
   ```

2. **Direct authenticate test response:**
   ```bash
   curl -X POST https://brruyqnwu2.eu-west-1.awsapprunner.com/authenticate \
     -H "Content-Type: application/json" \
     -d '{"username":"test@test.com","password":"test","tenantId":"f488cdba-2122-448d-952c-7a2a47f78f1b"}'
   ```

3. **Environment variables in AppRunner:**
   - Are all 5 variables set?
   - Are values exactly as specified?

4. **AppRunner logs:**
   - What does `[STARTUP] OAuth Configuration` show?
   - Are there any OAuth error messages?

5. **Claude Desktop error:**
   - What exact error does Claude show?
   - Does it say "fallback"?

---

## Key Files

- [apprunner-backend.js](apprunner-backend.js) - OAuth endpoint and diagnostics
- [oauth-auth.js](oauth-auth.js) - OAuth implementation
- [OAUTH_SETUP_FINAL_STEPS.md](OAUTH_SETUP_FINAL_STEPS.md) - Setup guide
- [QUICK_START_OAUTH.md](QUICK_START_OAUTH.md) - Quick reference

