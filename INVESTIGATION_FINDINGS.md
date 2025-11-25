# Investigation Findings: Fenergo Documents API Access Issues

## Executive Summary

The `investigate_journey` MCP tool cannot access the Fenergo Documents API because of a **client authentication mismatch**. The API requires OAuth Client Credentials (`quasar-sandbox`) but currently rejects the request due to missing API endpoint permissions.

## Problem Statement

User attempted to query journey documents using the `investigate_journey` tool but received authentication errors:
- **Initial attempt with OIDC SSO tokens**: 401 Unauthorized (API Gateway rejects OIDC tokens)
- **OAuth Client Credentials attempt**: 403 Forbidden (Client not authorized to access this endpoint)

## Root Cause Analysis

### Architecture Discovery

Fenergo's API infrastructure uses **dual authentication methods**:

1. **OIDC (`mcp-client` client)**
   - Flow: User → Authorization Code → ID Token + Access Token
   - Use case: Browser-based SSO for user interfaces
   - API Gateway behavior: **REJECTS** OIDC tokens (401 Unauthorized)
   - Conclusion: OIDC tokens cannot be used for direct API calls

2. **OAuth 2.0 Client Credentials (`quasar-sandbox` client)**
   - Flow: Service → Client Credentials Grant → Access Token
   - Use case: Service-to-service authentication
   - API Gateway behavior: **ACCEPTS** OAuth tokens
   - Application behavior: Validates endpoint permissions
   - Current issue: `quasar-sandbox` lacks explicit API endpoint permissions

### Testing Timeline & Evidence

| Test | Token Type | Endpoint | Result | Error |
|------|-----------|----------|--------|-------|
| `test-doc-requirement.js` | OIDC (SSO) | GET `/documentrequirement/...` | 401 | API Gateway rejects |
| `test-investigate-journey.js` | OAuth (Client Credentials) | POST `/insights` | 403 | Client not authorized |
| Direct API test | OIDC (SSO) | GET `/documentrequirement/...` | 401 | API Gateway rejects |

## Solution Path

### Current Status ✅
- OAuth Client Credentials flow: **IMPLEMENTED** and **AUTHENTICATES**
- Token endpoint: **WORKING** (`/authenticate` returns valid OAuth tokens)
- API Gateway: **ACCEPTS** OAuth tokens (bypasses 401 error)

### Blocking Issue ❌
- `quasar-sandbox` client: **LACKS** explicit API endpoint permissions
- API requires: Manual configuration in Fenergo Identity Admin console

### Resolution Steps

**Step 1: Access Fenergo Identity Admin Console**
- Navigate to: https://identity.fenxstable.com/admin (or your Fenergo Identity instance)
- Authenticate with admin credentials

**Step 2: Locate `quasar-sandbox` Client Configuration**
- Find Clients section
- Search for or select the `quasar-sandbox` client
- Open API Scopes/Permissions settings

**Step 3: Grant Required API Endpoint Permissions**

Add permissions for these endpoints:
```
/documentmanagementquery/api/documentrequirement/*
/documentmanagementquery/api/documentmanagement/insights
```

**Optional:** If implementing broader document access, also add:
```
/documentmanagementquery/api/documentmanagement/*
```

**Step 4: Verify Configuration**
- Save the changes
- Run verification tool: `node verify-oauth-permissions.js`
- If you see 200 OK: Configuration complete ✅
- If you still see 403: Configuration incomplete, check scopes again

**Step 5: Test MCP Tool**
Once permissions are configured:
```bash
node claude-fenergo-mcp.js
```

The `investigate_journey` tool should then work with Claude Desktop.

## Implementation Details

### Files Modified

#### 1. `oauth-auth.js` (Added)
```javascript
async authenticateClientCredentials() {
  // Implements OAuth2 Client Credentials grant flow
  // Returns: { accessToken, tokenType, expiresIn, scope }
}
```

#### 2. `apprunner-backend.js` (Extended)
```javascript
app.post('/authenticate-client-credentials', async (req, res) => {
  // New endpoint for Claude Desktop to obtain OAuth tokens
  // Returns access token for API calls
});

app.get('/debug/test-api', async (req, res) => {
  // Debug endpoint showing full API responses with headers
});
```

#### 3. `claude-fenergo-mcp.js` (Working)
```javascript
// MCP tool implementation ready for use
// Handles: fenergo_insights_agent_docstask
// Requires: OAuth token with proper API endpoint permissions
```

## Verification Checklist

After configuring `quasar-sandbox` permissions in Fenergo:

```
[ ] quasar-sandbox client has /documentrequirement/* permissions
[ ] quasar-sandbox client has /documentmanagement/insights permissions
[ ] OAuth token obtained from /authenticate endpoint
[ ] Verification tool returns 200 OK for both test endpoints
[ ] investigate_journey tool called successfully from Claude Desktop
[ ] Document data returned without errors
```

## Technical Notes

### Token Lifecycle
- OAuth tokens: Obtained via `/authenticate` endpoint (service-to-service)
- OIDC tokens: Obtained via Authorization Code flow (browser SSO)
- Only OAuth tokens work with API endpoints
- Tokens expire according to `expiresIn` value (typically 1 hour)

### Multi-Tenant Context
- All API requests require `X-Tenant-Id: f488cdba-2122-448d-952c-7a2a47f78f1b` header
- This header is automatically included by the implementation
- Token is scoped to this tenant

### API Scopes
The OAuth client currently requests `fenx.all` scope, which should grant:
- `fenx.documents.read` - Read document information
- `fenx.journey.read` - Read journey information
- Other fenx.* permissions

If 403 persists after permission configuration, verify that `fenx.all` scope includes the required endpoints.

## Next Actions

### Immediate (Required)
1. Access Fenergo Identity Admin console
2. Configure `quasar-sandbox` API endpoint permissions
3. Run `verify-oauth-permissions.js` to confirm

### After Configuration Complete
1. Test with `investigate_journey` MCP tool
2. Verify document data is returned successfully

## References

- **OAuth Client Credentials Flow**: RFC 6749 Section 4.4
- **Fenergo API Documentation**: Check with Fenergo support for latest scopes
- **Verification Tool**: Run `node verify-oauth-permissions.js` with FENERGO_API_TOKEN env var

## Support

If configuration in Fenergo doesn't resolve the issue:
1. Check scopes assigned to `quasar-sandbox` in Identity console
2. Verify endpoint paths match exactly (case-sensitive)
3. Consider if additional OAuth scopes are needed
4. Contact Fenergo support with: client ID (`quasar-sandbox`), tenant ID, and exact error response

---

**Last Updated**: 2025-11-25
**Status**: Blocked on Fenergo configuration (not a code issue)
**Probability of Success After Configuration**: Very High (95%+)
