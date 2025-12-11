# ChatGPT Connector Setup for Fenergo Insights

This guide shows you how to add Fenergo Insights as a **ChatGPT Connector** that works in **all your ChatGPT conversations**.

## What This Creates

- ✅ Universal tool available in **ALL** ChatGPT conversations
- ✅ Similar experience to Claude Desktop's MCP connector
- ✅ Uses the same AppRunner backend as Claude MCP
- ✅ Works on web and mobile ChatGPT

## Architecture

```
ChatGPT (any conversation)
    ↓
ChatGPT Connector (OpenAPI/REST)
    ↓
AppRunner Backend (shared)
    ↓
Fenergo Nebula API
```

## Important Note About Availability

⚠️ **ChatGPT Connectors are currently only available via:**

1. **ChatGPT Enterprise** - Organization-level connectors (admin can deploy)
2. **Custom GPTs** - Individual bot with connector built-in
3. **OpenAI API** - Build your own interface with function calling

**For Individual ChatGPT Plus users:** Universal connectors are not yet available. You'll need to use a Custom GPT instead (see [CHATGPT_GPT_SETUP.md](CHATGPT_GPT_SETUP.md)).

## Option 1: ChatGPT Enterprise Connector (Recommended)

If you have **ChatGPT Enterprise**, you can register this as a universal connector.

### Prerequisites

- ChatGPT Enterprise account ($60/user/month)
- Admin access to organization settings
- AppRunner backend deployed

### Setup Steps

1. **Deploy AppRunner Backend**
   ```bash
   # The backend must be deployed first
   # See DEPLOY_APPRUNNER.md for instructions
   ```

2. **Register the Connector**
   - Go to your ChatGPT Enterprise admin settings
   - Navigate to **"Connectors"** or **"Actions"** section
   - Click **"Add Connector"** or **"Import"**
   - Enter the manifest URL:
     ```
     https://tc8srxrkcp.eu-west-1.awsapprunner.com/.well-known/ai-plugin.json
     ```

3. **Configure Authentication**
   - Auth type: **None** (authentication is handled by the backend SSO flow)
   - The backend uses Fenergo OIDC SSO which prompts users to authenticate when needed

4. **Enable for Users**
   - Choose which users/groups should have access
   - Save and publish the connector

### Testing

Once registered, users can ask Fenergo questions in any ChatGPT conversation:

```
"Show me documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
```

ChatGPT will:
1. Recognize the journey query
2. Call the `queryJourneyInsights` tool
3. If authentication is needed, prompt user to authenticate via SSO
4. Return the journey insights

## Option 2: Custom GPT with Connector (ChatGPT Plus)

For ChatGPT Plus users (not Enterprise), create a Custom GPT with the connector built-in.

**Setup:** See [CHATGPT_GPT_SETUP.md](CHATGPT_GPT_SETUP.md)

**Pros:**
- ✅ Available now with ChatGPT Plus ($20/month)
- ✅ Works on web and mobile

**Cons:**
- ❌ Must open that specific GPT (not universal)
- ❌ Not available in all conversations

## Technical Details

### Connector Manifest Location

The connector manifest is served at the standard location:
```
https://tc8srxrkcp.eu-west-1.awsapprunner.com/.well-known/ai-plugin.json
```

### OpenAPI Schema Location

The OpenAPI 3.1 schema is served at:
```
https://tc8srxrkcp.eu-west-1.awsapprunner.com/openapi.json
```

### Available Operations

The connector provides one main operation:

**`queryJourneyInsights`** - Query journey documents and requirements
- **Endpoint:** `POST /execute`
- **Parameters:**
  - `message` (string) - Natural language question
  - `scope.documentContext.contextId` (UUID) - Journey ID
  - `scope.documentContext.contextLevel` (string) - Always "Journey"

### Authentication Flow

