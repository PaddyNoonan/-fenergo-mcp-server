# ChatGPT Desktop MCP Setup for Fenergo Insights

This guide shows you how to set up the Fenergo Insights MCP server in **ChatGPT Desktop**, giving you the same native experience as Claude Desktop.

## What This Provides

- ✅ Native ChatGPT Desktop integration via MCP protocol
- ✅ Universal tool available in all ChatGPT conversations
- ✅ Same AppRunner backend as Claude Desktop
- ✅ Automatic SSO authentication with Fenergo
- ✅ No need for web-based Actions/Connectors

## Prerequisites

- **ChatGPT Desktop** installed (with MCP support)
- **Node.js** installed (v18 or later)
- **AppRunner backend** deployed and running
- **Fenergo tenant ID** configured

## Architecture

```
ChatGPT Desktop
    ↓
Local MCP Server (chatgpt-fenergo-mcp.js)
    ↓
AppRunner Backend (shared)
    ↓
Fenergo Nebula API
```

## Setup Steps

### 1. Locate ChatGPT Desktop Config File

ChatGPT Desktop uses a configuration file similar to Claude Desktop. The location depends on your OS:

**Windows:**
```
%APPDATA%\OpenAI\ChatGPT\chatgpt_desktop_config.json
```
or
```
%LOCALAPPDATA%\OpenAI\ChatGPT\chatgpt_desktop_config.json
```

**macOS:**
```
~/Library/Application Support/OpenAI/ChatGPT/chatgpt_desktop_config.json
```

**Linux:**
```
~/.config/openai-chatgpt/chatgpt_desktop_config.json
```

### 2. Configure the MCP Server

Edit the ChatGPT Desktop config file and add:

```json
{
  "mcpServers": {
    "fenergo-connector": {
      "command": "node",
      "args": ["C:/Users/PNoonan/OneDrive - Fenergo/Desktop/MCPTest/chatgpt-fenergo-mcp.js"],
      "env": {
        "FENERGO_TENANT_ID": "f488cdba-2122-448d-952c-7a2a47f78f1b",
        "APPRUNNER_URL": "https://tc8srxrkcp.eu-west-1.awsapprunner.com"
      }
    }
  }
}
```

**Important:**
- Replace the path to `chatgpt-fenergo-mcp.js` with your actual file location
- Use forward slashes `/` even on Windows
- Update `FENERGO_TENANT_ID` to your tenant ID if different

### 3. Restart ChatGPT Desktop

1. **Close ChatGPT Desktop** completely (check system tray)
2. **Reopen ChatGPT Desktop**
3. The MCP server will load automatically

### 4. Verify Installation

To verify the MCP server is working:

1. Open ChatGPT Desktop
2. Check for the Fenergo tool in available tools
3. Try a test query:
   ```
   "Tell me about documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
   ```

## Authentication Flow

The first time you query Fenergo data:

1. **ChatGPT calls the tool** → Triggers authentication check
2. **SSO URL is displayed** → Click to authenticate in browser
3. **Login with Fenergo** → Use your Fenergo credentials
4. **Token is cached** → Valid for 1 hour
5. **Query executes** → Returns journey insights

Subsequent queries within 1 hour will use the cached token automatically.

## Configuration Options

### Environment Variables

You can customize the MCP server behavior via environment variables in the config:

```json
{
  "mcpServers": {
    "fenergo-connector": {
      "command": "node",
      "args": ["path/to/chatgpt-fenergo-mcp.js"],
      "env": {
        "FENERGO_TENANT_ID": "your-tenant-id",
        "APPRUNNER_URL": "https://tc8srxrkcp.eu-west-1.awsapprunner.com",
        "FENERGO_TIMEOUT": "30000",
        "FENERGO_RETRIES": "2"
      }
    }
  }
}
```

**Variables:**
- `FENERGO_TENANT_ID` (required) - Your Fenergo tenant ID
- `APPRUNNER_URL` (required) - AppRunner backend URL
- `FENERGO_TIMEOUT` (optional) - Request timeout in milliseconds (default: 30000)
- `FENERGO_RETRIES` (optional) - Number of retries for failed requests (default: 2)

## Available Tool

