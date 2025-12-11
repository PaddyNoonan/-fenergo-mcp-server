# ChatGPT Custom GPT Setup for Fenergo Insights

This guide shows you how to create a custom ChatGPT GPT that connects to the Fenergo Nebula API using the same AppRunner backend as the Claude Desktop connector.

## Prerequisites

- ChatGPT Plus or Enterprise account (required for custom GPTs)
- AppRunner backend deployed and running
- Fenergo tenant ID

## Step 1: Create the Custom GPT

1. Go to https://chat.openai.com
2. Click your profile icon (bottom left)
3. Select **"My GPTs"**
4. Click **"Create a GPT"**

## Step 2: Configure the GPT

### Name
```
Fenergo Journey Insights
```

### Description
```
Expert assistant for querying Fenergo Nebula document management system. Ask me about customer journey documents, requirements, and compliance status.
```

### Instructions
```
You are a helpful assistant that helps users query the Fenergo Nebula document management system. You can answer questions about:
- Documents associated with customer journeys
- Document requirements and their status
- Compliance information
- Document metadata (upload dates, types, etc.)

When a user asks about a journey:
1. Extract the journey ID (GUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
2. Use the queryJourneyInsights action to get information
3. Present the response in a clear, organized format
4. If you get a 401 error, inform the user they need to authenticate first

Always ask for the journey ID if the user doesn't provide one. Journey IDs are in GUID format.

Example queries users might ask:
- "What documents are on journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61?"
- "Show me the status of requirements for journey abc123..."
- "Tell me about the compliance docs for journey xyz..."
```

### Conversation starters
```
1. "Show me documents for a journey"
2. "Check requirements status"
3. "List all journey documents"
4. "What's the compliance status?"
```

## Step 3: Configure Actions

1. Scroll down to **"Actions"** section
2. Click **"Create new action"**
3. Click **"Import from URL"**
4. Enter: `https://tc8srxrkcp.eu-west-1.awsapprunner.com/openapi.json`
5. Click **"Import"**

The OpenAPI schema will be automatically imported.

### Authentication

Since the backend requires SSO authentication, you have two options:

#### Option A: No Authentication (for testing)
- Select **"None"**
- Users will need to authenticate manually via the `/auth/login` endpoint first
- Good for POC/testing

#### Option B: API Key (recommended for production)
If you add API key support to AppRunner:
- Select **"API Key"**
- Set Auth Type: **"Bearer"**
- Users will need to provide their Fenergo access token

#### Option C: OAuth (future enhancement)
- Would require modifying AppRunner to support OAuth for ChatGPT
- Most secure but most complex to set up

## Step 4: Configure Privacy Settings

1. Scroll to **"Additional Settings"**
2. Choose:
   - **Private** - Only you can use it
   - **Shared** - Share via link
   - **Public** - Anyone can find and use it (not recommended for enterprise)

## Step 5: Test the GPT

1. Click **"Save"** (top right)
2. In the chat window, try asking:
   ```
   Show me documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61
   ```

### Expected Flow

**If authenticated:**
```
User: Show me documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61

GPT: I found 3 documents for this journey:

1. Screenshot of Listing
   - Type: Screenshot of Listing
   - Status: Completed
   - Uploaded: Dec 5, 2025 by Juarez.Filho@fenergo.com

2. Account Opening Form
   - Type: Account Opening Form
   - Status: Completed
   - Uploaded: Dec 5, 2025 by Juarez.Filho@fenergo.com

3. Brand Guidelines
   - Type: Not Classified
   - Status: Completed
   - Uploaded: Dec 5, 2025 by Juarez.Filho@fenergo.com

All documents are in completed status with no errors.
```

**If not authenticated:**
```
GPT: I received an authentication error. You need to authenticate with Fenergo first.

To authenticate:
1. Visit the SSO login page
2. Complete authentication
3. Try your query again

Would you like me to help you start the authentication process?
```

## Architecture

```
ChatGPT (OpenAI)
    ↓ HTTPS (Actions API)
AppRunner Backend (SHARED with Claude)
    ↓ HTTPS
Fenergo Nebula API
```

## Sharing the GPT

### Share with Team
1. Go to **"My GPTs"**
2. Click on your Fenergo GPT
3. Click **"Share"** (top right)
4. Copy the share link
5. Send to team members

### Publishing (ChatGPT Enterprise only)
1. Go to **"My GPTs"**
2. Click **"Publish to workspace"**
3. Add description and categories
4. Submit for admin approval

## Troubleshooting

### Error: "Action failed"
- Check that AppRunner backend is running: `https://tc8srxrkcp.eu-west-1.awsapprunner.com/health`
- Verify the OpenAPI schema is accessible: `https://tc8srxrkcp.eu-west-1.awsapprunner.com/openapi.json`

### Error: "401 Unauthorized"
- User needs to authenticate via SSO first
- You can add authentication guidance in the GPT instructions

### Error: "Invalid journey ID"
- Journey ID must be a valid GUID format
- Check that the ID exists in Fenergo

## Comparison: ChatGPT vs Claude Desktop

| Feature | ChatGPT GPT | Claude Desktop MCP |
|---------|-------------|-------------------|
| **Interface** | Web browser | Desktop app |
| **Cost** | $20/mo (Plus) | $20/mo (Pro) |
| **Sharing** | Share link | Config file |
| **Mobile** | ✅ Yes (browser) | ❌ No |
| **Custom UI** | ❌ Limited | ✅ Full desktop |
| **Voice input** | ✅ Yes | ❌ No |
| **Backend** | Shared AppRunner | Shared AppRunner |

## Next Steps

1. **Add more actions** - Create additional endpoints for other Fenergo APIs
2. **Enhanced auth** - Implement proper OAuth flow for ChatGPT
3. **Knowledge base** - Add Fenergo documentation as GPT knowledge
4. **Fine-tuning** - Customize responses based on your use cases

## Support

For issues or questions:
- AppRunner backend: See `DEPLOY_APPRUNNER.md`
- ChatGPT GPTs: https://help.openai.com/en/collections/7178361-custom-gpts
- OpenAPI schema: See `openapi-chatgpt.json`
