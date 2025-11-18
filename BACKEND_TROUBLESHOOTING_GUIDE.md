# AppRunner Backend Data Retrieval - Troubleshooting & Fix Guide

**Problem:** AppRunner backend returns `{"result": "No data returned", "metadata": {}}` instead of actual journey documents

**Root Cause:** AppRunner backend is not properly retrieving data from Fenergo API

**Status:** This is a backend configuration/integration issue, NOT a connector issue

---

## Quick Diagnosis Checklist

Before diving into fixes, verify these items:

- [ ] Is AppRunner backend service running?
- [ ] Does AppRunner have correct Fenergo API endpoint URL?
- [ ] Does AppRunner have valid Fenergo API credentials?
- [ ] Does the service account have required permissions?
- [ ] Is the journey ID correct and exists in the system?
- [ ] Are there any errors in AppRunner backend logs?
- [ ] Is network connectivity working between AppRunner and Fenergo API?

---

## Problem #1: AppRunner Backend Not Running

### Symptoms
- Timeouts when calling AppRunner
- Connection refused errors
- No response from /execute endpoint

### How to Check

**Via AWS Console:**
1. Go to AWS AppRunner
2. Find service: `fenergo-mcp-server`
3. Check Status: Should be "RUNNING" (green)
4. Check Last Deployment: Should be recent

**Via AWS CLI:**
```bash
aws apprunner describe-service \
  --service-arn arn:aws:apprunner:eu-west-1:ACCOUNT:service/fenergo-mcp-server/SERVICE_ID \
  --region eu-west-1
```

Look for:
- `Status: "RUNNING"` ✅
- `HealthCheckConfiguration` is healthy
- No error messages

### How to Fix

**If Status is INACTIVE:**
```bash
aws apprunner start-service \
  --service-arn arn:aws:apprunner:eu-west-1:ACCOUNT:service/fenergo-mcp-server/SERVICE_ID \
  --region eu-west-1
```

**If Health Check Failed:**
1. Check CloudWatch logs for errors
2. Verify port 8080 is exposed in Dockerfile
3. Verify `/health` endpoint returns 200 OK
4. Check container startup logs

---

## Problem #2: Missing or Invalid Fenergo API Credentials

### Symptoms
- Backend returns 401 Unauthorized when calling Fenergo API
- Backend silently fails and returns "No data returned"
- Token is expired or invalid

### How to Check

**Verify Token in AppRunner Config:**

Check the environment variable `FENERGO_API_TOKEN` in AppRunner:

```bash
aws apprunner describe-service \
  --service-arn arn:aws:apprunner:eu-west-1:ACCOUNT:service/fenergo-mcp-server/SERVICE_ID \
  --region eu-west-1 \
  --query 'Service.SourceConfiguration.ImageRepository.ImageConfiguration.RuntimeEnvironmentVariables'
```

**Check Token Expiry:**

If you have the token, decode it:
```bash
# Extract the payload (middle part between dots)
TOKEN="eyJhbGci..."
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2)
# Decode base64
echo $PAYLOAD | base64 -d | jq '.'
```

Look for `exp` field - should be a future timestamp.

**Test Token Directly:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/health
```

Should return HTTP 200 (or 404 if endpoint doesn't exist), NOT 401.

### How to Fix

**Step 1: Get a Fresh Token**
```bash
# Contact your organization for a fresh Fenergo API token
# Or generate new token via Fenergo authentication service
```

**Step 2: Update AppRunner Environment Variable**

Via AWS Console:
1. Go to AppRunner service
2. Configuration → Environment variables
3. Update `FENERGO_API_TOKEN` with new token
4. Click Save

Via AWS CLI:
```bash
aws apprunner update-service \
  --service-arn arn:aws:apprunner:eu-west-1:ACCOUNT:service/fenergo-mcp-server/SERVICE_ID \
  --instance-configuration Cpu=1024,Memory=2048 \
  --region eu-west-1
