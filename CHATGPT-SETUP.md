# Fenergo Nebula Journey Investigation GPT - Setup Instructions

## Overview
This Custom GPT connects ChatGPT Enterprise to the Fenergo Nebula API to investigate journeys, documents, and requirements.

## Step 1: Create the Custom GPT

1. Go to ChatGPT Enterprise
2. Click **Explore GPTs** → **Create**
3. Enter the following configuration:

### Name
```
Fenergo Journey Insights Agent
```

### Description
```
AI assistant for investigating Fenergo Nebula journeys, analyzing documents, and checking requirements status
```

### Instructions
```
You are an expert Fenergo Nebula journey investigation assistant. Your role is to help users understand journey status, document requirements, and compliance information.

CRITICAL INSTRUCTIONS:

1. ALWAYS extract the Journey ID (GUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) from the user's question
2. Ask the user whether they want to investigate "documents" or "requirements" if not clear
3. Use the investigateJourney action with the appropriate scope:
   - For documents: set documentContext with the journey ID
   - For requirements: set documentRequirementContext with the journey ID

4. When calling the API:
   - Extract the journey ID from the user's query
   - Format the message as the user's natural language question
   - Set scope based on whether they're asking about documents or requirements
   - Include the X-Tenant-Id header (already configured)

5. Present results in a clear, professional format:
   - Summarize key findings first
   - List any missing documents or requirements
   - Highlight any compliance issues
   - Provide actionable recommendations

6. If the API returns no data:
   - Inform the user that the journey may not exist or has no data
   - Suggest verifying the journey ID
   - Ask if they'd like to try a different scope (documents vs requirements)

RESPONSE FORMAT:
Always structure your responses as:
1. Summary of findings
2. Detailed analysis
3. Action items (if applicable)
4. Next steps or follow-up questions

Remember: You're helping compliance and operations teams make informed decisions about customer journeys.
```

### Conversation Starters
```
What documents are required for journey [Journey ID]?
Show me the status of journey [Journey ID]
Are there any missing documents for journey [Journey ID]?
What requirements are outstanding for journey [Journey ID]?
```

## Step 2: Configure the Action

1. In the **Actions** section, click **Create new action**
2. Select **Import from URL** or **Paste OpenAPI schema**
3. Copy the contents of `chatgpt-openapi-spec.yaml` and paste it
4. Click **Import**

## Step 3: Configure Authentication

1. In the **Authentication** section:
   - Select **Authentication Type**: `Bearer`
   - **Token**: Paste your Fenergo Bearer token:
     ```
     Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjFBMUY1QjJBMzI3RDEzNjlDQjZGMjdENEExMzNFOTM3NzFFMkY2MTciLCJ4NXQiOiJHaDliS2pKOUUybkxieWZVb1RQcE4zSGk5aGMiLCJ0eXAiOiJhdCtqd3QifQ.eyJpc3MiOiJodHRwczovL2lkZW50aXR5LmZlbnhzdGFibGUuY29tIiwibmJmIjoxNzYyOTQxMTIxLCJpYXQiOjE3NjI5NDExMjEsImV4cCI6MTc2Mjk0MjAyMSwiYXVkIjoiRmVuZXJnby5OZWJ1bGEuQXV0aG9yaXplciIsInNjb3BlIjpbIm9wZW5pZCIsInByb2ZpbGUiLCJ0ZW5hbnQiLCJmZW54LmFsbCIsInJvbGVzIl0sImFtciI6WyJwd2QiXSwiY2xpZW50X2lkIjoiZmVuZXJnby1uZWJ1bGEtYWRtaW4tdG9vbCIsInN1YiI6IjI2YWM3YjI4LWE5MTItNDA5OC1iYTc3LTRhOTU0ZTc2YmMyMSIsImF1dGhfdGltZSI6MTc2Mjk0MTEyMCwiaWRwIjoibG9jYWwiLCJ0ZW5hbnQiOiJmNDg4Y2RiYS0yMTIyLTQ0OGQtOTUyYy03YTJhNDdmNzhmMWIiLCJzaWQiOiI2N0JBNUE2MEVDNEZBOTJCMDNGQkI4NzJFMjY4RENDMiJ9.Lxc23gSKWM-d52cjAZ-WszhKx_hReFJ8rkLtUH1BJ5r4f8wTtRe6GfBdHNeOXbVcoNlm_pqAgSDT2-95fYSkYTFRpBcGWH-rXLN9w5NHvpxv3SRH9sMkXN_2KPqsmz7SlWatJ6iugoIPHNvNhEbMMKGmi4IsKi9G_LrW4RsvMznAwfsVj8AWswatpWlf3llTTfbpZ1xuv0p7JEICUGjjKVfIde50g7yA5vJL8oht-i4Yi8Gh9jzsykADJH3TOcmyihd71iEzC_IHdCBjppCcoVl_b9EPgSMVl94K-0xDTQrqYFywfCsYfXAlNYRQn7JoBTu4X6S2Lb7gFAM1C6Ch9w
     ```

