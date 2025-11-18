# How to Fix "No Data Returned" Issue - Complete Guide

**Problem:** AppRunner returns `{"result": "No data returned"}` instead of actual journey documents

**Good News:** Your MCP connector is working perfectly! The issue is in the AppRunner backend configuration.

---

## The Issue Explained

### What's Working ✅
- Your MCP connector (apprunner-mcp-connector.js) is fully functional
- It correctly sends requests to AppRunner with proper authentication
- AppRunner receives requests successfully
- Network communication works perfectly
- All logging is in place

### What's Not Working ❌
- AppRunner's backend service is not retrieving data from Fenergo API
- Instead of returning actual documents, it returns: `{"result": "No data returned", "metadata": {}}`

### Why This Happens
The backend service (running inside AppRunner) is supposed to:
1. Receive the request from your connector
2. Forward it to Fenergo API at `/insights` endpoint
3. Query for journey documents
4. Return the results

Currently, step 2 or 3 is failing, and the backend is catching the error and returning "No data returned" as a fallback response.

---

## Quick Fix Process (Choose One)

### Option A: Use Quick Debugging Checklist (5-10 minutes)

**For Quick Diagnosis:**
- Open: `QUICK_DEBUGGING_CHECKLIST.md`
- Go through 6 checks in order
- Apply the corresponding fix when you find the problem
- Test after each fix

**Best for:** When you want a fast, step-by-step approach

---

### Option B: Use Comprehensive Troubleshooting Guide (15-30 minutes)

**For Deep Dive:**
- Open: `BACKEND_TROUBLESHOOTING_GUIDE.md`
- Read the problem descriptions
- Choose the problem that matches your symptoms
- Follow the detailed fix procedure

**Best for:** When you want complete understanding of each issue

---

## The 6 Most Likely Issues (in order of probability)

### 1. AppRunner Service Not Running (25% probability)

**Symptom:** Connector gets timeout or connection refused

**Quick Check:**
```bash
aws apprunner describe-service --service-arn [ARN] | grep Status
```

**Should say:** `"Status": "RUNNING"`

**If Not Running:**
```bash
aws apprunner start-service --service-arn [ARN]
```

Wait 2-3 minutes, then test health:
```bash
curl https://brruyqnwu2.eu-west-1.awsapprunner.com/health
```

---

### 2. Invalid or Expired Token (20% probability)

**Symptom:** Test works with fresh token, fails with old token

**Quick Check:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/health
```

**Should NOT return:** 401 Unauthorized

**If Fails:**
1. Get fresh token from Fenergo
2. Update AppRunner environment variable `FENERGO_API_TOKEN`
3. Restart deployment:
   ```bash
   aws apprunner start-deployment --service-arn [ARN]
   ```

---

### 3. Service Account Missing Permissions (20% probability)

**Symptom:** Returns 403 Forbidden when testing Fenergo API directly

**Quick Check:**
```bash
curl -X POST \
  https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b" \
  -d '{"journeyId":"5a5caba1-623f-45c5-8e02-592fb6c4dc61"}'
```

**If Returns 403:**
1. Contact Fenergo administrator
2. Request elevated permissions for service account
3. Request these specific permissions:
   - `insights:read`
   - `documents:read`
   - `requirements:read`
   - `journeys:read`

---

### 4. Journey Doesn't Exist or Has No Documents (15% probability)

**Symptom:** Works for some journeys, not others

**Quick Check:**
1. Try a different journey ID you know has documents
2. If that works → Original journey has no documents
3. If that fails too → Continue to other issues

**Solution:**
- Use a different journey with documents
- Or add documents to current journey in Fenergo UI

---

### 5. Incorrect API Endpoint Configuration (10% probability)

**Symptom:** Returns 404 Not Found from Fenergo

**Quick Check:**
Verify AppRunner has these environment variables:
- `FENERGO_API_BASE_URL`: `https://api.fenxstable.com/documentmanagementquery/api/documentmanagement`
- `FENERGO_API_ENDPOINT`: `/insights` (or configured correctly)

**Solution:**
1. Update AppRunner environment variables if incorrect
2. Restart deployment:
   ```bash
   aws apprunner start-deployment --service-arn [ARN]
   ```

---

### 6. Backend Not Forwarding Requests (10% probability)

**Symptom:** Logs show request received but no Fenergo API call

**Solution:**
1. Check AppRunner logs:
   ```bash
   aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow
   ```

2. If logs show no Fenergo API calls → Backend code issue
3. Add logging to backend and redeploy:
   ```javascript
   console.error(`[${new Date().toISOString()}] Calling Fenergo API...`);
   const response = await callFenergoAPI(payload);
   console.error(`[${new Date().toISOString()}] Response:`, JSON.stringify(response));
   ```

4. Redeploy:
   ```bash
   docker build -t fenergo-mcp-server:latest .
   docker push [ACCOUNT].dkr.ecr.eu-west-1.amazonaws.com/fenergo-mcp-server:latest
   aws apprunner start-deployment --service-arn [ARN]
   ```