```

Then restart the service:
```bash
aws apprunner start-deployment \
  --service-arn arn:aws:apprunner:eu-west-1:ACCOUNT:service/fenergo-mcp-server/SERVICE_ID \
  --region eu-west-1
```

---

## Problem #3: Incorrect Fenergo API Endpoint

### Symptoms
- 404 Not Found errors
- 400 Bad Request errors
- "Endpoint does not exist" errors

### How to Check

**Current Configuration:**

Look for these environment variables in AppRunner:
- `FENERGO_API_BASE_URL`
- `FENERGO_API_ENDPOINT`

**Test the Endpoint:**

```bash
# This is what AppRunner backend should call
curl -v -X POST \
  https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"tool":"investigate_journey","parameters":{"journeyId":"5a5caba1-623f-45c5-8e02-592fb6c4dc61","query":"Documents","scope":"documents"}}}'
```

Should return:
- HTTP 200 or 400 (valid endpoints)
- NOT 404 (endpoint doesn't exist)
- NOT 401 (invalid token)

### How to Fix

**Verify Correct Endpoint URL:**

The correct Fenergo endpoint should be:
```
https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights
```

**Update AppRunner Configuration:**

Via AWS Console:
1. Go to AppRunner service
2. Configuration → Environment variables
3. Verify `FENERGO_API_BASE_URL`:
   ```
   https://api.fenxstable.com/documentmanagementquery/api/documentmanagement
   ```
4. Verify `FENERGO_API_ENDPOINT`:
   ```
   /insights
   ```

---

## Problem #4: Service Account Lacks Permissions

### Symptoms
- 403 Forbidden errors from Fenergo API
- Specific journeys return "No data found"
- Only some journeys work, others don't

### How to Check

**Test with Direct Curl Request:**

```bash
curl -v -X POST \
  https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights \
  -H "Authorization: Bearer YOUR_SERVICE_ACCOUNT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b" \
  -d '{"journeyId":"5a5caba1-623f-45c5-8e02-592fb6c4dc61","query":"Documents","scope":"documents"}'
```

If response is:
- `403 Forbidden` → Permission issue ❌
- `401 Unauthorized` → Token issue ❌
- `400 Bad Request` → Payload issue
- `200 OK` → But no data → Data access issue

### How to Fix

**Request Elevated Permissions:**

1. Contact Fenergo administrator
2. Request that the service account be granted:
   - `fenx:all` scope (or specific scopes)
   - Permission to access journey documents
   - Permission to access journey requirements
   - Permission to query insights endpoint
3. Provide them the service account ID

**Example Permission Request:**

```
Service Account ID: [from token 'sub' field]
Required Permissions:
- insights:read
- documents:read
- requirements:read
- journeys:read
Tenant ID: f488cdba-2122-448d-952c-7a2a47f78f1b
```

---

## Problem #5: Journey Data Doesn't Exist or Isn't Accessible

### Symptoms
- Specific journey IDs always return "No data"
- Other journey IDs work fine
- Timeouts when querying certain journeys

### How to Check

**Test with Different Journey IDs:**

Ask for other known journey IDs and test:
```bash
curl -X POST \
  https://brruyqnwu2.eu-west-1.awsapprunner.com/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b" \
  -d '{"tool":"investigate_journey","parameters":{"journeyId":"DIFFERENT_JOURNEY_ID","query":"Documents","scope":"documents"}}'