### `investigate_journey_documents`

Query documents and requirements for a specific Fenergo journey.

**Parameters:**
- `query` (string, required) - Natural language question about the journey
- `journey_id` (string, required) - Journey ID (GUID format)

**Example Usage:**
```
"What documents are uploaded for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61?"

"Show me the compliance status of journey abc-123"

"List incomplete requirements for journey xyz-456"
```

## Troubleshooting

### MCP Server Not Loading

**Problem:** ChatGPT doesn't show the Fenergo tool

**Solutions:**
1. Check the config file path is correct
2. Verify the `chatgpt-fenergo-mcp.js` file path is correct
3. Restart ChatGPT Desktop completely
4. Check ChatGPT Desktop logs for errors

### Authentication Failures

**Problem:** SSO authentication URL not displayed or authentication fails

**Solutions:**
1. Check AppRunner backend is running: `https://tc8srxrkcp.eu-west-1.awsapprunner.com/health`
2. Verify `FENERGO_TENANT_ID` is correct in config
3. Check that `mcp-client` is registered in Fenergo identity provider
4. Try clearing cached tokens (restart MCP server)

### Tool Execution Errors

**Problem:** Tool returns errors when querying journeys

**Solutions:**
1. Verify the journey ID is valid (GUID format)
2. Check CloudWatch logs for AppRunner backend errors
3. Ensure the journey exists in your Fenergo environment
4. Verify your user has permission to access the journey

### Finding Logs

**ChatGPT Desktop Logs:**
- Check ChatGPT Desktop's developer console (if available)
- Look for MCP-related log messages

**MCP Server Logs:**
- The MCP server writes to stderr
- Check terminal/console where ChatGPT Desktop was launched
- On Windows, logs may appear in Event Viewer

**AppRunner Backend Logs:**
- AWS Console → CloudWatch → Log groups
- `/aws/apprunner/mcp-fenergo-insights/service`

## Comparison: ChatGPT Desktop vs Claude Desktop

Both use the same MCP protocol and AppRunner backend:

| Feature | Claude Desktop | ChatGPT Desktop |
|---------|----------------|-----------------|
| **MCP Protocol** | ✅ Yes | ✅ Yes |
| **Backend** | AppRunner | AppRunner (same) |
| **Authentication** | SSO | SSO (same) |
| **Desktop App** | ✅ Yes | ✅ Yes |
| **Mobile** | ❌ No | ❌ No |
| **Voice** | ❌ No | ✅ Maybe |
| **Web Access** | ❌ No | ✅ ChatGPT Web |
| **Cost** | $20/mo Pro | $20/mo Plus |

## Files

### Core Files
- `chatgpt-fenergo-mcp.js` - MCP server for ChatGPT Desktop
- `apprunner-backend.js` - Shared backend (same as Claude)

### Documentation
- `CHATGPT_DESKTOP_MCP_SETUP.md` - This file
- `CLAUDE_DESKTOP_INSTRUCTIONS.md` - Claude Desktop setup
- `ARCHITECTURE.md` - Full architecture overview

## Example Queries

Once configured, you can ask ChatGPT:

```
"Show me documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"

"What's the compliance status of this journey?"

"List all requirements for journey abc-123"

"Who uploaded the account opening form?"

"When was the last document uploaded for this journey?"
```

ChatGPT will automatically use the Fenergo MCP tool to answer these questions.

## Security Notes

- ✅ All traffic over HTTPS
- ✅ OAuth/OIDC SSO authentication
- ✅ Tokens cached securely (1 hour expiry)
- ✅ No credentials stored in config file
- ✅ Same security model as Claude Desktop

## Support

**If you encounter issues:**

1. **Check config file** - Verify paths and environment variables
2. **Restart ChatGPT Desktop** - Reload the MCP server
3. **Check AppRunner logs** - CloudWatch logs in AWS Console
4. **Verify backend** - Test `/health` endpoint
5. **Compare with Claude** - If Claude works, config is correct

## Next Steps

1. Complete this setup in ChatGPT Desktop
2. Test with a sample journey query
3. (Optional) Set up the same connector for other team members

## License

Proprietary - Fenergo Internal Use Only
