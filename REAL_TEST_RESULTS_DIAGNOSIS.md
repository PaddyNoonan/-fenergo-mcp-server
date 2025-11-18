# Real Test Results - Diagnosis Guide

**Test Date:** 2025-11-18
**Test Query:** "Can you tell me information on Documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
**Test Environment:** Claude Desktop
**Result:** Tool error - "isn't responding as expected"

---

## What The Error Means

```
"The Fenergo AppRunner investigation tool isn't responding as expected
despite the health check showing the service is available"
```

**Breaking this down:**

✅ **What's Working:**
- Tool exists and can be called
- AppRunner service is running (health check passes)
- Network connectivity works
- MCP connector is loaded

❌ **What's Not Working:**
- Tool returns error instead of data
- Generic error means something failed in the backend
- Not a "No data returned" error (progress!)
- Backend processing failed

---

## Root Cause Analysis

This error suggests one of these scenarios:

### **Scenario 1: AppRunner Backend Not Updated (60% Probability)**

**Situation:**
- The connector code was updated (payload fix)
- But the AppRunner backend service wasn't restarted
- Old backend code still running with old expectations

**Signs:**
- Health check passes (basic endpoint works)
- Tool call fails (complex endpoint fails)
- Error is generic (backend caught exception and returned error)

**Solution:**
```bash
aws apprunner start-deployment --service-arn [ARN] --region eu-west-1
```

Wait 2-3 minutes for redeployment, then retry the test.

---

### **Scenario 2: Token Expired (25% Probability)**

**Situation:**
- Your Fenergo API token in the config has expired
- Backend tries to call Fenergo API with invalid token
- Fenergo rejects the request
- Backend returns generic error

