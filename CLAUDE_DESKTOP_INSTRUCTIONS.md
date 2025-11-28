# Claude Desktop SSO Authentication Flow

## How It Works

Your Fenergo MCP server now supports **two-step SSO authentication** through Claude Desktop:

### Step 1: Initial Authentication
1. Start Claude Desktop
2. The fenergo-connector MCP server will load automatically
3. Ask Claude: **"Authenticate me with Fenergo"**
4. Claude will call the `fenergo_authenticate` tool
5. The MCP server will provide an **authentication URL**
6. **Click the URL** and authenticate with your Fenergo credentials
7. You'll see a confirmation page after authentication

### Step 2: Token Retrieval
1. Come back to Claude Desktop
2. Ask Claude: **"Authenticate me with Fenergo"** (again)
3. Claude will call the `fenergo_authenticate` tool again
4. This time, the MCP server will **retrieve your cached token** from AppRunner
5. You'll see: ✅ **SSO Authentication Successful!**

### Step 3: Use the Tools
Once authenticated, you can ask Claude:
- "Tell me about documents in journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
- "What requirements are needed for this journey?"
- "Check the compliance status of journey [ID]"

The token will be automatically used for all API calls!

## Architecture

```
┌─────────────────────────────────┐
│    Claude Desktop               │
│  ┌──────────────────────────┐   │
│  │  fenergo_authenticate    │   │
│  │  tool call               │   │
│  └──────────────────────────┘   │
└────────────────┬────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │  MCP Server    │
        │  (Node.js)     │
        └────────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  AppRunner /auth/login │
        │  - Returns auth URL    │
        │  - Or cached token     │
        └────────────────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  User authenticates    │
        │  in browser            │
        │  (Session created)     │
        └────────────────────────┘
                 │
        ┌────────▼────────┐
        │  Call auth tool │
        │  again          │
        └────────┬────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  Token returned        │
        │  & cached in MCP       │
        └────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  Use any tool with token   │
        │  - investigate_journey     │
        │  - fenergo_ping            │
        │  - fenergo_token_status    │
        └────────────────────────────┘
```

## Configuration

Your Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json`) is set up with:

```json
{
  "mcpServers": {
    "fenergo-connector": {
      "command": "node",
      "args": ["c:\Users\PNoonan\OneDrive - Fenergo\Desktop\MCPTest\claude-fenergo-mcp.js"],
      "env": {
        "FENERGO_TENANT_ID": "f488cdba-2122-448d-952c-7a2a47f78f1b",
        "APPRUNNER_URL": "https://tc8srxrkcp.eu-west-1.awsapprunner.com"
      }
    }
  }
}
```

## Available Tools

Once authenticated, you have access to:

1. **fenergo_authenticate** - Initiate SSO authentication
2. **fenergo_insights_agent_docstask** - Query journey documents/requirements
3. **fenergo_ping** - Test connectivity
4. **fenergo_token_status** - Check token validity

## Token Caching

- Tokens are cached in the MCP server session
- Cache has 60-second buffer before refresh
- Tokens are automatically used for all API calls
- Session lasts as long as Claude Desktop is running

## Troubleshooting

- **"No authentication token available"** → Run the authentication tool first
- **"Client not authorized"** → Check that your SSO token has proper scopes
- **Token expired** → Run the authentication tool again to get a fresh token

## Next Steps

1. Close and restart Claude Desktop
2. Ask Claude: "Authenticate me with Fenergo"
3. Follow the steps above
4. Start querying your Fenergo data!
