# 🚀 START HERE - AppRunner MCP Connector

Welcome! Your Claude AI connector for AWS AppRunner has been created.

**This document explains what was created and how to get started in less than 5 minutes.**

---

## ✅ What Was Created

Your complete AppRunner connector setup with:

- ✅ **1 Main Application** - `apprunner-mcp-connector.js`
- ✅ **5 Documentation Files** - Complete guides and references
- ✅ **2 Configuration Files** - Ready-to-use templates
- ✅ **2 Startup Scripts** - For Windows, macOS, and Linux

**Total:** 10 files, ~60 KB of code, documentation, and configuration

---

## 🎯 Choose Your Path

### Path A: Claude Desktop (Recommended ⭐)
**Best if:** You want to use Claude directly with your AppRunner service

**Time needed:** 5 minutes

**Steps:**
1. Find your Claude Desktop config file (see paths below)
2. Copy configuration from `claude-desktop-apprunner-config.json`
3. Replace your token and file path
4. Restart Claude Desktop
5. Done!

**Click here to get started:** [APPRUNNER-QUICK-START.md](APPRUNNER-QUICK-START.md) → Method A

---

### Path B: Local HTTP Server
**Best if:** You want to test locally or use in custom applications

**Time needed:** 2 minutes

**Steps:**
1. Get your Fenergo API token
2. Run the startup script with your token
3. Test with health check command
4. Done!

**Click here to get started:** [APPRUNNER-QUICK-START.md](APPRUNNER-QUICK-START.md) → Method B

---

## 📁 How to Use These Files

### Main Application
- **apprunner-mcp-connector.js** - The actual connector that does the work

### Start Reading Here
1. **README-APPRUNNER.md** - Overview (3 min)
2. **APPRUNNER-QUICK-START.md** - Setup guide (5 min) ⭐ MOST IMPORTANT
3. **APPRUNNER-CONNECTOR-GUIDE.md** - Complete reference (read as needed)

### If You Get Stuck
- See **Troubleshooting** section in `APPRUNNER-CONNECTOR-GUIDE.md`
- Check `test-apprunner-connector.json` for examples

### For Navigation
- **APPRUNNER-INDEX.md** - Guide to all files
- **APPRUNNER-SETUP-SUMMARY.md** - Quick reference

### Configuration
- **claude-desktop-apprunner-config.json** - Copy this into your Claude config
- **test-apprunner-connector.json** - Test examples

### Running the Connector
- **start-apprunner-connector.ps1** - Windows startup script
- **start-apprunner-connector.sh** - macOS/Linux startup script

---

## ⚡ Quick Start (5 Minutes)

### If You're Using Claude Desktop

```bash
# 1. Find your Claude config file location:
# Windows: %APPDATA%\Claude\claude_desktop_config.json
# macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
# Linux: ~/.config/Claude/claude_desktop_config.json

# 2. Open it and add this configuration:
{
  "mcpServers": {
    "fenergo-apprunner": {
      "command": "node",
      "args": ["/path/to/apprunner-mcp-connector.js"],
      "env": {
        "APPRUNNER_URL": "https://brruyqnwu2.eu-west-1.awsapprunner.com",
        "FENERGO_API_TOKEN": "Bearer YOUR_TOKEN_HERE",
        "FENERGO_TENANT_ID": "f488cdba-2122-448d-952c-7a2a47f78f1b"
      }
    }
  }
}

# 3. Replace:
#    - /path/to/ with the full path to apprunner-mcp-connector.js
#    - YOUR_TOKEN_HERE with your Fenergo API token

# 4. Save the file

# 5. Restart Claude Desktop

# 6. Done! Ask Claude to access your Fenergo AppRunner tools
```

### If You're Using Local HTTP Server

**Windows:**
```powershell
.\start-apprunner-connector.ps1 -Token "Bearer YOUR_TOKEN_HERE"
```

**macOS/Linux:**
```bash
./start-apprunner-connector.sh --token "Bearer YOUR_TOKEN_HERE"
```

**Test it:**
```bash
curl http://localhost:8091/health
```

---

## 📋 What You Need