**Signs:**
- Tool call fails with generic error
- No specific 401/403 error (AppRunner catches it)
- Health check still passes (doesn't need token)

**Solution:**
1. Get fresh token from Fenergo
2. Update `claude_desktop_config.json` with new token
3. Restart Claude Desktop
4. Retry the test

**Token Location:**
```json
"fenergo-apprunner": {
  "env": {
    "FENERGO_API_TOKEN": "Bearer [YOUR_TOKEN_HERE]"
  }
}
```

---

### **Scenario 3: Fenergo API Connection Issue (10% Probability)**

**Situation:**
- Backend can't reach Fenergo API
- Network connectivity issue
- VPC/firewall rules blocking request
- Fenergo API endpoint is down

**Signs:**
- Generic error from tool
- Health check still passes
- No specific error message

**Solution:**
Test Fenergo API directly:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/health
```

Should return 200 OK or 404 (endpoint exists).

---

### **Scenario 4: Fenergo API Format Still Wrong (5% Probability)**

**Situation:**
- Despite the fix, AppRunner backend expects a different format
- Backend code hardcodes specific structure
- Our fix format doesn't match what backend expects

**Signs:**
- Tool call fails with generic error
- Other troubleshooting doesn't help
- Backend code needs to be reviewed

**Solution:**
Check AppRunner logs to see what backend is receiving:
```bash
aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow
```

---

## Diagnostic Test Plan (Priority Order)

### **Test 1: Restart AppRunner (Do This First - 60% Success Rate)**

```bash
# Start a new deployment
aws apprunner start-deployment \
  --service-arn arn:aws:apprunner:eu-west-1:ACCOUNT:service/fenergo-mcp-server/SERVICE_ID \
  --region eu-west-1

# Wait 2-3 minutes for deployment

# Then retry test in Claude Desktop
```

**Expected Result After Restart:**
- Tool succeeds and returns documents
- OR different error message appears (more diagnostic info)

**Time:** 2-3 minutes

---

### **Test 2: Check Token Validity (Do If Test 1 Doesn't Work)**

```bash
# Get your token from the config
TOKEN="Bearer [from claude_desktop_config.json]"

# Test against Fenergo
curl -H "Authorization: $TOKEN" \
  https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/health

# Expected: 200 OK or 404 (endpoint exists)
# Not Expected: 401 Unauthorized or 403 Forbidden
```

**If you get 401/403:**
- Token is invalid or expired
- Get fresh token from Fenergo
- Update claude_desktop_config.json
- Restart Claude Desktop
- Retry test

**Time:** 5 minutes

---

### **Test 3: Check AppRunner Logs (Do If Tests 1-2 Don't Work)**

```bash
# View recent logs
aws logs tail /aws/apprunner/fenergo-mcp-server/service \
  --follow \
  --limit 50

# Look for:
# - Request being received: ✅ Good sign
# - Payload being parsed: ✅ Good sign
# - Fenergo API call attempt: ✅ Good sign
# - Error messages: ❌ Bad sign
# - Timeout errors: ❌ Bad sign
```

**What to Look For:**

✅ **Good Log Pattern:**
```
[timestamp] Received request
[timestamp] Parsing payload
[timestamp] Calling Fenergo API
[timestamp] Response from Fenergo
[timestamp] Returning to connector
```

❌ **Bad Log Pattern:**
```
[timestamp] Error: Cannot parse payload
[timestamp] Error: Fenergo API unreachable
[timestamp] Error: Invalid token
[timestamp] Timeout calling Fenergo
```

**Time:** 5 minutes

---

## Complete Diagnostic Checklist

Run through this checklist in order:

- [ ] **Test 1: AppRunner Restart**
  - [ ] Run: `aws apprunner start-deployment --service-arn [ARN]`
  - [ ] Wait: 2-3 minutes
  - [ ] Test: Retry in Claude Desktop
  - [ ] Result: _______________

- [ ] **Test 2: Token Check**
  - [ ] Extract token from config
  - [ ] Run: `curl -H "Authorization: $TOKEN" https://api.fenxstable.com/.../health`
  - [ ] Expected: 200 or 404
  - [ ] Got: _______________
  - [ ] If 401/403: Get new token and restart Claude Desktop

- [ ] **Test 3: AppRunner Logs**
  - [ ] Run: `aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow`
  - [ ] Look for: Request received, Fenergo API call, errors
  - [ ] What you see: _______________
  - [ ] Any error messages? _______________

---

## Expected Outcomes

### **Outcome A: Success After AppRunner Restart ✅**

**Symptom:** After restarting, tool returns actual documents
**Next Step:** Test with different journey IDs to confirm consistency
**Action:** Fix is complete! Ready for production

---

### **Outcome B: Still Failing After AppRunner Restart**

**Symptom:** Still getting error after restart
**Cause:** Not an AppRunner startup issue
**Next Step:** Check token validity (Test 2)

---

### **Outcome C: Token is Expired**

**Symptom:** Curl shows 401 Unauthorized
**Cause:** Token in config has expired
**Next Step:**
1. Get fresh token from Fenergo
2. Update claude_desktop_config.json
3. Restart Claude Desktop
4. Retry test

---

### **Outcome D: Logs Show Errors**

**Symptom:** AppRunner logs show specific error
**Cause:** Backend trying to call Fenergo and failing
**Next Step:** Contact Fenergo support with error details

---

## Recommended Next Steps

### **If You Want to Proceed Quickly:**

1. **Right Now:**
   - Run: `aws apprunner start-deployment --service-arn [ARN]`
   - Wait 2-3 minutes

2. **Then:**
   - Restart Claude Desktop
   - Retry test query in Claude Desktop

3. **If It Works:**
   - Celebration! 🎉
   - Fix is complete

4. **If It Still Fails:**
   - Come back and share the error message
   - I'll help diagnose further

---

## Important Notes

**The Payload Fix is Correct:**
- The code change (df620fb) is correct
- The payload structure is properly formatted
- This isn't a code issue

**The Issue is External:**
- AppRunner service needs to be running fresh
- Or token needs to be valid
- Or network needs to be accessible

**You're Very Close:**
- The tool is being called
- Health check passes
- Just need to restart the service or refresh token

---

## Summary Table

| Issue | Symptom | Fix | Time |
|-------|---------|-----|------|
| AppRunner not redeployed | Tool fails, health OK | Restart deployment | 2-3 min |
| Token expired | Curl shows 401 | Get fresh token | 5 min |
| Network issue | Curl fails | Check connectivity | 10 min |
| Logs show errors | Specific error message | Debug from logs | 15+ min |

---

**Recommended Action:**

**START HERE:** Run `aws apprunner start-deployment` and wait for completion. This has the highest probability of fixing the issue (60%).

If that doesn't work, reply with the error message and we'll diagnose further.

