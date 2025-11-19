# OAuth Quick Start Guide

## 🎯 What You Need to Do (5 minutes)

### Step 1: Add Environment Variables to AWS AppRunner

1. Open AWS AppRunner console
2. Click service: `fenergo-mcp-server`
3. Click **Edit**
4. Add these three variables:

```
FENERGO_CLIENT_ID = quasar-sandbox
FENERGO_CLIENT_SECRET = 4dxIqk+/MnT6hIKecUFa1iqjLs/AhorbUQgMWjTDQqI=
FENERGO_OAUTH_ENDPOINT = https://identity.fenxstable.com/connect/token
```

5. Click **Save**
6. Wait 2-3 minutes for restart

### Step 2: Test in Claude Desktop

1. Restart Claude Desktop
2. Start new chat
3. Ask Claude to authenticate:
   ```
   Authenticate me to Fenergo with:
   Username: your.email@company.com
   Password: your-password
   Tenant ID: f488cdba-2122-448d-952c-7a2a47f78f1b
   ```
4. Claude should respond: **"Successfully authenticated"**

### Step 3: Use investigate_journey

```
Can you show me documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61?
```

Done! ✅

---

## 🔍 Test Health Endpoint

```bash
curl https://brruyqnwu2.eu-west-1.awsapprunner.com/health
```

Should return `200 OK`

---

## 📋 What Changed

| File | Change | Impact |
|------|--------|--------|
| `oauth-auth.js` | ✨ NEW | OAuth 2.0 implementation |
| `apprunner-backend.js` | 📝 UPDATED | Added `/authenticate` endpoint |
| `apprunner-mcp-connector.js` | 📝 UPDATED | Added `authenticate_fenergo` tool, token caching |
| `claude_desktop_config.json` | 📝 UPDATED | Removed static Bearer token |

---

## 🎯 Key Features

✅ **Interactive Authentication** - Users enter credentials in Claude Desktop
✅ **Session Caching** - Token cached for entire conversation
✅ **Fallback Security** - If OAuth fails, uses static token (system stays working)
✅ **Zero Storage** - No tokens in config files
✅ **Password Safe** - Passwords never logged or stored

---

## ⚠️ If OAuth Still Fails

**Check AppRunner logs:**
```bash
aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow --region eu-west-1
```

**Look for errors like:**
- `[OAuth] Error response: invalid_request` → Check client credentials
- `[OAuth] Request error` → Network issue to Fenergo
- `[OAuth] Failed to parse response` → Unexpected OAuth response format

**See [OAUTH_SETUP_FINAL_STEPS.md](OAUTH_SETUP_FINAL_STEPS.md) for troubleshooting**

---

## 📚 Full Documentation

- [OAUTH_IMPLEMENTATION_COMPLETE.md](OAUTH_IMPLEMENTATION_COMPLETE.md) - Complete details
- [OAUTH_SETUP_FINAL_STEPS.md](OAUTH_SETUP_FINAL_STEPS.md) - Step-by-step setup
- [APPRUNNER_SOURCE_DEPLOYMENT.md](APPRUNNER_SOURCE_DEPLOYMENT.md) - AppRunner info

---

## ✨ You're Almost Done!

Just add those 3 environment variables and test. Everything else is ready.