```

If some journeys return data → Original journey ID issue
If all journeys return "No data" → Backend configuration issue

**Verify Journey Exists in Fenergo:**

1. Log into Fenergo Nebula UI
2. Search for journey: `5a5caba1-623f-45c5-8e02-592fb6c4dc61`
3. If not found → Journey doesn't exist
4. If found but no documents → Journey exists but has no documents

### How to Fix

**If Journey Doesn't Exist:**
- Use a different, known journey ID
- Create a test journey with documents
- Verify journey ID format is correct (GUID)

**If Journey Exists But No Documents:**
- Journey may be in draft state
- Documents may not be attached to journey
- Check journey status in Fenergo UI
- Add test documents to journey

---

## Problem #6: Backend Not Forwarding Requests Properly

### Symptoms
- Connector sends valid request
- AppRunner receives request (we see it)
- But returns "No data returned"
- No errors in logs

### How to Check

**Check AppRunner Logs:**

```bash
aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow
```

Look for:
1. Request being received
2. Backend parsing payload
3. Backend calling Fenergo API
4. Fenergo API response
5. Backend error handling

**If Logs Show Nothing:**
- Backend may not be logging
- Backend may be crashing silently
- Check container startup logs

### How to Fix

**Add Enhanced Logging to Backend:**

If you have access to AppRunner backend code:

```javascript
// Add detailed logging to backend.js
console.log(`[${new Date().toISOString()}] Received request:`, JSON.stringify(req.body, null, 2));

try {
  const response = await callFenergoAPI(payload);
  console.log(`[${new Date().toISOString()}] Fenergo response:`, JSON.stringify(response, null, 2));
  return response;
} catch (error) {
  console.error(`[${new Date().toISOString()}] ERROR:`, error.message);
  console.error(`[${new Date().toISOString()}] Stack:`, error.stack);
  return { result: 'No data returned', metadata: { error: error.message } };
}
```

**Redeploy with Updated Logging:**

```bash
docker build -t fenergo-mcp-server:latest .
docker tag fenergo-mcp-server:latest [ACCOUNT].dkr.ecr.eu-west-1.amazonaws.com/fenergo-mcp-server:latest
docker push [ACCOUNT].dkr.ecr.eu-west-1.amazonaws.com/fenergo-mcp-server:latest
aws apprunner start-deployment --service-arn [SERVICE_ARN]
```

---

## Complete Diagnostic Test

Run this script to diagnose all potential issues:

```bash
#!/bin/bash

echo "=== AppRunner Connector Diagnostic Test ==="
echo ""

# Variables
TOKEN="Bearer YOUR_TOKEN_HERE"
TENANT_ID="f488cdba-2122-448d-952c-7a2a47f78f1b"
APPRUNNER_URL="https://brruyqnwu2.eu-west-1.awsapprunner.com"
FENERGO_URL="https://api.fenxstable.com/documentmanagementquery/api/documentmanagement"
JOURNEY_ID="5a5caba1-623f-45c5-8e02-592fb6c4dc61"

echo "1. Test AppRunner Health"
echo "========================"
curl -v ${APPRUNNER_URL}/health 2>&1 | grep "HTTP"
echo ""

echo "2. Test AppRunner Tools"
echo "========================"
curl -v ${APPRUNNER_URL}/tools 2>&1 | head -20
echo ""

