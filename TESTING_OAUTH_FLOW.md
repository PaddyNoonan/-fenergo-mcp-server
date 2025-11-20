# Testing OAuth Flow - Step by Step

Now that environment variables are set, follow these steps to verify everything works.

---

## Step 1: Verify AppRunner Restarted

**Wait 2-3 minutes** for AppRunner to restart with new environment variables.

Check status in **AWS AppRunner Console**:
1. Go to AppRunner service: `fenergo-mcp-server`
2. Look at the status indicator (should be green "Running")
3. If it says "Operation in progress", wait a bit more

---

## Step 2: Test Health Endpoint

Test if AppRunner is running and healthy:

```bash
curl https://brruyqnwu2.eu-west-1.awsapprunner.com/health
```

**Expected Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-19T14:30:45.123Z",
  "service": "apprunner-backend"
}
```

**If it fails:**
- Service may still be restarting (wait 1-2 more minutes)
- Check AppRunner status in AWS console (should be "Running")
- Check if URL is correct

✅ **When this works, move to Step 3**

---

## Step 3: Test OAuth Endpoint Directly

Now test the `/authenticate` endpoint to see if OAuth is working:

```bash
curl -X POST https://brruyqnwu2.eu-west-1.awsapprunner.com/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your.email@company.com",
    "password": "your-fenergo-password",
    "tenantId": "f488cdba-2122-448d-952c-7a2a47f78f1b"
  }' 2>&1 | jq .
```

**Replace:**
- `your.email@company.com` with your actual Fenergo username
- `your-fenergo-password` with your actual Fenergo password
- Keep tenant ID as is: `f488cdba-2122-448d-952c-7a2a47f78f1b`

### Possible Responses

#### ✅ OAuth Success (What We Want!)
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "scope": "openid profile email tenant fenergo.all fenx.documents.read fenx.journey.read",
  "timestamp": "2025-11-19T14:30:45.123Z"
}
```

**Key indicators:**
- `"success": true`
- `"scope"` shows actual scopes (NOT "fallback")
- `"accessToken"` is a long JWT token
- NO "note" field mentioning fallback

**What to do:** ✅ Great! OAuth is working. Go to Step 4.

#### ⚠️ OAuth Failed - Using Fallback Token
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "scope": "fallback",
  "timestamp": "2025-11-19T14:30:45.123Z",
  "note": "Using configured API token as fallback"
}
```

**Key indicators:**
- `"scope": "fallback"` ← OAuth failed
- Has "note" mentioning fallback
- System still works but OAuth not active

**What to do:**
1. Check credentials are correct (can you log into Fenergo directly?)
2. Check AppRunner logs for OAuth errors
3. Go to Step 5 (Debugging)

#### ❌ Error Response
```json
{
  "error": "Authentication failed",
  "message": "OAuth authentication failed: 401 - invalid_grant",
  "timestamp": "2025-11-19T14:30:45.123Z"
}
```

**What to do:**
- Check credentials are correct
- Verify environment variables are set in AppRunner
- See Step 5 (Debugging)

---

## Step 4: Test in Claude Desktop

If OAuth succeeded in Step 3, test in Claude Desktop:

### 4a. Restart Claude Desktop
- Close Claude Desktop completely
- Wait 2 seconds
- Reopen Claude Desktop

### 4b. Start New Chat
Create a fresh conversation (don't use existing chat)

### 4c. Test authenticate_fenergo Tool

Ask Claude:
```
Can you authenticate me to Fenergo?
Username: your.email@company.com
Password: your-fenergo-password
Tenant ID: f488cdba-2122-448d-952c-7a2a47f78f1b
```

#### ✅ Expected Success Response
```
Successfully authenticated as your.email@company.com. Token cached for session.
You can now use the investigate_journey tool.
```

**Key indicators:**
- Says "Successfully authenticated"
- Does NOT mention "fallback"
- Says token is "cached for session"

#### ⚠️ Fallback Response
```
Successfully authenticated. Token cached for session.
Note: Using configured API token as fallback
```

**Means:** OAuth failed, using fallback

#### ❌ Error Response
```
Authentication failed: OAuth authentication failed...
```

**Means:** Check your credentials and AppRunner logs

### 4d. Test investigate_journey Tool

If authenticate_fenergo succeeded, ask Claude:

```
Can you show me the documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61?
```

#### ✅ Expected Response
Claude should return actual documents from Fenergo:
```
Documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61:

1. Passport
   - Status: Received
   - Date: 2025-11-15

2. Bank Statement
   - Status: Pending Review
   - Date: 2025-11-10

