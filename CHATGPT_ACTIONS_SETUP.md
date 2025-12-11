# ChatGPT Actions Setup for Fenergo Insights

This guide shows you how to add Fenergo Insights as a **ChatGPT Action** (connector) that works in **all your ChatGPT conversations**, similar to how MCP works for Claude Desktop.

## What This Does

- ✅ Adds Fenergo querying as a tool in **ALL** ChatGPT conversations
- ✅ No need for a custom GPT
- ✅ Works just like Claude Desktop's MCP connector
- ✅ Invoke the tool whenever you need it

## Prerequisites

- ChatGPT Plus or Enterprise account
- AppRunner backend deployed
- OpenAI API access (for Actions configuration)

## Important Note

⚠️ **As of January 2025, ChatGPT Actions are only available via:**
1. **Custom GPTs** (what the old guide showed)
2. **ChatGPT Enterprise** (Actions in account settings)
3. **OpenAI API** (function calling)

**OpenAI has not released universal Actions for ChatGPT Plus users yet.**

## Your Options

### Option 1: Custom GPT (Available Now)
Create a custom GPT with the Fenergo action built-in. You can use this GPT whenever you need to query Fenergo.

**Pros:**
- ✅ Available right now with ChatGPT Plus
- ✅ Works in web and mobile
- ✅ Can share with team

**Cons:**
- ❌ Need to open that specific GPT
- ❌ Not available in all conversations

**Setup:** See [CHATGPT_GPT_SETUP.md](CHATGPT_GPT_SETUP.md)

### Option 2: ChatGPT Enterprise Actions (Enterprise Only)
If you have ChatGPT Enterprise, you can add Actions at the account level.

**Pros:**
- ✅ Available in ALL conversations
- ✅ True connector experience (like MCP)
- ✅ Admin can deploy for all users

**Cons:**
- ❌ Requires ChatGPT Enterprise ($60/user/month)

**Setup:**
1. Go to https://platform.openai.com/settings
2. Navigate to **"Actions"** (Enterprise only)
3. Click **"Create Action"**
4. Import from URL: `https://tc8srxrkcp.eu-west-1.awsapprunner.com/openapi.json`
5. Configure authentication (see below)

### Option 3: OpenAI API with Function Calling (Developer)
Build your own chat interface that uses OpenAI API function calling.

**Pros:**
- ✅ Full control over UX
- ✅ Can embed in any application
- ✅ True connector behavior

**Cons:**
- ❌ Requires coding
- ❌ Need to build custom interface
- ❌ Pay per token

**Architecture:**
```
Your App → OpenAI API (with functions) → Your Backend → Fenergo API
```

## Recommended Approach

**For Individual Use:**
→ Use **Custom GPT** (Option 1) - Available now with Plus

**For Enterprise Deployment:**
→ Use **Enterprise Actions** (Option 2) if you have Enterprise
→ OR build **Custom Web Interface** (Option 3) with OpenAI API

**For Now (January 2025):**
→ Stick with **Claude Desktop MCP** for the true connector experience
→ Use **Custom GPT** for ChatGPT when you need web/mobile access

## Current Limitation

OpenAI hasn't released universal Actions for ChatGPT Plus yet. The closest you can get is:
1. **Custom GPT** - Specific bot with the action
2. **Enterprise Actions** - If you pay for Enterprise
3. **Build your own** - Using OpenAI API

## Alternative: Bookmark the Custom GPT

You can create a Custom GPT and add it to your bookmark bar/home screen for quick access:

1. Create the Custom GPT (see [CHATGPT_GPT_SETUP.md](CHATGPT_GPT_SETUP.md))
2. Get the GPT URL: `https://chat.openai.com/g/g-XXXXXXXX`
3. Add to bookmarks or home screen
4. Click whenever you need Fenergo access

This gives you ~90% of the connector experience.

## Comparison

| Feature | Claude MCP | ChatGPT Custom GPT | ChatGPT Enterprise Actions |
|---------|------------|-------------------|---------------------------|
| **Available in all chats** | ✅ Yes | ❌ No | ✅ Yes |
| **Quick access** | ✅ Built-in | ⚠️ Via bookmark | ✅ Built-in |
| **Cost** | $20/mo | $20/mo | $60/mo |
| **Mobile** | ❌ No | ✅ Yes | ✅ Yes |
| **Voice** | ❌ No | ✅ Yes | ✅ Yes |
| **Setup time** | 5 min | 10 min | 5 min (admin) |

## My Recommendation

**For now, I recommend:**

1. **Primary: Claude Desktop MCP** (you already have this)
   - Best connector experience
   - Works in all conversations
   - $20/mo Claude Pro

2. **Secondary: ChatGPT Custom GPT** (optional)
   - For when you need web/mobile
   - For voice queries
   - Add to bookmarks for quick access

3. **Future: Wait for OpenAI Universal Actions**
   - OpenAI may release this for Plus users
   - Would give true connector experience
   - Check for updates in 2025

## Setup Next Steps

Since universal Actions aren't available yet, would you like me to:

1. ✅ **Keep the Custom GPT guide** - For web/mobile access when needed
2. ❌ **Skip ChatGPT entirely** - Stick with Claude Desktop only
3. ⚠️ **Build a custom web interface** - Using OpenAI API (requires development)

What's your preference?

## Technical Note

The OpenAPI schema is ready at:
```
https://tc8srxrkcp.eu-west-1.awsapprunner.com/openapi.json
```

This will work for:
- Custom GPTs (now)
- Enterprise Actions (if you have Enterprise)
- Future universal Actions (when released)