echo "3. Test AppRunner /execute with investigate_journey"
echo "====================================================="
curl -v -X POST ${APPRUNNER_URL}/execute \
  -H "Authorization: ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -d "{\"tool\":\"investigate_journey\",\"parameters\":{\"journeyId\":\"${JOURNEY_ID}\",\"query\":\"Documents\",\"scope\":\"documents\"}}" 2>&1
echo ""

echo "4. Test Fenergo API Token Validity"
echo "==================================="
curl -v -H "Authorization: ${TOKEN}" \
  ${FENERGO_URL}/health 2>&1 | grep "HTTP"
echo ""

echo "5. Test Fenergo /insights Endpoint"
echo "==================================="
curl -v -X POST ${FENERGO_URL}/insights \
  -H "Authorization: ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -d "{\"journeyId\":\"${JOURNEY_ID}\",\"query\":\"Documents\",\"scope\":\"documents\"}" 2>&1
echo ""

echo "Diagnostic test complete."
```

---

## Step-by-Step Fix Procedure

### Phase 1: Verify Basics (5 minutes)

1. **Check AppRunner is Running**
   ```bash
   aws apprunner describe-service --service-arn [ARN] --region eu-west-1 | grep Status
   ```
   Expected: `"Status": "RUNNING"`

2. **Check AppRunner is Healthy**
   ```bash
   curl https://brruyqnwu2.eu-west-1.awsapprunner.com/health
   ```
   Expected: `{"status":"healthy"}`

3. **Check Token is Valid**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/health
   ```
   Expected: Not 401 Unauthorized

### Phase 2: Test Direct API Call (5 minutes)

4. **Test Fenergo API Directly**
   ```bash
   curl -X POST \
     https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -H "X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b" \
     -d '{"journeyId":"5a5caba1-623f-45c5-8e02-592fb6c4dc61","query":"Documents","scope":"documents"}'
   ```
   - If works → Fenergo is OK, AppRunner backend issue
   - If fails → Fenergo issue or credentials issue

### Phase 3: Check AppRunner Logs (5 minutes)

5. **View AppRunner Logs**
   ```bash
   aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow
   ```
   Look for:
   - Request received messages
   - Fenergo API call attempts
   - Error messages
   - Response processing

### Phase 4: Fix Issues (10-30 minutes depending on issue)

Based on findings from Phase 1-3, apply appropriate fix from above sections.

### Phase 5: Verify Fix (5 minutes)

6. **Test with MCP Connector**
   ```bash
   curl -X POST https://brruyqnwu2.eu-west-1.awsapprunner.com/execute \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -H "X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b" \
     -d '{"tool":"investigate_journey","parameters":{"journeyId":"5a5caba1-623f-45c5-8e02-592fb6c4dc61","query":"Documents","scope":"documents"}}'
   ```
   Expected: `{"result": "<actual_data>", "metadata": {...}}` NOT "No data returned"

---

## Common Error Messages & Fixes

### Error: "Unauthorized"
**Cause:** Invalid or expired token
**Fix:** Get fresh token from Fenergo, update AppRunner env variable

### Error: "Forbidden"
**Cause:** Token valid but account lacks permissions
**Fix:** Request elevated permissions from Fenergo admin

### Error: "Not Found" or 404
**Cause:** Wrong endpoint URL
**Fix:** Verify endpoint is `/insights` not `/execute` for Fenergo API

### Error: "Bad Request"
**Cause:** Invalid request payload
**Fix:** Check JSON structure matches Fenergo API spec

### Error: "Timeout"
**Cause:** Service not responding
**Fix:** Verify network connectivity, check service logs

### Result: "No data returned"
**Cause:** Multiple possibilities (see checklist above)
**Fix:** Follow diagnostic test procedure

---

## Summary

| Issue | Symptom | Fix |
|-------|---------|-----|
| Backend not running | Connection refused | Start AppRunner service |
| Invalid credentials | 401 Unauthorized | Get fresh token |
| Wrong endpoint | 404 Not Found | Update to /insights endpoint |
| Missing permissions | 403 Forbidden | Request elevated permissions |
| Journey doesn't exist | Returns no data for specific ID | Use different journey ID |
| Payload format wrong | 400 Bad Request | Check JSON structure |
| Network issue | Timeout | Check connectivity, VPC rules |

---

## Need Help?

If issue persists after following this guide:

1. **Collect All Logs:**
   - AppRunner container logs
   - CloudWatch logs
   - curl request logs (with -v flag)

2. **Document the Issue:**
   - What specific request fails
   - What error response you get
   - What you've already tried

3. **Contact Support:**
   - Fenergo API team for backend issues
   - AWS AppRunner team for deployment issues
   - Your organization's API administrator

---

**Last Updated:** 2025-11-18
**Status:** Work in Progress - Follow steps to diagnose and fix backend data retrieval
