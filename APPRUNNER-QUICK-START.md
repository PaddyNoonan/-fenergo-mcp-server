# AppRunner MCP Connector - Quick Start Guide

Get your Claude AI connector to AWS AppRunner up and running in 5 minutes.

## What You Need

- Node.js 18+ installed
- Your Fenergo API token (from your organization)
- The AppRunner connector files from this repository

## 3-Step Setup

### Step 1: Prepare Your Token

Get your Fenergo API token. You'll need it in the next steps.

The token should be in Bearer format or will be automatically prefixed with "Bearer ".

### Step 2: Choose Your Integration Method

#### Method A: Claude Desktop (Recommended)

**Best for:** Using Claude with your AppRunner service directly

1. Find your Claude Desktop config file:
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`

2. Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fenergo-apprunner": {
      "command": "node",
      "args": ["/full/path/to/apprunner-mcp-connector.js"],
      "env": {
        "APPRUNNER_URL": "https://brruyqnwu2.eu-west-1.awsapprunner.com",
        "FENERGO_API_TOKEN": "Bearer YOUR_TOKEN_HERE",
        "FENERGO_TENANT_ID": "f488cdba-2122-448d-952c-7a2a47f78f1b"
      }
    }
  }
}
```

3. Replace:
   - `/full/path/to/` with the actual location of `apprunner-mcp-connector.js`
   - `YOUR_TOKEN_HERE` with your Fenergo API token

4. Restart Claude Desktop

5. In Claude, ask it to access your Fenergo AppRunner tools

---

#### Method B: Local HTTP Server

**Best for:** Testing, debugging, or custom integrations

1. Open a terminal in the project directory

2. Start the connector:

   **On macOS/Linux:**
   ```bash
   APPRUNNER_URL=https://brruyqnwu2.eu-west-1.awsapprunner.com \
   FENERGO_API_TOKEN="Bearer YOUR_TOKEN_HERE" \
   node apprunner-mcp-connector.js
   ```

   **On Windows (PowerShell):**
   ```powershell
   $env:APPRUNNER_URL = "https://brruyqnwu2.eu-west-1.awsapprunner.com"
   $env:FENERGO_API_TOKEN = "Bearer YOUR_TOKEN_HERE"
   node apprunner-mcp-connector.js
   ```

3. You should see:
   ```
   ✅ AWS AppRunner MCP Connector running
   📍 Local address: http://localhost:8091
   ```

4. Test it:
   ```bash
   curl http://localhost:8091/health
   ```

   You should get a response like:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-11-18T12:34:56.789Z",
     "apprunnerUrl": "https://brruyqnwu2.eu-west-1.awsapprunner.com"
   }
   ```

---

### Step 3: Test the Connection

#### For Claude Desktop:
Ask Claude: "Can you list the available tools from my Fenergo AppRunner service?"

#### For Local Server:
```bash
# Test health
curl http://localhost:8091/health

# Test tools list
curl -X POST http://localhost:8091/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

## Common Issues

### "Cannot find module" Error
- Make sure Node.js 18+ is installed
- Check that you're running from the correct directory
- Verify the path to `apprunner-mcp-connector.js` is correct

### "Request timeout" Error
- Check that your AppRunner URL is accessible: `https://brruyqnwu2.eu-west-1.awsapprunner.com`
- Verify your internet connection
- Increase the timeout: `REQUEST_TIMEOUT=60000 node apprunner-mcp-connector.js`

### "Bad gateway: 401 Unauthorized"
- Your Fenergo API token is invalid or expired
- Make sure the token is in Bearer format
- Double-check the FENERGO_TENANT_ID

### "Connection refused"
- Make sure Claude Desktop is closed before updating the config
- Ensure the path to `apprunner-mcp-connector.js` is correct (use full path, not relative)
- Try restarting Claude Desktop

## Files in This Setup

| File | Purpose |
|------|---------|
| `apprunner-mcp-connector.js` | Main connector application |
| `APPRUNNER-CONNECTOR-GUIDE.md` | Full documentation |
| `APPRUNNER-QUICK-START.md` | This file |
| `claude-desktop-apprunner-config.json` | Example Claude Desktop config |
| `test-apprunner-connector.json` | Test cases and curl examples |

## What's Next?

Once your connector is running:

1. **Use Fenergo Tools in Claude:**
   - Ask Claude to investigate journeys
   - Query documents and requirements
   - Get AI-powered insights from your data

2. **Monitor the Connector:**
   - Check the console logs for activity
   - Use the `/health` endpoint for monitoring
   - Set up alerts on AppRunner for service health

3. **Customize (Optional):**
   - Adjust `REQUEST_TIMEOUT` for slow networks
   - Change `MAX_RETRIES` for flaky connections
   - Modify ports if you have conflicts

## Need Help?

- **Full documentation:** See `APPRUNNER-CONNECTOR-GUIDE.md`
- **Test examples:** See `test-apprunner-connector.json`
- **Troubleshooting:** Check the Troubleshooting section in the full guide

## Architecture Overview

```
Claude Desktop / Application
        ↓
apprunner-mcp-connector.js (localhost:8091)
        ↓
AWS AppRunner Service
(https://brruyqnwu2.eu-west-1.awsapprunner.com)
        ↓
Fenergo Nebula API
```

The connector:
1. Receives JSON-RPC 2.0 requests from Claude
2. Proxies them to your AppRunner service
3. Forwards responses back to Claude
4. Handles retries automatically if something fails

## Features Summary

- ✅ Automatic retry with exponential backoff
- ✅ Health checks and monitoring
- ✅ Secure token authentication
- ✅ JSON-RPC 2.0 compliance
- ✅ Detailed logging
- ✅ CORS support
- ✅ Request timeout protection

---

**Ready?** Start with **Method A** (Claude Desktop) or **Method B** (Local Server) above!