2. **IMPORTANT**: This token expires every 15 minutes. You'll need to update it regularly:
   - Generate new token from `https://identity.fenxstable.com`
   - Update the Bearer token in the GPT's Authentication settings
   - Click **Save**

## Step 4: Set Privacy & Sharing

1. **Privacy**: 
   - Select **Only you** (for testing) or **Anyone with the link** (for team sharing)
   - For enterprise-wide access, contact your ChatGPT admin

2. **Capabilities**:
   - ✅ Enable **Web Browsing** (optional, for additional context)
   - ✅ Enable **Code Interpreter** (optional, for data analysis)
   - ✅ Enable **DALL·E** (optional)

## Step 5: Test the GPT

1. Click **Test** or **Save** → **View GPT**
2. Try these test queries:
   ```
   What documents are required for journey b44f1862-cc32-4296-898d-c92a881c7fff?
   ```
   ```
   Show me the requirements status for journey 02637420-c5e0-4036-a6e1-83991d341d5a
   ```

## Step 6: Publish (Optional)

1. Click **Save** → **Publish**
2. Choose your sharing option:
   - **Only me**: Private testing
   - **Anyone with the link**: Team sharing
   - **Public**: Available in GPT Store (requires ChatGPT Plus/Enterprise)

## Usage Examples

### Example 1: Check Documents
```
User: "What documents are missing for journey b44f1862-cc32-4296-898d-c92a881c7fff?"

GPT calls investigateJourney with:
{
  "data": {
    "message": "What documents are missing for journey b44f1862-cc32-4296-898d-c92a881c7fff?",
    "scope": {
      "documentContext": {
        "contextLevel": "Journey",
        "contextId": "b44f1862-cc32-4296-898d-c92a881c7fff"
      },
      "documentRequirementContext": null
    },
    "conversationHistory": []
  }
}
```

### Example 2: Check Requirements
```
User: "Are all requirements complete for journey 02637420-c5e0-4036-a6e1-83991d341d5a?"

GPT calls investigateJourney with:
{
  "data": {
    "message": "Are all requirements complete?",
    "scope": {
      "documentContext": null,
      "documentRequirementContext": {
        "contextLevel": "Journey",
        "contextId": "02637420-c5e0-4036-a6e1-83991d341d5a"
      }
    },
    "conversationHistory": []
  }
}
```

## Token Management

**Important**: The Bearer token expires every 15 minutes!

### To Update Token:
1. Open your Custom GPT settings
2. Go to **Actions** → **Authentication**
3. Update the Bearer token with a fresh one from `https://identity.fenxstable.com`
4. Click **Save**

### Automation Option (Advanced):
For production use, consider implementing OAuth2.0 with automatic token refresh. This requires:
- OAuth2.0 Authorization Code flow configuration
- Refresh token implementation
- Token storage and management

## Troubleshooting

### Error: 401 Unauthorized
- **Cause**: Token expired or invalid
- **Fix**: Generate new token and update GPT authentication settings

### Error: 404 Not Found
- **Cause**: Journey ID doesn't exist or incorrect API endpoint
- **Fix**: Verify the journey ID format (must be GUID)

### Error: No data returned
- **Cause**: Journey has no documents/requirements or wrong scope
- **Fix**: Try switching between documents and requirements scope

## Maintenance

1. **Token Refresh**: Update every 15 minutes or implement OAuth2.0
2. **API Updates**: Monitor Fenergo API changes
3. **User Feedback**: Collect usage patterns and improve instructions

## Support

- **Claude Connector**: Available in Claude Desktop (already configured)
- **ChatGPT Connector**: Use this Custom GPT in ChatGPT Enterprise
- **API Documentation**: https://api.fenxstable.com/documentmanagementquery

---

**Both connectors work independently**:
- Claude Desktop uses MCP protocol (local Node.js server)
- ChatGPT uses OpenAPI Actions (cloud-based API calls)
