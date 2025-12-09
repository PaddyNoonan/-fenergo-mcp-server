# Deploy Updated AppRunner Backend

## Changes Committed
**Commit:** `349299e` - "fix: implement tenant-based token caching for AppRunner /execute endpoint"

**Files Changed:**
- `claude-fenergo-mcp.js` - Route requests through AppRunner instead of calling Fenergo directly
- `apprunner-backend.js` - Cache and retrieve tokens by tenant ID

## Deployment Steps

### Option 1: Check for Auto-Deploy (Fastest)

1. **Open AWS Console** → **App Runner** → Region: `eu-west-1`
2. **Find service:** `mcp-fenergo-insights`
3. **Check deployments tab:**
   - If you see a deployment in progress with commit `349299e`, wait for it to complete
   - If auto-deploy is configured with GitHub, it may have already triggered

### Option 2: Manual Deployment via AWS Console

1. **Go to AWS Console** → **App Runner** → `eu-west-1` region
2. **Click on:** `mcp-fenergo-insights` service
3. **Click:** "Deploy" or "Start deployment" button (top right)
4. **Wait for deployment:** Status will show "Operation in progress"
5. **Monitor logs:** Click "Logs" tab to see deployment progress

### Option 3: Redeploy from Source

If manual deploy doesn't work:

1. **AWS Console** → **App Runner** → `mcp-fenergo-insights`
2. **Actions** → **Update service**
3. **Source:** Confirm it's connected to your GitHub repository
4. **Branch:** Confirm it's pointing to `main`
5. **Click:** "Next" through all screens
6. **Click:** "Update service"

## Verify Deployment

### 1. Check Service Status
```
Service Status: Running
Last Deployment: Should show commit 349299e
Deployment Time: Check timestamp is recent
```

### 2. Check Logs
**AWS Console** → **App Runner** → `mcp-fenergo-insights` → **Logs** tab

Look for recent log entries showing:
- Service startup messages
- "Tenant token mapping stored for tenant: f488cdba-2122-448d-952c-7a2a47f78f1b"
- No error messages about missing dependencies

### 3. Health Check
The service should respond at: `https://tc8srxrkcp.eu-west-1.awsapprunner.com/`

## Test the Complete Flow

After deployment completes, test in Claude Desktop:

### Step 1: Restart Claude Desktop
Close and reopen Claude Desktop to reload the MCP server with latest code.

### Step 2: Authenticate
In Claude Desktop chat, say:
```
I need to authenticate with SSO for tenant f488cdba-2122-448d-952c-7a2a47f78f1b
```

You should receive:
- SSO authentication links
- Complete the browser authentication
- Token should be cached in AppRunner

### Step 3: Query Journey Documents
In Claude Desktop chat, say:
```
Can you tell me about documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61?
```

**Expected Result:**
```
✅ Natural language response about journey documents
```

**NOT:**
```
❌ Error: API request failed with status 401
❌ Error: API request failed with status 500
```

## Troubleshooting

### If deployment fails:
1. **Check CloudWatch Logs:** `/aws/apprunner/mcp-fenergo-insights/service`
2. **Look for:** Build errors, missing dependencies, syntax errors

### If authentication fails:
1. **Check MCP client logs** in Claude Desktop (View → Developer → MCP Logs)
2. **Verify config:** `C:\Users\PNoonan\AppData\Roaming\Claude\claude_desktop_config.json`
3. **Restart Claude Desktop** to reload MCP server

### If API calls fail with 401:
1. **Check AppRunner logs** for "Tenant token mapping stored" messages
2. **Verify token caching** - look for "Using cached SSO token for tenant"
3. **Try authenticating again** - token may have expired

### If API calls fail with 403:
This should NOT happen anymore - the authorization fix was deployed.
If you see 403, the controller-level authorization for `mcp-client` may not be active.

## Architecture Flow (After Fix)

```
Claude Desktop
    ↓
MCP Client (claude-fenergo-mcp.js)
    ↓ [POST /execute with X-Tenant-Id header]
AppRunner Backend (apprunner-backend.js)
    ↓ [Retrieves cached token for tenant]
    ↓ [Adds Bearer token to Authorization header]
Fenergo Nebula API
    ↓ [Returns document insights]
    ↑
AppRunner Backend
    ↑
MCP Client
    ↑
Claude Desktop (shows response)
```

## Key Changes Deployed

### 1. Token Storage (apprunner-backend.js:418-424, 531-537)
```javascript
// Store tenant → token mapping for easy lookup
sessionStore.set(`tenant_${tenantId}`, {
  accessToken: tokenResponse.accessToken,
  expiresAt: Date.now() + (tokenResponse.expiresIn * 1000),
  timestamp: Date.now()
});
```

### 2. Token Retrieval (apprunner-backend.js:681-712)
```javascript
// Retrieve cached SSO token for this tenant
const tenantKey = `tenant_${tenantId}`;
const cachedToken = sessionStore.get(tenantKey);

if (cachedToken && cachedToken.expiresAt > Date.now()) {
  authHeader = `Bearer ${cachedToken.accessToken}`;
  console.error(`Using cached SSO token for tenant ${tenantId}`);
}
```

### 3. MCP Client Routing (claude-fenergo-mcp.js:290-310)
```javascript
// Route through AppRunner backend which has the authenticated token
const apiUrl = `${this.config.appRunnerUrl}/execute`;
const response = await this.makeAppRunnerRequest(apiUrl, 'POST', payload);
```

## Success Criteria

✅ AppRunner deployment shows commit `349299e`
✅ Service status is "Running"
✅ Authentication in Claude Desktop returns token
✅ Journey query returns AI insights (not 401/500 error)
✅ Logs show "Using cached SSO token for tenant"

## Contact Info

If deployment fails or you need help:
- **AppRunner Service:** `mcp-fenergo-insights`
- **Region:** `eu-west-1`
- **Service URL:** `https://tc8srxrkcp.eu-west-1.awsapprunner.com`
- **GitHub Repo:** (your repository)
- **Latest Commit:** `349299e`
# Trigger deployment