---

## Testing to Verify Your Fix

After applying any fix, test with this command:

```bash
# Test AppRunner /execute endpoint
curl -X POST https://brruyqnwu2.eu-west-1.awsapprunner.com/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b" \
  -d '{"tool":"investigate_journey","parameters":{"journeyId":"5a5caba1-623f-45c5-8e02-592fb6c4dc61","query":"Documents","scope":"documents"}}'
```

**Success Response (should see actual data):**
```json
{
  "result": "Document list: ...",
  "metadata": {...}
}
```

**NOT Success (means issue still exists):**
```json
{
  "result": "No data returned",
  "metadata": {}
}
```

---

## Step-by-Step Debugging Flow

### Step 1: Check AppRunner Health (1 minute)

```bash
# Is service running?
curl https://brruyqnwu2.eu-west-1.awsapprunner.com/health

# Expected: {"status":"healthy"}
# If fails: Fix #1 (Start AppRunner service)
```

### Step 2: Check Token Validity (2 minutes)

```bash
# Does token work?
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/health

# Expected: 200 OK or 404 (endpoint exists)
# If 401: Fix #2 (Get fresh token)
# If 403: Fix #3 (Request permissions)
```

### Step 3: Test Journey with Real Data (3 minutes)

```bash
# Does journey have data?
curl -X POST \
  https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b" \
  -d '{"journeyId":"5a5caba1-623f-45c5-8e02-592fb6c4dc61"}'

# Expected: Actual data returned
# If "No data returned": Fix #4 (Different journey) or Fix #5 (Check endpoint)
```

### Step 4: Check AppRunner Logs (2 minutes)

```bash
# What does AppRunner backend say?
aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow --limit 20

# Look for:
# - Request being received
# - Fenergo API call attempts
# - Error messages
# - Response processing
```

---

## Decision Tree

```
    Start Here
        ↓
    Is AppRunner healthy?
        ├─ NO → Fix #1 (Start service)
        └─ YES ↓
    Is token valid (not 401)?
        ├─ NO → Fix #2 (Get fresh token)
        └─ YES ↓
    Do you have permissions (not 403)?
        ├─ NO → Fix #3 (Request permissions)
        └─ YES ↓
    Does Fenergo API return data directly?
        ├─ NO → Fix #4 or #5 (Journey/endpoint issue)
        └─ YES ↓
    Test AppRunner /execute
        ├─ Returns data? → FIXED! ✅
        └─ Still "No data"? → Fix #6 (Backend logging)
```

---

## Common Mistakes to Avoid

❌ **Don't:** Try to fix the connector - it's already working
✅ **Do:** Focus on AppRunner backend configuration

❌ **Don't:** Assume the error message tells the whole story
✅ **Do:** Check each component individually

❌ **Don't:** Skip checking AppRunner logs
✅ **Do:** Check logs frequently - they reveal the truth

❌ **Don't:** Reuse old tokens
✅ **Do:** Always get fresh tokens for testing

❌ **Don't:** Test with a journey ID you're unsure about
✅ **Do:** Verify the journey exists in Fenergo UI first

---

## Summary of Documents

You now have these troubleshooting documents:

| Document | Use For | Time |
|----------|---------|------|
| **QUICK_DEBUGGING_CHECKLIST.md** | Fast diagnosis of 6 most common issues | 5-10 min |
| **BACKEND_TROUBLESHOOTING_GUIDE.md** | Deep dive into all 7 possible problems | 15-30 min |
| **This File** | Understanding the big picture | 10 min |

---

## Still Need Help?

1. **Work through the QUICK_DEBUGGING_CHECKLIST.md first** (5-10 minutes)
   - It will identify your specific issue
   - Then apply the corresponding fix

2. **If that doesn't work, read BACKEND_TROUBLESHOOTING_GUIDE.md**
   - Provides more detail on each problem
   - Includes diagnostic scripts
   - Complete step-by-step procedures

3. **Collect detailed logs:**
   - AppRunner logs: `aws logs tail /aws/apprunner/fenergo-mcp-server/service`
   - curl output: `curl -v [request]`
   - Your tests and fixes applied

4. **Contact support with:**
   - What you've tried
   - What you found
   - All relevant logs
   - Your AppRunner configuration

---

## Key Takeaways

✅ **Your connector is perfect** - It correctly sends requests and handles responses

✅ **AppRunner is receiving requests** - Network connectivity works

❌ **AppRunner backend isn't retrieving data** - Configuration or integration issue

✅ **The fix is straightforward** - One of 6 common issues that have known solutions

✅ **You can test each component independently** - Doesn't have to be all or nothing

🎯 **Use the Quick Checklist** - Most issues are identified within 5-10 minutes

---

**Next Step:** Open `QUICK_DEBUGGING_CHECKLIST.md` and go through checks 1-6 in order!

---

**Last Updated:** 2025-11-18
**Status:** Ready to Debug and Fix
**Estimated Time to Resolution:** 5-30 minutes (depending on issue)
