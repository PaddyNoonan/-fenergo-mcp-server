# Quick Debugging Checklist - "No Data Returned" Issue

Run through these checks in order to quickly identify and fix the problem.

---

## Check 1: AppRunner Service Status (1 minute)

**Is AppRunner running?**

```bash
aws apprunner describe-service \
  --service-arn arn:aws:apprunner:eu-west-1:ACCOUNT:service/fenergo-mcp-server/SERVICE_ID \
  --region eu-west-1 | grep Status
```

- [ ] Status shows `RUNNING` ✅
- [ ] Status shows anything else ❌ → **Go to FIX #1**

---

## Check 2: Health Endpoint (1 minute)

**Does AppRunner respond to health checks?**

```bash
curl https://brruyqnwu2.eu-west-1.awsapprunner.com/health
```

Expected response:
```json
{"status":"healthy"}
```

- [ ] Returns 200 OK ✅
- [ ] Returns error ❌ → **Go to FIX #2**

---

## Check 3: Token Validity (2 minutes)

**Is your Fenergo API token valid and not expired?**

1. Get token from config:
   ```bash
   grep FENERGO_API_TOKEN c:\Users\PNoonan\AppData\Roaming\Claude\claude_desktop_config.json
   ```

2. Test token against Fenergo:
   ```bash
   curl -H "Authorization: YOUR_TOKEN" \
     https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/health
   ```

- [ ] Returns 200 OK or 404 (endpoint exists) ✅
- [ ] Returns 401 Unauthorized ❌ → **Go to FIX #3**
- [ ] Returns 403 Forbidden ❌ → **Go to FIX #4**

---

## Check 4: Journey ID Validity (2 minutes)

**Does the journey exist?**

```bash
curl -X POST \
  https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights \
  -H "Authorization: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b" \
  -d '{"journeyId":"5a5caba1-623f-45c5-8e02-592fb6c4dc61"}'
```

- [ ] Returns data ✅
- [ ] Returns `{"result": "No data returned"}` ❌ → **Go to FIX #5**
- [ ] Returns 404 ❌ → **Go to FIX #6**

---

## Check 5: AppRunner Backend Logs (2 minutes)

**What's happening in the backend?**

```bash
aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow --limit 50
```

Look for:
- [ ] Request being received
- [ ] Backend attempting to call Fenergo
- [ ] Error messages
- [ ] Response being sent

If no logs → **Go to FIX #2** (backend not running)
If logs show errors → Note error message and fix accordingly

---

## Check 6: Direct AppRunner Call (2 minutes)

**Does AppRunner's /execute endpoint work?**

```bash
curl -X POST https://brruyqnwu2.eu-west-1.awsapprunner.com/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b" \
  -d '{"tool":"investigate_journey","parameters":{"journeyId":"5a5caba1-623f-45c5-8e02-592fb6c4dc61","query":"Documents","scope":"documents"}}'
```

Response:
- [ ] `{"result": "actual data"}` ✅
- [ ] `{"result": "No data returned"}` ❌ → **Backend not retrieving data**
- [ ] Error response ❌ → Check error details

---

## Fix #1: Start AppRunner Service

AppRunner service is not running.

```bash
# Start the service
aws apprunner start-service \
  --service-arn arn:aws:apprunner:eu-west-1:ACCOUNT:service/fenergo-mcp-server/SERVICE_ID \
  --region eu-west-1

# Wait 2-3 minutes for startup
# Then test health endpoint again
curl https://brruyqnwu2.eu-west-1.awsapprunner.com/health
```

**Expected:** Service starts and becomes healthy.

---

## Fix #2: Check AppRunner Container Health

Health check failing.

1. **Check Container Logs:**
   ```bash
   aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow
   ```

2. **Look For:**
   - Port 8080 not listening
   - Node.js startup errors
   - Missing dependencies

3. **If Port Issue:**
   - Verify Dockerfile exposes port 8080
   - Restart deployment:
     ```bash
     aws apprunner start-deployment --service-arn [ARN]
     ```

4. **If Dependency Issue:**
   - Verify package.json has all dependencies
   - Redeploy container:
     ```bash
     docker build -t fenergo-mcp-server:latest .
     docker push [ACCOUNT].dkr.ecr.eu-west-1.amazonaws.com/fenergo-mcp-server:latest
     aws apprunner start-deployment --service-arn [ARN]
     ```

---

## Fix #3: Token Expired - Get Fresh Token

Token is invalid or expired.

1. **Check Token Expiry:**
   ```bash
   TOKEN="YOUR_TOKEN"
   # Extract and decode
   echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.exp'
   ```

   Compare with current time (Unix timestamp):
   ```bash
   date +%s
   ```

2. **Get New Token:**
   - Contact Fenergo authentication service
   - Or use Fenergo Nebula UI to generate new token
   - Or ask your organization's administrator

3. **Update Token in AppRunner:**
   ```bash
   # Via AWS Console:
   # AppRunner → fenergo-mcp-server → Configuration → Environment Variables
   # Update FENERGO_API_TOKEN with new token
   # Click Save
   ```

4. **Restart Service:**
   ```bash
   aws apprunner start-deployment --service-arn [ARN]
   ```

---

## Fix #4: Missing Permissions - Request Access

Service account lacks permissions.

1. **Identify Service Account:**
   ```bash
   TOKEN="YOUR_TOKEN"
   echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.sub'  # Subject ID
   ```

