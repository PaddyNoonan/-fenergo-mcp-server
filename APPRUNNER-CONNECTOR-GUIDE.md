# AWS AppRunner MCP Connector for Claude

A robust connector that bridges Claude AI with your Fenergo Nebula API hosted on AWS AppRunner.

**AppRunner Service:** `https://brruyqnwu2.eu-west-1.awsapprunner.com`

## Features

- ✅ **Secure Proxying**: Secure JSON-RPC 2.0 protocol communication with AWS AppRunner
- ✅ **Retry Logic**: Automatic exponential backoff retry on network failures and 5xx errors
- ✅ **Health Checks**: Built-in health check endpoint for monitoring
- ✅ **Timeout Management**: Configurable request timeouts with automatic cleanup
- ✅ **Authentication**: Bearer token support for Fenergo API authentication
- ✅ **CORS Support**: Cross-origin request support for web-based integration
- ✅ **Error Handling**: Comprehensive error responses with JSON-RPC 2.0 compliance
- ✅ **Request Logging**: Detailed logging for debugging and monitoring

## Setup Options

### Option 1: Claude Desktop Integration (Recommended)

This option connects Claude directly to your AppRunner service via the connector.

#### Step 1: Locate Claude Desktop Config

Find your Claude Desktop configuration file:

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

#### Step 2: Update Configuration

Open your `claude_desktop_config.json` and add the AppRunner MCP server:

```json
{
  "mcpServers": {
    "fenergo-apprunner": {
      "command": "node",
      "args": ["/path/to/apprunner-mcp-connector.js"],
      "env": {
        "APPRUNNER_URL": "https://brruyqnwu2.eu-west-1.awsapprunner.com",
        "FENERGO_API_TOKEN": "Bearer YOUR_TOKEN_HERE",
        "FENERGO_TENANT_ID": "f488cdba-2122-448d-952c-7a2a47f78f1b",
        "PORT": "8091",
        "REQUEST_TIMEOUT": "30000",
        "MAX_RETRIES": "2"
      }
    }
  }
}
```

**Important:** Replace:
- `/path/to/` with the actual path to `apprunner-mcp-connector.js`
- `YOUR_TOKEN_HERE` with your actual Fenergo API token

#### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop to load the new configuration.

#### Step 4: Verify Connection

In Claude, ask it to use the Fenergo AppRunner tool. If properly configured, you'll see the tool available.

### Option 2: Local HTTP Server

Run the connector as a local HTTP server for testing or development.

#### Step 1: Start the Connector

```bash
# With environment variables
APPRUNNER_URL=https://brruyqnwu2.eu-west-1.awsapprunner.com \
FENERGO_API_TOKEN="Bearer YOUR_TOKEN" \
node apprunner-mcp-connector.js
```

Or on Windows (PowerShell):

```powershell
$env:APPRUNNER_URL = "https://brruyqnwu2.eu-west-1.awsapprunner.com"
$env:FENERGO_API_TOKEN = "Bearer YOUR_TOKEN"
node apprunner-mcp-connector.js
```

The connector will start on `http://localhost:8091`

#### Step 2: Test Health Check

```bash
curl http://localhost:8091/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T12:34:56.789Z",
  "apprunnerUrl": "https://brruyqnwu2.eu-west-1.awsapprunner.com"
}
```

#### Step 3: Test MCP Request

```bash
curl -X POST http://localhost:8091/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APPRUNNER_URL` | `https://brruyqnwu2.eu-west-1.awsapprunner.com` | AWS AppRunner service URL |
| `FENERGO_API_TOKEN` | (required) | Bearer token for Fenergo API authentication |
| `FENERGO_TENANT_ID` | `f488cdba-2122-448d-952c-7a2a47f78f1b` | Fenergo tenant identifier |
| `PORT` | `8091` | Local server port (for HTTP mode) |
| `REQUEST_TIMEOUT` | `30000` | Request timeout in milliseconds |
| `MAX_RETRIES` | `2` | Maximum retry attempts on failure |
| `NODE_ENV` | `development` | Set to `production` for self-signed cert validation |

## API Endpoints

### `GET /`
Server information endpoint.