... etc
```

#### ❌ If It Fails
- Check if authenticate_fenergo was called first
- Token may have expired (call authenticate_fenergo again)
- Check AppRunner logs

---

## Step 5: Check AppRunner Logs (If Something Fails)

If OAuth is still failing or not working, check the logs:

### Check Configuration Logs
Look for startup logs showing environment variables:

```
[STARTUP] OAuth Configuration:
  FENERGO_OAUTH_ENDPOINT: https://identity.fenxstable.com/connect/token
  FENERGO_CLIENT_ID: quasar-sandbox
  FENERGO_CLIENT_SECRET: SET (67 chars) ← Should say SET, not NOT SET!
```

If it says "NOT SET", environment variables didn't save properly.

### Check OAuth Request/Response Logs
Look for OAuth error details:

```
[OAuth] Token request to https://identity.fenxstable.com/connect/token
[OAuth] Username: your.email@company.com
[OAuth] Request parameters: [ 'grant_type', 'username', 'password', 'scope', 'client_id', 'client_secret' ]
[OAuth] Response status: 400
[OAuth] Error response body: {"error":"invalid_request",...}
[OAuth] Parsed error: {...}
OAuth authentication failed: 400 - invalid_request
```

---

## Troubleshooting Guide

### Problem: "NOT SET - OAuth will fail!"
**Cause:** Environment variables not set in AppRunner

**Solution:**
1. Go back to AppRunner console
2. Click Edit
3. Verify all 3 variables are there and have correct values
4. Click Save
5. Wait 2-3 minutes for restart

---

### Problem: OAuth returns "invalid_request"
**Cause:** Missing or invalid OAuth parameters

**Check:**
1. Is `FENERGO_CLIENT_SECRET` set exactly as provided? (67 characters)
2. Is `FENERGO_CLIENT_ID` = `quasar-sandbox`?
3. Is `FENERGO_OAUTH_ENDPOINT` correct?

**Solution:**
1. Verify variables in AppRunner console
2. Re-save if any are wrong
3. Wait for restart

---

### Problem: OAuth returns "invalid_client"
**Cause:** Client ID or secret mismatch

**Check:**
1. Is client ID exactly `quasar-sandbox` (no extra spaces)?
2. Is client secret exactly as provided (check for truncation)?

**Solution:**
1. Delete and re-enter the variables carefully
2. Make sure there are no extra spaces
3. Copy directly from the documentation

---

### Problem: OAuth returns "invalid_grant"
**Cause:** Username/password incorrect

**Check:**
1. Can you log into Fenergo directly with those credentials?
2. Is the account active?
3. Are you using the correct format (email address)?

**Solution:**
1. Verify credentials with Fenergo team
2. Try a different test account if available
3. Check if password has expired

---

### Problem: Still Using Fallback Token
**Cause:** OAuth failing silently, system using backup token

**Solution:**
1. Check AppRunner logs for OAuth errors
2. Verify credentials are correct
3. Fix the underlying OAuth issue based on error message

**System will keep working** via fallback while you troubleshoot.

---

## Testing Checklist

- [ ] **Step 1**: AppRunner service status is "Running" (green)
- [ ] **Step 2**: Health endpoint returns 200 OK
- [ ] **Step 3**: `/authenticate` endpoint returns OAuth success (no fallback)
- [ ] **Step 4a**: Claude Desktop restarted successfully
- [ ] **Step 4b**: New chat created
- [ ] **Step 4c**: `authenticate_fenergo` tool available and works
- [ ] **Step 4d**: `investigate_journey` returns actual documents
- [ ] **Step 5**: AppRunner logs show "SET" for FENERGO_CLIENT_SECRET

---

## Success Criteria

✅ You're done when:

1. Health endpoint returns 200 OK
2. `/authenticate` endpoint returns OAuth token (not fallback)
3. Claude can call `authenticate_fenergo` successfully
4. Claude can call `investigate_journey` and get documents
5. Token is reused across multiple calls (no re-auth needed)

---

## Quick Commands Reference

```bash
# Check health
curl https://brruyqnwu2.eu-west-1.awsapprunner.com/health

# Test OAuth (replace credentials)
curl -X POST https://brruyqnwu2.eu-west-1.awsapprunner.com/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your.email@company.com",
    "password": "your-password",
    "tenantId": "f488cdba-2122-448d-952c-7a2a47f78f1b"
  }' | jq .

# View AppRunner logs (if AWS credentials available)
aws logs get-log-events \
  --log-group-name /aws/apprunner/fenergo-mcp-server/service \
  --log-stream-name default \
  --region eu-west-1 \
  --query 'events[*].message' \
  --output text
```

---

## Next Steps

1. **Run Step 2** - Test health endpoint
2. **Run Step 3** - Test OAuth endpoint
3. **Run Step 4** - Test in Claude Desktop
4. **If anything fails** - Check Step 5 (Debugging)
5. **Report results** - Let me know what you see

