# AWS AppRunner MCP Connector for Claude AI

A production-ready connector that integrates Claude AI with your Fenergo Nebula API hosted on AWS AppRunner.

**AppRunner Service:** `https://brruyqnwu2.eu-west-1.awsapprunner.com`

## ✅ Complete Setup Created

Your connector is ready to use! All files have been created and documented.

## 🚀 Quick Start (Choose One)

### Option 1: Claude Desktop (Recommended)
Perfect for direct Claude integration.

```bash
# 1. Edit your Claude config file (path depends on your OS):
#    Windows: %APPDATA%\Claude\claude_desktop_config.json
#    macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
#    Linux: ~/.config/Claude/claude_desktop_config.json

# 2. Add this configuration:
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

# 3. Replace /full/path/to/ and YOUR_TOKEN_HERE
# 4. Restart Claude Desktop
# 5. Done!
```

### Option 2: Local HTTP Server
Perfect for testing and debugging.

**Windows (PowerShell):**
```powershell
.\start-apprunner-connector.ps1 -Token "Bearer YOUR_TOKEN_HERE"
```

**macOS/Linux (Bash):**
```bash
./start-apprunner-connector.sh --token "Bearer YOUR_TOKEN_HERE"
```

Or manually:
```bash
APPRUNNER_URL=https://brruyqnwu2.eu-west-1.awsapprunner.com \
FENERGO_API_TOKEN="Bearer YOUR_TOKEN_HERE" \
node apprunner-mcp-connector.js
```

Then test:
```bash
curl http://localhost:8091/health
```

## 📁 What Was Created

### Application
- **apprunner-mcp-connector.js** - The main connector application

### Documentation
- **APPRUNNER-QUICK-START.md** - 5-minute setup guide (START HERE!)
- **APPRUNNER-CONNECTOR-GUIDE.md** - Complete reference documentation
- **APPRUNNER-SETUP-SUMMARY.md** - Overview and features
- **APPRUNNER-INDEX.md** - File navigation guide
- **README-APPRUNNER.md** - This file

### Configuration
- **claude-desktop-apprunner-config.json** - Claude config template
- **test-apprunner-connector.json** - Test cases and examples

### Scripts
- **start-apprunner-connector.ps1** - Windows startup script
- **start-apprunner-connector.sh** - macOS/Linux startup script

## 📖 Documentation Guide

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **APPRUNNER-QUICK-START.md** | Get started in 5 minutes | 5 min |
| **APPRUNNER-CONNECTOR-GUIDE.md** | Complete reference | 20-30 min |
| **APPRUNNER-SETUP-SUMMARY.md** | Overview of features | 10 min |
| **APPRUNNER-INDEX.md** | File navigation | 5 min |
| **test-apprunner-connector.json** | Test examples | Varies |

**🎯 Start with:** `APPRUNNER-QUICK-START.md`

## 🔑 Key Features

- ✅ **Reliable** - Automatic retry logic with exponential backoff
- ✅ **Secure** - Bearer token authentication, HTTPS/TLS
- ✅ **Fast** - Lightweight, minimal overhead
- ✅ **Compatible** - JSON-RPC 2.0 protocol compliant
- ✅ **Monitored** - Health checks and detailed logging
- ✅ **Configurable** - Timeout, retries, and other settings
- ✅ **Well-Documented** - Comprehensive guides and examples

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default |
|----------|----------|---------|
| `FENERGO_API_TOKEN` | Yes | - |
| `APPRUNNER_URL` | No | https://brruyqnwu2.eu-west-1.awsapprunner.com |
| `FENERGO_TENANT_ID` | No | f488cdba-2122-448d-952c-7a2a47f78f1b |
| `PORT` | No | 8091 |
| `REQUEST_TIMEOUT` | No | 30000 ms |
| `MAX_RETRIES` | No | 2 |

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8091/health
```

### List Tools
```bash
curl -X POST http://localhost:8091/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

### Investigate Journey
```bash
curl -X POST http://localhost:8091/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "tool": "investigate_journey",
      "parameters": {
        "journeyId": "5a5caba1-623f-45c5-8e02-592fb6c4dc61",
        "query": "What documents are required?",
        "scope": "documents"
      }
    },
    "id": 1
  }'
```

See `test-apprunner-connector.json` for more examples.

## 🚨 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Install Node.js 18+ |
| "Connection refused" | Check AppRunner URL is accessible |
| "401 Unauthorized" | Verify FENERGO_API_TOKEN is valid |
| "Request timeout" | Increase REQUEST_TIMEOUT env var |
| Claude doesn't show tool | Restart Claude Desktop |