**Response:**
```json
{
  "name": "AWS AppRunner MCP Connector",
  "version": "1.0.0",
  "status": "running",
  "apprunnerUrl": "https://brruyqnwu2.eu-west-1.awsapprunner.com",
  "endpoints": {
    "health": "/health",
    "mcp": "/mcp"
  }
}
```

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T12:34:56.789Z",
  "apprunnerUrl": "https://brruyqnwu2.eu-west-1.awsapprunner.com"
}
```

### `POST /mcp`
JSON-RPC 2.0 MCP proxy endpoint. Forwards requests to the AppRunner service.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

**Response:**
Forwarded from AppRunner service as-is.

### `OPTIONS *`
CORS preflight support.

## Troubleshooting

### Connection Refused
**Error:** `Error: connect ECONNREFUSED`

**Causes:**
- AppRunner service is not running or not accessible
- Incorrect AppRunner URL
- Network connectivity issues

**Solutions:**
1. Verify the AppRunner URL is correct
2. Check your network connectivity
3. Ensure AppRunner service is running and accessible

### Authentication Error
**Error:** `error: { code: -32603, message: "Bad gateway: 401 Unauthorized" }`

**Causes:**
- Invalid or expired Fenergo API token
- Incorrect tenant ID

**Solutions:**
1. Verify your FENERGO_API_TOKEN is correct
2. Check that the token hasn't expired
3. Confirm FENERGO_TENANT_ID is correct

### Timeout Error
**Error:** `Request timeout`

**Causes:**
- AppRunner service is slow to respond
- REQUEST_TIMEOUT is too short
- Network latency issues

**Solutions:**
1. Increase `REQUEST_TIMEOUT` environment variable
2. Check AppRunner service performance
3. Verify network connectivity

### JSON Parse Error
**Error:** `Parse error`

**Causes:**
- Invalid JSON in request body
- Malformed request

**Solutions:**
1. Verify request JSON is valid
2. Check Content-Type header is set to `application/json`

## Retry Logic

The connector implements exponential backoff retry logic:

- **Trigger:** 5xx errors or network failures
- **Max Retries:** 2 (configurable via `MAX_RETRIES`)
- **Backoff:** 1s, 2s, 3s... (increases with each retry)
- **Timeout:** 30s per request (configurable via `REQUEST_TIMEOUT`)

Example retry timeline:
1. Initial request fails → Wait 1s → Retry 1
2. Retry 1 fails → Wait 2s → Retry 2
3. Retry 2 fails → Return error

## Security Considerations

1. **Token Management**
   - Store FENERGO_API_TOKEN securely
   - Use environment variables or secrets management
   - Never commit tokens to version control

2. **TLS/SSL**
   - In production, ensure `NODE_ENV=production`
   - This enforces proper certificate validation
   - In development, `NODE_ENV=development` allows self-signed certs

3. **CORS**
   - CORS is enabled with `*` origin for development
   - In production, restrict to specific origins

4. **Request Validation**
   - JSON-RPC 2.0 format is validated
   - Invalid requests are rejected with error responses

## Performance Tuning

### Request Timeout
For slower networks or services, increase timeout:
```bash
REQUEST_TIMEOUT=60000 node apprunner-mcp-connector.js
```

### Retry Configuration
For flaky networks, increase max retries:
```bash
MAX_RETRIES=5 node apprunner-mcp-connector.js
```

### Port Selection
For multiple instances, use different ports:
```bash
PORT=8092 node apprunner-mcp-connector.js
```

## Integration with Claude

Once configured, Claude will have access to the Fenergo AppRunner tools:

### Available Tools
The tools provided depend on your AppRunner configuration. Typically:

- **investigate_journey** - Investigate a Fenergo journey for document insights
  - Parameters: `journeyId` (GUID), `query` (string), `scope` (documents|requirements)

### Example Usage in Claude

```
User: Can you investigate journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61 for documents?

Claude: I'll use the Fenergo AppRunner tool to investigate that journey.

[Claude calls investigate_journey tool with the journey ID and scope]

Claude: Based on the investigation... [results]
```

## Monitoring

Monitor the connector logs to diagnose issues:

**Healthy startup:**
```
🚀 Starting AWS AppRunner MCP Connector for Claude
📍 AppRunner URL: https://brruyqnwu2.eu-west-1.awsapprunner.com
🏢 Tenant: f488cdba-2122-448d-952c-7a2a47f78f1b
⏱️  Request timeout: 30000ms
🔄 Max retries: 2
✅ AWS AppRunner MCP Connector running
📍 Local address: http://localhost:8091
```

**Request logging:**
```
[Request initial] POST brruyqnwu2.eu-west-1.awsapprunner.com/mcp
[Response] Status 200
```

**Retry logging:**
```
[Error] timeout
[Retry] Timeout, retrying... (1/2)
[Request retry 1] POST brruyqnwu2.eu-west-1.awsapprunner.com/mcp
[Response] Status 200
```

## Advanced Configuration

### Using .env File

Create a `.env` file:
```bash
APPRUNNER_URL=https://brruyqnwu2.eu-west-1.awsapprunner.com
FENERGO_API_TOKEN=Bearer YOUR_TOKEN
FENERGO_TENANT_ID=f488cdba-2122-448d-952c-7a2a47f78f1b
REQUEST_TIMEOUT=30000
MAX_RETRIES=2
NODE_ENV=production
```

Load with dotenv:
```bash
node --require dotenv/config apprunner-mcp-connector.js
```

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY apprunner-mcp-connector.js .
ENV PORT=8091
EXPOSE 8091
CMD ["node", "apprunner-mcp-connector.js"]
```

Build and run:
```bash
docker build -t apprunner-mcp-connector .
docker run -e APPRUNNER_URL=https://... -e FENERGO_API_TOKEN=Bearer... -p 8091:8091 apprunner-mcp-connector
```

## Support

For issues related to:

- **AppRunner service**: Check AWS AppRunner documentation
- **Fenergo API**: Contact Fenergo support
- **Claude integration**: See Claude documentation
- **This connector**: Check the troubleshooting section above

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-18 | Initial release with retry logic and health checks |

## License

This connector is part of the Fenergo Nebula MCP Connector project.
