# AppRunner Backend Setup

## Overview

You now have a complete AppRunner backend service that:
1. Runs on AWS AppRunner on port 8080
2. Accepts requests with the correct payload structure
3. Calls the Fenergo insights API at `https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights`
4. Returns results back to the MCP connector

## Architecture

```
Claude Desktop
    ↓ (MCP Protocol)
apprunner-mcp-connector.js (stdio)
    ↓ (HTTPS POST)
AppRunner (port 8080)
    ↓ (apprunner-backend.js)
Fenergo API
    ↓
Response back through chain
```

## Files

### AppRunner Backend (`apprunner-backend.js`)
- Express.js service running on port 8080
- Endpoints:
  - `GET /health` - Health check
  - `POST /execute` - Main endpoint that accepts payload and calls Fenergo

### MCP Connector (`apprunner-mcp-connector.js`)
- Runs on Claude Desktop as stdio MCP server
- Translates Claude queries into payload structure
- Calls AppRunner `/execute` endpoint
- Returns results to Claude

### Dockerfile
- Builds Docker image for AppRunner
- Installs dependencies from package.json
- Runs `apprunner-backend.js` on startup

## Payload Structure

The MCP connector sends this format to AppRunner `/execute`:

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

AppRunner validates and forwards this exact structure to the Fenergo insights endpoint.

## Environment Variables (AppRunner)

Set these in your AppRunner service configuration:

```
FENERGO_API_TOKEN=Bearer eyJhbGci...
FENERGO_TENANT_ID=f488cdba-2122-448d-952c-7a2a47f78f1b
PORT=8080
```

## Environment Variables (Claude Desktop)

The `apprunner-mcp-connector.js` uses these from claude_desktop_config.json:

```json
{
  "fenergo-apprunner": {
    "command": "node",
    "args": ["path/to/apprunner-mcp-connector.js"],
    "env": {
      "APPRUNNER_URL": "https://brruyqnwu2.eu-west-1.awsapprunner.com",
      "FENERGO_API_TOKEN": "Bearer eyJhbGci...",
      "FENERGO_TENANT_ID": "f488cdba-2122-448d-952c-7a2a47f78f1b"
    }
  }
}
```

## Deployment Steps

### 1. Build Docker Image

```bash
docker build -t fenergo-apprunner:latest .
```

### 2. Push to ECR (if using ECR)

```bash
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin YOUR_ECR_REGISTRY
docker tag fenergo-apprunner:latest YOUR_ECR_REGISTRY/fenergo-apprunner:latest
docker push YOUR_ECR_REGISTRY/fenergo-apprunner:latest
```

### 3. Deploy to AppRunner (via AWS Console)

1. Go to AWS AppRunner
2. Create new service or update existing
3. Set source to your Docker image
4. Configure environment variables:
   - `FENERGO_API_TOKEN`
   - `FENERGO_TENANT_ID`
   - `PORT=8080`
5. Deploy

### 4. Verify Health Endpoint

```bash
curl https://your-apprunner-url.awsapprunner.com/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T16:00:00.000Z",
  "service": "apprunner-backend"
}
```

## Testing

### Option 1: Direct API Test

```bash
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

### Option 2: Via Claude Desktop

1. Ensure `apprunner-mcp-connector.js` is configured in claude_desktop_config.json
2. Restart Claude Desktop
3. Ask: "Can you tell me information on Documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
4. Claude should return actual documents

## Logging

Both services log to stderr. Check AppRunner logs via:

```bash
aws logs tail /aws/apprunner/your-service-name/service --follow
```

Look for:
- `[TIMESTAMP] Health check request` - Service is receiving requests
- `[TIMESTAMP] === START /execute request ===` - Execute endpoint called
- `[TIMESTAMP] [FENERGO] Request` - Backend calling Fenergo
- `[TIMESTAMP] === API call SUCCESS ===` - Fenergo API responded successfully

## Troubleshooting

### Service won't start
- Check Dockerfile syntax
- Verify all dependencies in package.json
- Check Node.js version compatibility

### Health endpoint fails
- Verify AppRunner service is running
- Check port 8080 is exposed correctly
- Review CloudWatch logs

### Execute endpoint returns error
- Verify FENERGO_API_TOKEN is set correctly
- Check FENERGO_TENANT_ID matches your account
- Review logs for Fenergo API error details
- Verify payload structure matches expected format

### Fenergo API returns 401/403
- Token may be expired
- Get fresh token from Fenergo
- Update environment variables
- Restart AppRunner service

## Next Steps

1. Build and push Docker image to your registry
2. Deploy to AppRunner with proper environment variables
3. Test health endpoint to verify service is running
4. Test via Claude Desktop with investigate_journey tool
5. Monitor logs for any issues

