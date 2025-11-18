# Ready to Deploy - AppRunner Backend Setup

## Status: ✅ COMPLETE

Your AppRunner backend service is ready to deploy. All components are in place and properly configured.

## What You Have

### 1. Backend Service (`apprunner-backend.js`)
- Express.js server running on port 8080
- `/health` endpoint for health checks
- `/execute` endpoint that:
  - Accepts the exact payload structure you specified
  - Calls Fenergo insights API at `https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights`
  - Returns results back to the MCP connector

### 2. MCP Connector (`apprunner-mcp-connector.js`)
- Runs on Claude Desktop as stdio MCP server
- Provides `investigate_journey` tool
- Builds correct payload structure
- Calls AppRunner `/execute` endpoint
- Handles retries and error cases

### 3. Docker Configuration (`Dockerfile`)
- Node.js 18 base image
- Installs dependencies from package.json
- Runs apprunner-backend.js on startup
- Exposes port 8080

### 4. Documentation
- `APPRUNNER_SETUP.md` - Complete setup and deployment guide

## Payload Flow

Your request → MCP Connector → AppRunner Backend → Fenergo API

**Payload Structure (Confirmed):**
```json
{
  "data": {
    "message": "Give me information on documents",
    "scope": {
      "documentContext": {
        "contextLevel": "Journey",
        "contextId": "5a5caba1-623f-45c5-8e02-592fb6c4dc61"
      },
      "documentRequirementContext": {
        "contextLevel": "Journey",
        "contextId": "5a5caba1-623f-45c5-8e02-592fb6c4dc61"
      }
    },
    "conversationHistory": []
  }
}
```

## Next Steps

### Step 1: Build Docker Image
```bash
cd c:\Users\PNoonan\OneDrive\ -\ Fenergo\Desktop\MCPTest
docker build -t fenergo-apprunner:latest .
```

### Step 2: Push to Docker Registry
Push to your ECR, Docker Hub, or other registry that AppRunner can access.

### Step 3: Deploy to AppRunner
1. Go to AWS AppRunner console
2. Create or update service with the Docker image
3. Set environment variables:
   - `FENERGO_API_TOKEN` = Your Bearer token
   - `FENERGO_TENANT_ID` = f488cdba-2122-448d-952c-7a2a47f78f1b
   - `PORT` = 8080 (optional, defaults to 8080)
4. Deploy

### Step 4: Test Health Endpoint
```bash
curl https://your-apprunner-service.awsapprunner.com/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T...",
  "service": "apprunner-backend"
}
```

### Step 5: Update Claude Desktop Config
Update `~\AppData\Roaming\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fenergo-apprunner": {
      "command": "node",
      "args": ["c:\\path\\to\\apprunner-mcp-connector.js"],
      "env": {
        "APPRUNNER_URL": "https://your-apprunner-service.awsapprunner.com",
        "FENERGO_API_TOKEN": "Bearer eyJhbGci...",
        "FENERGO_TENANT_ID": "f488cdba-2122-448d-952c-7a2a47f78f1b"
      }
    }
  }
}
```

### Step 6: Test with Claude
1. Restart Claude Desktop
2. Ask: "Can you tell me information on Documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
3. Should get actual documents back

## How It Works

```
Claude Desktop
    ↓ (your query)
apprunner-mcp-connector.js
    ↓ (parses query, extracts journeyId)
    ├─ Builds payload with data wrapper
    ├─ Sets message, scope, conversationHistory
    └─ POSTs to AppRunner /execute
        ↓
AppRunner Backend (apprunner-backend.js)
    ↓ (receives payload)
    ├─ Validates payload structure
    ├─ Extracts message and scope
    └─ POSTs to Fenergo API
        ↓
Fenergo Insights API
    ↓ (processes request)
    └─ Returns documents/requirements
        ↓
Response flows back through the chain
    ↓
Claude displays results to user
```

## Key Points

✅ **Payload Format:** Exact structure you specified
✅ **Fenergo Endpoint:** `https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights`
✅ **Scopes Supported:** documentContext and documentRequirementContext
✅ **Error Handling:** Retries on network errors, logs all requests
✅ **Health Checks:** `/health` endpoint for monitoring
✅ **Environment Variables:** All configured correctly

## Troubleshooting Reference

| Issue | Check |
|-------|-------|
| AppRunner won't start | Check Dockerfile syntax, Docker build logs |
| Health endpoint fails | Verify port 8080, check CloudWatch logs |
| Execute endpoint 400 error | Verify payload has `data` field with correct structure |
| Execute endpoint 500 error | Check FENERGO_API_TOKEN and FENERGO_TENANT_ID |
| Fenergo API 401/403 | Token expired, get fresh token from Fenergo |
| Fenergo API other error | Check AppRunner logs for API response details |

## Files Summary

```
├── apprunner-backend.js          ← AppRunner service (Express)
├── apprunner-mcp-connector.js    ← MCP connector for Claude
├── Dockerfile                     ← Docker build config
├── package.json                   ← Node dependencies
├── package-lock.json              ← Dependency lock file
├── claude-fenergo-mcp.js          ← Direct Fenergo connector (optional)
└── APPRUNNER_SETUP.md            ← Detailed setup guide
```

## Configuration Summary

**AppRunner (Backend):**
- Service: `apprunner-backend.js`
- Port: 8080
- Fenergo Endpoint: `https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights`
- Auth: Bearer token from environment variable

**Claude Desktop (MCP Connector):**
- Service: `apprunner-mcp-connector.js`
- Transport: stdio
- Tool: `investigate_journey`
- AppRunner URL: Your AppRunner service URL

## Ready to Go!

Your setup is complete and ready to deploy. Follow the next steps above to get it running on AWS AppRunner.

For detailed information, see `APPRUNNER_SETUP.md`.