- [ ] Your Fenergo API token (ask your organization)
- [ ] Node.js 18+ installed (for HTTP server mode)
- [ ] Internet connection to AppRunner service
- [ ] 5 minutes

---

## 🆘 Common Questions

### "Where do I get my API token?"
Ask your organization/administrator for your Fenergo API token. It should be in Bearer format.

### "I don't see the connector in Claude"
1. Make sure you used the **full path** to `apprunner-mcp-connector.js`
2. Make sure you saved the config file
3. **Restart Claude Desktop** completely
4. Try again

### "Can I test the connector before using Claude?"
Yes! Run the HTTP server version:
```bash
# Windows
.\start-apprunner-connector.ps1 -Token "Bearer YOUR_TOKEN"

# macOS/Linux
./start-apprunner-connector.sh --token "Bearer YOUR_TOKEN"

# Then test
curl http://localhost:8091/health
```

### "What's the difference between Path A and Path B?"
- **Path A (Claude Desktop):** Connector runs when Claude starts, integrated directly
- **Path B (HTTP Server):** Connector runs as a separate server, you call it manually

Choose Path A for ease, Path B for testing/debugging.

---

## 📚 Documentation Map

```
YOU ARE HERE ↓
START-HERE.md
    ↓
    ├─ Quick start? → APPRUNNER-QUICK-START.md ⭐
    │
    ├─ Full reference? → APPRUNNER-CONNECTOR-GUIDE.md
    │
    ├─ Overview? → README-APPRUNNER.md
    │
    ├─ File guide? → APPRUNNER-INDEX.md
    │
    ├─ Setup summary? → APPRUNNER-SETUP-SUMMARY.md
    │
    ├─ Configuration? → claude-desktop-apprunner-config.json
    │
    └─ Testing? → test-apprunner-connector.json
```

---

## 🎯 Next Step

**Click here and follow the 5-minute setup guide:**

### 👉 [APPRUNNER-QUICK-START.md](APPRUNNER-QUICK-START.md)

---

## ⚙️ Technical Overview

```
Your Application (Claude Desktop or Custom App)
              ↓
apprunner-mcp-connector.js (Proxy & Retry Logic)
              ↓
AWS AppRunner Service
https://brruyqnwu2.eu-west-1.awsapprunner.com
              ↓
Fenergo Nebula API
              ↓
Your Documents & Requirements Data
```

---

## ✨ Key Features

- ✅ **Automatic retry** - Handles temporary failures
- ✅ **Secure** - Uses Bearer token authentication
- ✅ **Fast** - Minimal overhead and latency
- ✅ **Reliable** - Production-ready with error handling
- ✅ **Easy to use** - Simple setup, clear documentation

---

## 🔗 Important URLs

- **AppRunner Service:** `https://brruyqnwu2.eu-west-1.awsapprunner.com`
- **MCP Endpoint:** `/mcp`
- **Local Server:** `http://localhost:8091` (when running HTTP server)

---

## 📞 Need Help?

1. **Setup issues?** → See [APPRUNNER-QUICK-START.md](APPRUNNER-QUICK-START.md)
2. **Detailed questions?** → See [APPRUNNER-CONNECTOR-GUIDE.md](APPRUNNER-CONNECTOR-GUIDE.md)
3. **Not sure which file?** → See [APPRUNNER-INDEX.md](APPRUNNER-INDEX.md)
4. **Want examples?** → See [test-apprunner-connector.json](test-apprunner-connector.json)

---

## ✅ Verification Checklist

Before starting, verify you have:

- [ ] Node.js 18+ installed
- [ ] Your Fenergo API token
- [ ] Access to this directory with the files
- [ ] 5 minutes to complete setup
- [ ] Either Claude Desktop or curl/Postman for testing

---

## 🚀 Ready?

**Open [APPRUNNER-QUICK-START.md](APPRUNNER-QUICK-START.md) now and follow the setup steps!**

It will take less than 5 minutes.

---

**Questions while reading the quick start?** Check the Troubleshooting section in [APPRUNNER-CONNECTOR-GUIDE.md](APPRUNNER-CONNECTOR-GUIDE.md)

---

*Created: 2025-11-18 | Version: 1.0.0*