**More help:** See `APPRUNNER-CONNECTOR-GUIDE.md` Troubleshooting section.

## 📊 Architecture

```
Claude Desktop / Application
          ↓
apprunner-mcp-connector.js
(localhost:8091)
          ↓
AWS AppRunner Service
(https://brruyqnwu2.eu-west-1.awsapprunner.com)
          ↓
Fenergo Nebula API
```

## 📋 Requirements

- Node.js 18+
- Fenergo API token
- Network access to AWS AppRunner service
- (Optional) Claude Desktop for native integration

## 🔄 How It Works

1. **Request** - Claude sends a JSON-RPC 2.0 request to the connector
2. **Proxy** - Connector forwards the request to your AppRunner service
3. **Retry** - If it fails, automatically retry with exponential backoff
4. **Response** - AppRunner responds, connector forwards back to Claude
5. **Error Handling** - Any errors are properly formatted and returned

## 🎯 Next Steps

1. **Choose** - Pick integration method (Claude Desktop or HTTP Server)
2. **Get Token** - Obtain your Fenergo API token
3. **Setup** - Follow `APPRUNNER-QUICK-START.md`
4. **Test** - Verify connection with health check
5. **Use** - Start accessing Fenergo tools in Claude

## 📞 Support Resources

- **Quick Setup:** `APPRUNNER-QUICK-START.md`
- **Full Guide:** `APPRUNNER-CONNECTOR-GUIDE.md`
- **File Guide:** `APPRUNNER-INDEX.md`
- **Test Examples:** `test-apprunner-connector.json`

## ✨ Features Summary

### Protocol Support
- ✅ JSON-RPC 2.0
- ✅ Claude MCP (Model Context Protocol)
- ✅ Bearer token authentication
- ✅ Custom tenant ID support

### Reliability
- ✅ Automatic retries on failure
- ✅ Exponential backoff strategy
- ✅ Request timeout protection
- ✅ Graceful error handling

### Operations
- ✅ Health check endpoint
- ✅ Server information endpoint
- ✅ Detailed request logging
- ✅ CORS support

### Performance
- ✅ Lightweight and fast
- ✅ Configurable timeouts
- ✅ Efficient error handling
- ✅ Minimal memory footprint

## 📝 Version Info

- **Version:** 1.0.0
- **Created:** 2025-11-18
- **Node.js:** 18+
- **Protocol:** JSON-RPC 2.0
- **Status:** Production Ready

## 🔐 Security

- HTTPS/TLS for all external connections
- Bearer token authentication
- Request validation
- Proper error handling (no info leakage)
- Environment-based configuration
- Self-signed cert handling (dev mode)

---

## 🎬 Getting Started

### Step 1: Read Documentation
Start with `APPRUNNER-QUICK-START.md` - takes about 5 minutes

### Step 2: Choose Integration Method
- **Claude Desktop:** Recommended for ease of use
- **HTTP Server:** For testing and custom integration

### Step 3: Gather Requirements
- Your Fenergo API token
- AppRunner URL (already configured)
- Node.js 18+ (for HTTP server option)

### Step 4: Follow Setup Guide
- Use startup scripts or manual configuration
- Verify with health check

### Step 5: Start Using
- In Claude: Ask it to access Fenergo tools
- Or: Make API calls to http://localhost:8091

---

**👉 Next:** Open `APPRUNNER-QUICK-START.md` and follow the 5-minute setup!

---

## File Structure

```
MCPTest/
├── 📄 apprunner-mcp-connector.js        ← Main application
├── 📚 APPRUNNER-QUICK-START.md          ← START HERE
├── 📚 APPRUNNER-CONNECTOR-GUIDE.md      ← Full reference
├── 📚 APPRUNNER-SETUP-SUMMARY.md        ← Overview
├── 📚 APPRUNNER-INDEX.md                ← File guide
├── 📄 claude-desktop-apprunner-config.json ← Config template
├── 📄 test-apprunner-connector.json     ← Test cases
├── 🔧 start-apprunner-connector.ps1     ← Windows script
└── 🔧 start-apprunner-connector.sh      ← macOS/Linux script
```

---

**Questions?** See the comprehensive documentation in `APPRUNNER-CONNECTOR-GUIDE.md`

**Ready to start?** Open `APPRUNNER-QUICK-START.md` now! 🚀