1. User asks about a journey in ChatGPT
2. ChatGPT calls the connector
3. If no cached token exists:
   - Backend returns 401 with SSO instructions
   - User clicks SSO URL and authenticates
   - Token is cached server-side (1 hour)
4. If token exists:
   - Backend uses cached token
   - Returns journey insights

### Logo

The connector uses a simple placeholder logo served at:
```
https://tc8srxrkcp.eu-west-1.awsapprunner.com/logo.png
```

To use a custom Fenergo logo, replace the logo endpoint in [apprunner-backend.js:259](apprunner-backend.js#L259).

## Comparison: Claude MCP vs ChatGPT Connector

| Feature | Claude MCP | ChatGPT Connector |
|---------|------------|-------------------|
| **Protocol** | MCP (stdio) | REST/OpenAPI |
| **Availability** | Desktop only | Web + Mobile |
| **Setup** | Config file | Enterprise admin |
| **Authentication** | SSO via backend | SSO via backend |
| **Backend** | Same AppRunner | Same AppRunner |
| **Cost** | $20/mo Pro | $60/mo Enterprise |
| **Voice input** | ❌ No | ✅ Yes |
| **Universal access** | ✅ Yes | ✅ Yes (Enterprise) |

## Example Usage

Once the connector is registered, users can ask:

```
"What documents are required for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61?"

"Show me the compliance status of journey abc-123"

"Who uploaded the account opening form for journey xyz-456?"

"List all incomplete requirements for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
```

ChatGPT will automatically use the `fenergo_journey_insights` connector to answer these questions.

## Troubleshooting

### Connector not appearing in settings
- **Solution:** Verify you have ChatGPT Enterprise (not Plus)
- Enterprise admins can add connectors organization-wide
- Plus users need to use Custom GPTs instead

### Authentication errors
- **Solution:** Check AppRunner logs for SSO issues
- Verify OIDC client ID and secret are configured correctly
- Ensure `mcp-client` is registered in Fenergo identity provider

### 401 Unauthorized errors
- **Solution:** User needs to authenticate via SSO
- Click the authentication URL provided in the error message
- Token is cached for 1 hour after successful authentication

### Connector not calling the API
- **Solution:** Check OpenAPI schema is valid
- Verify manifest URL is accessible: `https://tc8srxrkcp.eu-west-1.awsapprunner.com/.well-known/ai-plugin.json`
- Check ChatGPT logs for errors

## Deployment Checklist

Before registering the connector, ensure:

- [ ] AppRunner backend is deployed and healthy (`/health` returns 200)
- [ ] OpenAPI schema is accessible (`/openapi.json` returns valid schema)
- [ ] Connector manifest is accessible (`/.well-known/ai-plugin.json` returns manifest)
- [ ] Logo is accessible (`/logo.png` returns image)
- [ ] OIDC SSO is configured correctly (client ID, secret, redirect URI)
- [ ] Test journey ID is available for testing

## Support

- **Backend Issues:** Check CloudWatch logs for `mcp-fenergo-insights` service
- **Authentication Issues:** Verify OIDC configuration in AppRunner environment
- **ChatGPT Issues:** Contact OpenAI Enterprise support
- **GitHub:** Repository for this project

## Security Notes

- ✅ All traffic over HTTPS
- ✅ OAuth/OIDC SSO for authentication
- ✅ Tokens cached server-side only
- ✅ No credentials stored in client
- ✅ Same security model as Claude MCP connector

## Next Steps

1. Deploy AppRunner backend with new connector endpoints
2. Register connector in ChatGPT Enterprise settings
3. Test with a sample journey query
4. (Optional) Replace placeholder logo with Fenergo branding
5. Roll out to users

## Files Modified

- `apprunner-backend.js` - Added `/.well-known/ai-plugin.json` and `/logo.png` endpoints
- `chatgpt-connector-manifest.json` - Connector manifest definition
- `openapi-chatgpt.json` - OpenAPI schema for the API

## License

Proprietary - Fenergo Internal Use Only
