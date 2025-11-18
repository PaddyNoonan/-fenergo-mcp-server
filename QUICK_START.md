# Quick Start Guide

## What You Have

A complete AppRunner backend service ready to deploy that:
- Accepts the exact payload structure you specified
- Calls Fenergo insights API
- Returns results to Claude Desktop via MCP connector

## Files

| File | Purpose |
|------|---------|
| `apprunner-backend.js` | Backend service (Express.js) |
| `apprunner-mcp-connector.js` | MCP connector for Claude Desktop |
| `Dockerfile` | Docker build configuration |
| `package.json` | Node.js dependencies |
| `APPRUNNER_SETUP.md` | Detailed setup guide |
| `READY_TO_DEPLOY.md` | Deployment checklist |

## Deployment in 5 Steps

### 1. Build Docker Image
```bash
docker build -t fenergo-apprunner:latest .
```

### 2. Push to Registry
```bash
docker push your-registry/fenergo-apprunner:latest
```

### 3. Deploy to AppRunner
- Create/update AppRunner service with your Docker image
- Set environment variables:
  - `FENERGO_API_TOKEN=Bearer eyJhbGci...`
  - `FENERGO_TENANT_ID=f488cdba-2122-448d-952c-7a2a47f78f1b`

### 4. Verify Health
```bash
curl https://your-apprunner-url.awsapprunner.com/health
```

### 5. Configure Claude Desktop
Update `~\AppData\Roaming\Claude\claude_desktop_config.json`:
```json
{
  "fenergo-apprunner": {
    "command": "node",
    "args": ["path/to/apprunner-mcp-connector.js"],
    "env": {
      "APPRUNNER_URL": "https://your-apprunner-url.awsapprunner.com",
      "FENERGO_API_TOKEN": "Bearer eyJhbGci...",
      "FENERGO_TENANT_ID": "f488cdba-2122-448d-952c-7a2a47f78f1b"
    }
  }
}
```

## How It Works

```
Your Query in Claude
    ↓
MCP Connector builds payload:
  {
    "data": {
      "message": "...",
      "scope": {
        "documentContext": { ... },
        "documentRequirementContext": { ... }
      },
      "conversationHistory": []
    }
  }
    ↓
AppRunner Backend (/execute endpoint)
    ↓
Fenergo API (insights endpoint)
    ↓
Results back to Claude
```

## Testing

Once deployed:

```bash
# Test via CLI
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

# Test via Claude Desktop
# Restart Claude Desktop, then ask:
# "Can you tell me information on Documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Docker build fails | Check Node.js 18 availability, verify package.json |
| AppRunner won't start | Check CloudWatch logs, verify environment variables |
| Health endpoint fails | Wait for service to fully start, check port 8080 |
| Execute returns 400 | Verify payload has `data` field and correct structure |
| Execute returns 500 | Check FENERGO_API_TOKEN and FENERGO_TENANT_ID |
| Fenergo returns 401 | Token expired, get fresh one and restart AppRunner |

## Key Environment Variables

**AppRunner Backend:**
- `FENERGO_API_TOKEN` - Bearer token for Fenergo API (required)
- `FENERGO_TENANT_ID` - Tenant ID (required)
- `PORT` - Server port (default: 8080)

**Claude Desktop:**
- `APPRUNNER_URL` - Your AppRunner service URL
- `FENERGO_API_TOKEN` - Same as above
- `FENERGO_TENANT_ID` - Same as above

## Documentation

- **APPRUNNER_SETUP.md** - Complete guide with all details
- **READY_TO_DEPLOY.md** - Deployment checklist with troubleshooting

## Support

Check logs via:
```bash
aws logs tail /aws/apprunner/your-service-name/service --follow
```

Look for:
- `Health check request` - Service running
- `=== START /execute request ===` - Execute endpoint called
- `[FENERGO] === API call SUCCESS ===` - Fenergo API worked
- Any error messages starting with `ERROR`