2. **Contact Fenergo Administrator:**
   ```
   Subject: Request Elevated Permissions

   Service Account ID: [from step 1]
   Tenant ID: f488cdba-2122-448d-952c-7a2a47f78f1b

   Required Permissions:
   - insights:read
   - documents:read
   - requirements:read
   - journeys:read
   - Scope: fenx.all or equivalent
   ```

3. **Test After Permission Grant:**
   ```bash
   curl -X POST \
     https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -H "X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b" \
     -d '{"journeyId":"5a5caba1-623f-45c5-8e02-592fb6c4dc61"}'
   ```

---

## Fix #5: Journey Has No Documents

Journey exists but doesn't have documents.

1. **Verify Journey Status in Fenergo UI:**
   - Log into Fenergo Nebula
   - Search for journey: `5a5caba1-623f-45c5-8e02-592fb6c4dc61`
   - Check if journey is published/active
   - Check if documents are attached

2. **Try Different Journey:**
   - Ask for another known journey ID with documents
   - Test with that ID:
     ```bash
     curl -X POST https://brruyqnwu2.eu-west-1.awsapprunner.com/execute \
       -H "Authorization: Bearer YOUR_TOKEN" \
       -H "Content-Type: application/json" \
       -H "X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b" \
       -d '{"tool":"investigate_journey","parameters":{"journeyId":"DIFFERENT_ID","query":"Documents","scope":"documents"}}'
     ```

3. **If New Journey Works:**
   - Original journey simply has no documents
   - Either use different journey or add documents to this one

---

## Fix #6: Wrong API Endpoint

Fenergo API endpoint configuration is incorrect.

1. **Check Current Endpoint in AppRunner:**
   ```bash
   aws apprunner describe-service \
     --service-arn [ARN] \
     --region eu-west-1 | grep -A 20 "EnvironmentVariables"
   ```

   Should see:
   - `FENERGO_API_BASE_URL`: `https://api.fenxstable.com/documentmanagementquery/api/documentmanagement`
   - Or similar (base path without trailing `/`)

2. **Correct Endpoints:**
   - Base URL: `https://api.fenxstable.com/documentmanagementquery/api/documentmanagement`
   - Health: `/health`
   - Insights: `/insights`
   - Full URL: `https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights`

3. **Update if Incorrect:**
   - Via AWS Console → AppRunner → Environment Variables
   - Or via AWS CLI → update-service

4. **Restart:**
   ```bash
   aws apprunner start-deployment --service-arn [ARN]
   ```

---

## Fix #7: Backend Not Forwarding Requests

Backend is receiving requests but not calling Fenergo API.

1. **Check Backend Code:**
   - Is there actual code calling Fenergo API?
   - Is the endpoint configuration correct?
   - Are environment variables being read?

2. **Add Logging to Backend:**
   - Update backend.js to log:
     - Request received
     - Parameters extracted
     - Fenergo API call details
     - Response received
     - Error details

   ```javascript
   console.error(`[${new Date().toISOString()}] Received request:`, JSON.stringify(req.body));
   console.error(`[${new Date().toISOString()}] Calling Fenergo API...`);
   const response = await callFenergoAPI();
   console.error(`[${new Date().toISOString()}] Response:`, JSON.stringify(response));
   ```

3. **Redeploy with Logging:**
   ```bash
   # Update code, rebuild, push, restart
   docker build -t fenergo-mcp-server:latest .
   docker tag fenergo-mcp-server:latest [ACCOUNT].dkr.ecr.eu-west-1.amazonaws.com/fenergo-mcp-server:latest
   docker push [ACCOUNT].dkr.ecr.eu-west-1.amazonaws.com/fenergo-mcp-server:latest
   aws apprunner start-deployment --service-arn [ARN]
   ```

4. **Check Logs Again:**
   ```bash
   aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow
   ```

---

## Summary Table

| Check | Pass | Fail |
|-------|------|------|
| AppRunner Running | ✅ Continue | ❌ Fix #1 |
| Health Endpoint | ✅ Continue | ❌ Fix #2 |
| Token Valid | ✅ Continue | ❌ Fix #3 |
| Permissions OK | ✅ Continue | ❌ Fix #4 |
| Journey Exists | ✅ Continue | ❌ Fix #5 |
| Endpoint Correct | ✅ Continue | ❌ Fix #6 |
| Backend Forwards | ✅ Works! | ❌ Fix #7 |

---

## Testing After Each Fix

After applying a fix, always test:

```bash
# Quick test
curl -X POST https://brruyqnwu2.eu-west-1.awsapprunner.com/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b" \
  -d '{"tool":"investigate_journey","parameters":{"journeyId":"5a5caba1-623f-45c5-8e02-592fb6c4dc61","query":"Documents","scope":"documents"}}'

# Expected response (NOT "No data returned"):
# {"result":"<actual_document_data>","metadata":{...}}
```

---

## Still Stuck?

1. Check all 6 checks above
2. Review fix for your failed check
3. Check AppRunner logs: `aws logs tail /aws/apprunner/fenergo-mcp-server/service`
4. Contact Fenergo support with:
   - AppRunner service logs
   - curl request output (with `-v` flag)
   - What you've already tried

---

**Last Updated:** 2025-11-18
**Quick Reference:** Use this checklist to quickly diagnose "No data returned" issues
