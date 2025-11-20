# AppRunner Auto-Deployment Issue

## Problem

AppRunner is NOT automatically redeploying the code changes, even though:
- ✅ Code was committed and pushed to GitHub
- ✅ Dockerfile was updated to trigger rebuild
- ✅ package.json start script was changed to run `apprunner-backend.js`

## Evidence

When testing the endpoints:

**Current Response (Old Code Running):**
```json
{"endpoints":{"health":"/health","tools":"/tools","execute":"/execute","updateToken":"/update-token"}}
```

**Expected Response (New Code Should Run):**
```json
{"endpoints":{"health":"/health","authenticate":"/authenticate","execute":"/execute"}}
```

The new `/authenticate` endpoint is **NOT** available, which means AppRunner is still running the old `chatgpt-mcp-server.js` or `apprunner-mcp-connector.js` code, not the new `apprunner-backend.js` code.

## Root Cause

AppRunner's auto-deployment from GitHub Source might:
1. Not be enabled for this service
2. Not be detecting changes properly
3. Be taking an extremely long time (> 10 minutes)
4. Have failed silently without notification

## Solution: Manual AppRunner Redeployment

Since auto-deployment isn't working, you'll need to manually trigger a redeployment:

### Option 1: Force Redeploy via AWS Console (Recommended)

1. Go to **AWS AppRunner Console**
   - https://eu-west-1.console.aws.amazon.com/apprunner

2. Click your service: `fenergo-mcp-server`

3. Click **Deployments** tab

4. Look for a **"Redeploy Latest"** button or similar
   - If you see "Start Deployment" or "Deploy" button, click it

5. Click to deploy the latest source
   - This will pull the latest code from GitHub and rebuild

6. Wait 3-5 minutes for deployment to complete
   - Status will show "Operation in progress" then "Running"

### Option 2: Manual Docker Build & Push (Advanced)

If Option 1 doesn't work, you can:

1. Build locally:
   ```bash
   docker build -t fenergo-apprunner:latest .
   ```

2. Push to ECR (if AppRunner is configured with ECR)
   ```bash
   aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin [YOUR_ECR_URI]
   docker tag fenergo-apprunner:latest [YOUR_ECR_URI]/fenergo-apprunner:latest
   docker push [YOUR_ECR_URI]/fenergo-apprunner:latest
   ```

3. Trigger AppRunner to pull and deploy from ECR

## Verification After Redeployment

Once AppRunner redeploys, test to verify the new code is running:

```bash
# Test /authenticate endpoint exists
curl -X POST https://brruyqnwu2.eu-west-1.awsapprunner.com/authenticate \
  -H "Content-Type: application/json" \
  -d '{"username":"test@test.com","password":"test","tenantId":"test"}'

# Should return:
# {"error":"Authentication failed",...}  (endpoint exists, auth failed as expected)

# NOT:
# {"error":"Not found"}  (endpoint doesn't exist)
```

OR check root endpoint:

```bash
curl https://brruyqnwu2.eu-west-1.awsapprunner.com/

# Should return something with "authenticate" in endpoints (or at least new format)
```

## What Was Changed

### Commit cd811e3
- Changed `package.json` start script from `chatgpt-mcp-server.js` to `apprunner-backend.js`
- This should run the OAuth-enabled backend with `/authenticate` endpoint

### Commit cfceac7
- Updated Dockerfile comment to force AppRunner rebuild
- AppRunner watches Dockerfile for changes to trigger auto-deployment

## Recommended Next Steps

1. **Use AWS Console to manually trigger redeployment** (Option 1 above)
2. Wait 3-5 minutes for deployment to complete
3. Test `/authenticate` endpoint
4. If it works, proceed with OAuth testing

## FAQ

**Q: Why isn't auto-deployment working?**
A: AppRunner source-based deployment may be:
- Disabled in the service configuration
- Not configured to watch GitHub properly
- Taking an extremely long time
- Failed silently

**Q: How do I enable auto-deployment?**
A: In AppRunner service configuration:
1. Look for "Source deployment" or "Deployment settings"
2. Enable "Automatic deployment on source updates"
3. Ensure GitHub connection is still active

**Q: How long should redeployment take?**
A: Typically 3-5 minutes from when you manually trigger it

**Q: Will manual redeployment affect the running service?**
A: Yes, there will be 1-2 minutes of downtime while AppRunner rebuilds and restarts

