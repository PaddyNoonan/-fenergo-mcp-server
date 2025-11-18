# AWS AppRunner MCP Connector - File Index

Complete guide to all files created for your Claude AI AppRunner integration.

## 📋 Table of Contents

1. [Application Files](#application-files)
2. [Documentation Files](#documentation-files)
3. [Configuration Files](#configuration-files)
4. [Startup Scripts](#startup-scripts)
5. [Quick File Reference](#quick-file-reference)
6. [Getting Started](#getting-started)

---

## Application Files

### apprunner-mcp-connector.js
**The main connector application**

- **Size:** ~8.4 KB
- **Language:** JavaScript (Node.js ES Module)
- **Purpose:** Proxies JSON-RPC 2.0 requests from Claude to your AppRunner service
- **Key Features:**
  - Automatic retry logic with exponential backoff
  - Health checks and monitoring
  - Bearer token authentication
  - Request timeout management
  - Detailed logging
  - CORS support
  - JSON-RPC 2.0 protocol validation

**Used By:**
- Claude Desktop (via config file)
- Local HTTP server (direct execution)
- Both startup scripts

**Requirements:**
- Node.js 18+
- Environment variables for token and configuration

---

## Documentation Files

### APPRUNNER-QUICK-START.md
**Start here! 5-minute setup guide**

- **Best For:** First-time users, getting started quickly
- **Contents:**
  - System requirements
  - 3-step setup process
  - Two integration methods with step-by-step instructions
  - Common issues and solutions
  - Testing commands
  - Next steps

**Read Time:** 5 minutes

### APPRUNNER-CONNECTOR-GUIDE.md
**Comprehensive reference documentation**

- **Best For:** Full understanding, advanced configuration, troubleshooting
- **Contents:**
  - Feature overview
  - Detailed setup instructions for both methods
  - Complete environment variable reference
  - API endpoints documentation
  - Testing examples
  - Extensive troubleshooting guide
  - Performance tuning
  - Security considerations
  - Docker deployment instructions
  - Retry logic explanation
  - Integration examples
  - Monitoring and logging

**Read Time:** 20-30 minutes

### APPRUNNER-SETUP-SUMMARY.md
**Overview of what was created and next steps**

- **Best For:** Quick reference, summary of files and features
- **Contents:**
  - What was created (all files)
  - Quick setup summary
  - Environment variables table
  - Available endpoints
  - Key features
  - Troubleshooting quick reference
  - File structure
  - Next steps
  - Architecture overview

**Read Time:** 10 minutes

### APPRUNNER-INDEX.md
**This file - guide to all files and structure**

- **Purpose:** Navigation and file reference
- **Contents:** This comprehensive index and descriptions

---

## Configuration Files

### claude-desktop-apprunner-config.json
**Example Claude Desktop configuration**

- **Format:** JSON
- **Purpose:** Template for configuring your Claude Desktop MCP server
- **Usage:**
  1. Copy the contents
  2. Edit your Claude Desktop config file (see paths below)
  3. Paste and customize with your token and paths
  4. Restart Claude Desktop

**Claude Desktop Config Paths:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Key Fields:**
```json
{
  "command": "node",
  "args": ["/path/to/apprunner-mcp-connector.js"],
  "env": {
    "APPRUNNER_URL": "https://brruyqnwu2.eu-west-1.awsapprunner.com",
    "FENERGO_API_TOKEN": "Bearer YOUR_TOKEN_HERE",
    "FENERGO_TENANT_ID": "f488cdba-2122-448d-952c-7a2a47f78f1b"
  }
}
```

### test-apprunner-connector.json
**Test cases, examples, and Postman collection**

- **Format:** JSON
- **Purpose:** Test the connector with different scenarios
- **Contents:**
  - Description of each test
  - Complete test payload objects
  - Curl command examples
  - Postman collection format
  - Expected responses

**Test Cases Included:**
1. Health Check
2. Server Info
3. List Tools
4. Initialize Connection
5. Investigate Journey (Documents)
6. Investigate Journey (Requirements)
7. Invalid JSON-RPC (error handling)
8. Invalid JSON (error handling)

**Usage:**
```bash
# Use curl examples directly
curl http://localhost:8091/health

# Or import Postman collection into Postman
# Then run requests from the GUI
```

---

## Startup Scripts

### start-apprunner-connector.ps1
**PowerShell startup script (Windows)**

- **Purpose:** Easy startup with configuration prompts and validation
- **OS:** Windows (PowerShell 5+)
- **Benefits:**
  - Validates Node.js installation
  - Checks connector file exists
  - Handles environment variable setup
  - Provides helpful error messages
  - Graceful shutdown handling

**Usage:**
```powershell
# Basic (prompts for token)
.\start-apprunner-connector.ps1 -Token "Bearer YOUR_TOKEN"

# With custom configuration
.\start-apprunner-connector.ps1 -Token "Bearer YOUR_TOKEN" `
  -Port 8092 `
  -Timeout 60000 `
  -Retries 5
```

**Parameters:**
- `-Token` (required): Fenergo API token
- `-AppRunnerUrl`: AppRunner URL (default: configured)
- `-TenantId`: Tenant ID (default: configured)
- `-Port`: Local port (default: 8091)
- `-Timeout`: Request timeout in ms (default: 30000)
- `-Retries`: Max retry attempts (default: 2)

### start-apprunner-connector.sh
**Bash startup script (macOS/Linux)**

- **Purpose:** Easy startup with configuration and validation
- **OS:** macOS, Linux (bash/sh)
- **Benefits:**
  - Validates Node.js installation
  - Checks connector file exists
  - Handles environment variable setup
  - Colored output for easy reading
  - Graceful shutdown handling

**Usage:**
```bash
# Basic
./start-apprunner-connector.sh --token "Bearer YOUR_TOKEN"

# With options
./start-apprunner-connector.sh \
  --token "Bearer YOUR_TOKEN" \
  --port 8092 \
  --timeout 60000 \
  --retries 5

# Show help
./start-apprunner-connector.sh --help
```

**Parameters:**
- `-t, --token`: Fenergo API token (required)
- `-u, --url`: AppRunner URL (default: configured)
- `--tenant-id`: Tenant ID (default: configured)
- `-p, --port`: Local port (default: 8091)
- `--timeout`: Request timeout in ms (default: 30000)
- `--retries`: Max retry attempts (default: 2)
- `-h, --help`: Show help message

---

## Quick File Reference

### By Purpose

**Want to get started?**
→ Read `APPRUNNER-QUICK-START.md`

**Want detailed documentation?**
→ Read `APPRUNNER-CONNECTOR-GUIDE.md`

**Want an overview?**
→ Read `APPRUNNER-SETUP-SUMMARY.md`

**Want to test the connector?**
→ Use `test-apprunner-connector.json`

**Want to run it easily?**
→ Use `start-apprunner-connector.ps1` (Windows) or `start-apprunner-connector.sh` (macOS/Linux)

**Want to configure Claude?**
→ Copy from `claude-desktop-apprunner-config.json`

---

### By File Type

**JavaScript Application:**
- `apprunner-mcp-connector.js`

**Documentation:**
- `APPRUNNER-QUICK-START.md`
- `APPRUNNER-CONNECTOR-GUIDE.md`
- `APPRUNNER-SETUP-SUMMARY.md`
- `APPRUNNER-INDEX.md` (this file)

**Configuration:**
- `claude-desktop-apprunner-config.json`
- `test-apprunner-connector.json`

**Startup Scripts:**
- `start-apprunner-connector.ps1` (Windows)
- `start-apprunner-connector.sh` (macOS/Linux)

---

### By Operating System

**Windows Users:**
1. Start with: `APPRUNNER-QUICK-START.md`
2. For details: `APPRUNNER-CONNECTOR-GUIDE.md`
3. To run: Use `start-apprunner-connector.ps1`
4. Claude Desktop: Copy from `claude-desktop-apprunner-config.json`

**macOS Users:**
1. Start with: `APPRUNNER-QUICK-START.md`
2. For details: `APPRUNNER-CONNECTOR-GUIDE.md`
3. To run: Use `start-apprunner-connector.sh`
4. Claude Desktop: Copy from `claude-desktop-apprunner-config.json`

**Linux Users:**
1. Start with: `APPRUNNER-QUICK-START.md`
2. For details: `APPRUNNER-CONNECTOR-GUIDE.md`
3. To run: Use `start-apprunner-connector.sh`
4. Claude Desktop: Copy from `claude-desktop-apprunner-config.json`

---

## Getting Started

### Step 1: Choose Your Path

**Path A: Claude Desktop Integration (Recommended)**
- Follow: `APPRUNNER-QUICK-START.md` → Method A
- Provides direct Claude integration
- No separate server to manage

**Path B: Local HTTP Server**
- Follow: `APPRUNNER-QUICK-START.md` → Method B
- Useful for testing and debugging
- Can be used with custom applications

### Step 2: Read Documentation
- Start with `APPRUNNER-QUICK-START.md` (5 minutes)
- Reference `APPRUNNER-CONNECTOR-GUIDE.md` as needed
- Check `test-apprunner-connector.json` for examples

### Step 3: Gather Requirements
- Your Fenergo API token
- AppRunner URL: `https://brruyqnwu2.eu-west-1.awsapprunner.com`
- Tenant ID: `f488cdba-2122-448d-952c-7a2a47f78f1b`
- Node.js 18+ installed

### Step 4: Set Up

**For Claude Desktop:**
- Find Claude config file location (by OS)
- Copy configuration from `claude-desktop-apprunner-config.json`
- Replace token and path
- Restart Claude Desktop

**For Local Server:**
- Use startup script with your token
- Windows: `.\start-apprunner-connector.ps1 -Token "Bearer YOUR_TOKEN"`
- macOS/Linux: `./start-apprunner-connector.sh --token "Bearer YOUR_TOKEN"`

### Step 5: Test
- Run health check: `curl http://localhost:8091/health`
- Use examples from `test-apprunner-connector.json`
- Verify in Claude or via curl

---

## File Relationships

```
┌─────────────────────────────────────┐
│  APPRUNNER-QUICK-START.md           │ ← START HERE
│  (5 minute guide)                   │
└──────────┬──────────────────────────┘
           │
           ├─→ APPRUNNER-CONNECTOR-GUIDE.md
           │   (Complete reference)
           │
           ├─→ claude-desktop-apprunner-config.json
           │   (Claude configuration)
           │
           ├─→ start-apprunner-connector.ps1/.sh
           │   (Startup scripts)
           │
           └─→ apprunner-mcp-connector.js
               (Main application)

test-apprunner-connector.json
(Test cases and examples)

APPRUNNER-SETUP-SUMMARY.md
(Overview and next steps)

APPRUNNER-INDEX.md
(This file - navigation guide)
```

---

## File Sizes and Locations

| File | Size | Purpose |
|------|------|---------|
| `apprunner-mcp-connector.js` | 8.4 KB | Main application |
| `APPRUNNER-QUICK-START.md` | 5.7 KB | Quick setup guide |
| `APPRUNNER-CONNECTOR-GUIDE.md` | 11 KB | Full documentation |
| `APPRUNNER-SETUP-SUMMARY.md` | 8.5 KB | Overview |
| `APPRUNNER-INDEX.md` | 7.5 KB | This file |
| `claude-desktop-apprunner-config.json` | 501 B | Config template |
| `test-apprunner-connector.json` | 4.9 KB | Test cases |
| `start-apprunner-connector.ps1` | 4.2 KB | Windows startup |
| `start-apprunner-connector.sh` | 4.8 KB | macOS/Linux startup |

**Total:** ~59 KB of documentation and application code

---

## Troubleshooting by File

**Problem with startup script?**
→ Check: `start-apprunner-connector.ps1` or `.sh`

**Confused about setup?**
→ Read: `APPRUNNER-QUICK-START.md`

**Need detailed help?**
→ Check: `APPRUNNER-CONNECTOR-GUIDE.md` (Troubleshooting section)

**Want to test manually?**
→ Use: `test-apprunner-connector.json`

**Need to configure Claude?**
→ Use: `claude-desktop-apprunner-config.json`

---

## Environment Variables

All configured through:
- Startup scripts
- Configuration file
- Manual environment setup

**Key Variables:**
- `APPRUNNER_URL` - Your AppRunner service URL
- `FENERGO_API_TOKEN` - Bearer token for authentication
- `FENERGO_TENANT_ID` - Fenergo tenant identifier
- `PORT` - Local server port
- `REQUEST_TIMEOUT` - Timeout in milliseconds
- `MAX_RETRIES` - Retry attempts

See `APPRUNNER-CONNECTOR-GUIDE.md` for complete reference.

---

## Version Information

- **Created:** 2025-11-18
- **Connector Version:** 1.0.0
- **Node.js Required:** 18+
- **Protocol:** JSON-RPC 2.0
- **AppRunner Service:** https://brruyqnwu2.eu-west-1.awsapprunner.com

---

## Next Steps

1. **Read** `APPRUNNER-QUICK-START.md` (5 min)
2. **Choose** integration method (Claude Desktop or HTTP Server)
3. **Follow** setup instructions for your method
4. **Test** using examples in `test-apprunner-connector.json`
5. **Use** tools in Claude or your application

---

**Questions?** See the troubleshooting section in `APPRUNNER-CONNECTOR-GUIDE.md`

**Ready?** Start with `APPRUNNER-QUICK-START.md` 🚀
