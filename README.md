# Fenergo AppRunner MCP Integration

Complete setup for running Fenergo Nebula API integration with Claude Desktop via AWS AppRunner.

## Quick Links

**🚀 Deploy Now:** [DEPLOY_NOW.md](DEPLOY_NOW.md) - 6 simple steps to deploy to AppRunner

**📚 Full Documentation:**
- [APPRUNNER_SOURCE_DEPLOYMENT.md](APPRUNNER_SOURCE_DEPLOYMENT.md) - Complete deployment guide (GitHub + AppRunner)
- [APPRUNNER_SETUP.md](APPRUNNER_SETUP.md) - Manual setup and troubleshooting

## What This Does

1. **Backend Service** (`apprunner-backend.js`)
   - Runs Express.js server on port 8080
   - Receives requests with Fenergo payload structure
   - Calls Fenergo insights API
   - Returns results to Claude

2. **MCP Connector** (`apprunner-mcp-connector.js`)
   - Runs on Claude Desktop as stdio MCP server
   - Provides `investigate_journey` tool
   - Translates Claude queries into Fenergo API format
   - Handles retries and error cases

3. **Automatic Deployment**
   - Code on GitHub: `https://github.com/PaddyNoonan/-fenergo-mcp-server`
   - AppRunner pulls from GitHub automatically
   - AppRunner builds Docker image
   - Service updates on every `git push`

## Architecture

```
Claude Desktop
    ↓ (query via MCP)
apprunner-mcp-connector.js
    ↓ (builds payload)
AppRunner Backend (apprunner-backend.js)
    ↓ (calls API)
Fenergo Insights API
    ↓ (returns results)
Claude displays documents/requirements
```

## Payload Structure

Exact format sent to Fenergo API:

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

## Getting Started

### Option 1: Deploy Right Now (Recommended)
See [DEPLOY_NOW.md](DEPLOY_NOW.md) for 6 simple steps

### Option 2: Detailed Setup
See [APPRUNNER_SOURCE_DEPLOYMENT.md](APPRUNNER_SOURCE_DEPLOYMENT.md) for complete guide

## Files

### Core Application
- `apprunner-backend.js` - Express backend service
- `apprunner-mcp-connector.js` - MCP connector for Claude Desktop
- `claude-fenergo-mcp.js` - Direct Fenergo API connector (optional)
- `Dockerfile` - Docker build configuration
- `package.json` - Node.js dependencies
- `package-lock.json` - Dependency lock file

### Documentation
- `DEPLOY_NOW.md` - **Start here** - 6-step deployment guide
- `APPRUNNER_SOURCE_DEPLOYMENT.md` - Complete deployment guide
- `APPRUNNER_SETUP.md` - Setup and troubleshooting
- `QUICK_START.md` - Quick reference
- `READY_TO_DEPLOY.md` - Deployment checklist
- `README.md` - This file

## Environment Variables

### AppRunner Backend
- `FENERGO_API_TOKEN` - Bearer token for Fenergo API (required)
- `FENERGO_TENANT_ID` - Fenergo tenant ID (required)
- `PORT` - Server port (default: 8080)

### Claude Desktop (claude_desktop_config.json)
- `APPRUNNER_URL` - Your AppRunner service URL
- `FENERGO_API_TOKEN` - Same as backend
- `FENERGO_TENANT_ID` - Same as backend

## Deployment Flow

```
1. Make code changes locally
2. git push to GitHub
3. AppRunner detects change
4. AppRunner pulls code
5. AppRunner builds Docker image
6. AppRunner deploys new version
7. Claude Desktop uses updated service
```

No manual Docker builds needed!

## Testing

### Via Command Line
```bash
# Test health endpoint
curl https://your-apprunner-url.awsapprunner.com/health

# Test execute endpoint
curl -X POST https://your-apprunner-url.awsapprunner.com/execute \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### Via Claude Desktop
1. Update `claude_desktop_config.json` with AppRunner URL
2. Restart Claude Desktop
3. Ask: "Can you tell me information on Documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
4. Should return actual documents

## Monitoring

### Check Service Status
```
AWS Console → AppRunner → Your service name
```

### View Logs
```bash
aws logs tail /aws/apprunner/fenergo-apprunner/service --follow
```

### CloudWatch Metrics
- CPU usage
- Memory usage
- Request count
- Response time

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Service won't deploy | Check GitHub connection, verify Dockerfile exists |
| Health endpoint fails | Wait 2-3 minutes for startup, check service status |
| Execute returns 400 | Verify payload has `data` field and correct structure |
| Execute returns 500 | Check FENERGO_API_TOKEN and FENERGO_TENANT_ID |
| Fenergo returns 401 | Token expired, update environment variable and restart |
| Claude tool not working | Verify AppRunner URL in config, restart Claude Desktop |

See [APPRUNNER_SOURCE_DEPLOYMENT.md](APPRUNNER_SOURCE_DEPLOYMENT.md) for detailed troubleshooting.

## Cost

AppRunner pricing (as of Nov 2025):
- **vCPU**: $0.0343/hour
- **Memory**: $0.00375/hour per GB
- **Requests**: Free tier available

For 0.25 vCPU, 0.5 GB running 24/7:
- ~$4-5/month

(Much cheaper than traditional EC2)

## Key Features

✅ **Correct Payload Structure** - Matches Fenergo requirements exactly
✅ **Error Handling** - Automatic retries on network errors
✅ **Comprehensive Logging** - All requests logged to CloudWatch
✅ **Health Monitoring** - `/health` endpoint for uptime checks
✅ **Auto-Deployment** - Update code by pushing to GitHub
✅ **No Docker Locally** - AppRunner builds images automatically
✅ **MCP Compatible** - Full stdio MCP server implementation

## Next Steps

1. Read [DEPLOY_NOW.md](DEPLOY_NOW.md)
2. Follow 6 deployment steps
3. Update Claude Desktop config with AppRunner URL
4. Test with Claude
5. Start using with investigate_journey tool

## Support

For issues:
1. Check [APPRUNNER_SOURCE_DEPLOYMENT.md](APPRUNNER_SOURCE_DEPLOYMENT.md) troubleshooting section
2. Review CloudWatch logs
3. Verify environment variables are set correctly
4. Ensure FENERGO_API_TOKEN hasn't expired

## Links

- GitHub: https://github.com/PaddyNoonan/-fenergo-mcp-server
- AWS AppRunner: https://console.aws.amazon.com/apprunner
- Fenergo API: https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights

