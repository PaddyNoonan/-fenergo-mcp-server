# Fenergo Insights Multi-Connector Architecture

This solution provides AI-powered querying of Fenergo Nebula document management system through **two independent connectors** that share the same backend infrastructure.

## Architecture Overview

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   Claude Desktop        │         │   ChatGPT (Web/Mobile)  │
│   (Desktop App)         │         │   (Browser)             │
│   $20/mo Pro            │         │   $20/mo Plus           │
└───────────┬─────────────┘         └───────────┬─────────────┘
            │                                   │
            │ MCP Protocol                      │ HTTPS Actions API
            │ (stdio)                           │ (REST)
            ↓                                   ↓
    ┌───────────────┐                  ┌────────────────┐
    │ MCP Server    │                  │ (direct call)  │
    │ (local Node)  │                  │                │
    └───────┬───────┘                  │                │
            │                          │                │
            │ HTTPS                    │ HTTPS          │
            └──────────┬───────────────┴────────────────┘
                       │
                       ↓
            ┌─────────────────────────────────┐
            │  AppRunner Backend (Shared)     │
            │  https://tc8srxrkcp...          │
            │                                 │
            │  Endpoints:                     │
            │  - GET  /openapi.json          │ ← ChatGPT Actions
            │  - GET  /health                │
            │  - POST /auth/login            │ ← SSO initiation
            │  - GET  /signin-oidc           │ ← SSO callback
            │  - POST /execute               │ ← Main query endpoint
            │                                 │
            │  Features:                      │
            │  - OAuth/OIDC SSO              │
            │  - Token caching (1hr)         │
            │  - Multi-tenant support        │
            └─────────────┬───────────────────┘
                          │
                          │ HTTPS + Bearer Token
                          ↓
            ┌──────────────────────────────────┐
            │  Fenergo Nebula API              │
            │  - Document Management Insights  │
            │  - Journey data                  │
            │  - Requirements                  │
            └──────────────────────────────────┘
```

## Components

### 1. Claude Desktop Connector (MCP)
**Files:**
- `claude-fenergo-mcp.js` - MCP server implementation
- `C:\Users\...\claude_desktop_config.json` - User config

**Setup:** See [CLAUDE_DESKTOP_INSTRUCTIONS.md](CLAUDE_DESKTOP_INSTRUCTIONS.md)

**Features:**
- ✅ Native desktop app experience
- ✅ Claude Desktop artifacts, canvas, etc.
- ✅ Local execution (fast)
- ✅ Flat-rate pricing ($20/mo)

### 2. ChatGPT Actions Connector
**Files:**
- `openapi-chatgpt.json` - OpenAPI schema
- `CHATGPT_SETUP.md` - Setup guide

**Setup:** See [CHATGPT_SETUP.md](CHATGPT_SETUP.md)

**Features:**
- ✅ Web and mobile access
- ✅ Voice input support
- ✅ Easy sharing (link-based)
- ✅ Works anywhere (browser)

### 3. Shared Backend (AppRunner)
**Files:**
- `apprunner-backend.js` - Express.js API server
- `apprunner.yaml` - Deployment config

**Deployment:** See [DEPLOY_APPRUNNER.md](DEPLOY_APPRUNNER.md)

**Features:**
- ✅ OAuth/OIDC SSO authentication
- ✅ Token caching (per-tenant)
- ✅ Auto-scaling
- ✅ CloudWatch logging
- ✅ Serves both connectors

## Usage Comparison

| Feature | Claude Desktop | ChatGPT |
|---------|----------------|---------|
| **Access** | Desktop app | Web browser |
| **Platform** | Windows/Mac | Any device |
| **Mobile** | ❌ No | ✅ Yes |
| **Voice** | ❌ No | ✅ Yes |
| **Artifacts** | ✅ Yes | ❌ Limited |
| **Sharing** | Config file | Link |
| **Cost** | $20/mo Pro | $20/mo Plus |
| **Setup time** | 5 minutes | 10 minutes |

## Example Queries (Both Platforms)

```
"Show me documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"

"What's the compliance status of journey abc-123?"

"List all incomplete requirements for journey xyz"

"Who uploaded the account opening form for journey 456?"
```

## Authentication Flow (Shared)

```
1. User asks about a journey
2. Backend checks for cached token
3. If no token:
   a. Backend returns SSO URL
   b. User clicks URL → opens browser
   c. User logs in with Fenergo SSO
   d. Callback stores token (1 hour cache)
4. If token exists:
   a. Backend uses cached token
   b. Calls Fenergo API
   c. Returns AI response
```

## Deployment Status

✅ **Claude Desktop:** Production ready
- MCP server: Local Node.js
- Configuration: User's AppData folder
- Status: Tested and working

⚠️ **ChatGPT:** Ready to configure
- OpenAPI schema: Available at `/openapi.json`
- Custom GPT: Needs to be created in ChatGPT UI
- Status: Backend ready, GPT setup pending

⚠️ **AppRunner Backend:** Needs deployment
- Code: Committed to GitHub
- Deploy: Manual trigger required
- URL: `https://tc8srxrkcp.eu-west-1.awsapprunner.com`

## Cost Breakdown

### Per User
- Claude Desktop: $20/mo (Claude Pro)
- ChatGPT: $20/mo (ChatGPT Plus)

### Shared Infrastructure
- AppRunner: ~$5-10/mo (scales with traffic)
- Total for both: ~$25-30/mo

### Enterprise Scale (100 users)
- User subscriptions: $2,000/mo (if all use Claude or ChatGPT)
- AppRunner: ~$20-50/mo (still auto-scales)
- Cost per user: ~$20.50/mo

## Files Overview

### Production Code
- `apprunner-backend.js` - AppRunner Express server (658 lines)
- `claude-fenergo-mcp.js` - Claude MCP client (777 lines)
- `openapi-chatgpt.json` - ChatGPT Actions schema (195 lines)

### Documentation
- `README.md` - Project overview
- `CLAUDE_DESKTOP_INSTRUCTIONS.md` - Claude setup
- `CHATGPT_SETUP.md` - ChatGPT setup
- `DEPLOY_APPRUNNER.md` - Deployment guide
- `ARCHITECTURE.md` - This file

### Configuration
- `package.json` - Node.js dependencies
- `apprunner.yaml` - AppRunner deployment config
- `.gitignore` - Git exclusions

## Next Steps

### To Deploy
1. Deploy AppRunner backend (see `DEPLOY_APPRUNNER.md`)
2. Restart Claude Desktop to test MCP
3. Create ChatGPT custom GPT (see `CHATGPT_SETUP.md`)

### Future Enhancements
- **Bedrock Agent** - For embedded web UI
- **Slack Bot** - Enterprise messaging integration
- **Teams Bot** - Microsoft Teams integration
- **Mobile SDK** - Native mobile apps
- **Knowledge Base** - RAG with Fenergo docs

## Support

- **Claude Desktop Issues:** Check MCP logs in Claude Desktop
- **ChatGPT Issues:** Check OpenAI GPT builder
- **Backend Issues:** Check CloudWatch logs in AWS Console
- **GitHub:** [Your Repository URL]

## Security Notes

- ✅ All traffic over HTTPS
- ✅ OAuth/OIDC SSO for authentication
- ✅ Tokens cached server-side (1 hour expiry)
- ✅ No credentials stored in client
- ✅ Tenant isolation enforced
- ✅ CloudWatch audit logging

## License

Proprietary - Fenergo Internal Use Only
