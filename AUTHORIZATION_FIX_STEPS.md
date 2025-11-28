# Authorization Fix: Step-by-Step Guide

## Current Status

**Problem:** API returns 403 "Client not authorized to access this endpoint"

**Root Cause:** The DynamoDB table `authorization-stable-9fdbcfc` does not contain a permission record allowing `mcp-client` to access the `/documentmanagement/insights` endpoint.

**Authorization Flow:**
```
User Request → API Gateway → Lambda Authorizer (✅ PASSES) → Application →
  Authorization Lambda (authorization-evaluatePermission-lambda-stable-8d4fbe4) →
  DynamoDB Check (authorization-stable-9fdbcfc) → ❌ FAILS (no record found) →
  403 Response
```

---

## Solution: Add Authorization Record in DynamoDB

### Step 1: Examine Existing Records (IN AWS CONSOLE)

You currently have the DynamoDB table `authorization-stable-9fdbcfc` open in the AWS Console.

**Action:**
1. Look at the scanned items (you should see 50 items displayed)
2. Examine the **PK** (Partition Key) and **SK** (Sort Key) patterns
3. Look for records that mention:
   - "client" or client IDs like "quasar-sandbox"
   - "endpoint" or endpoint paths
   - "insights" or "documentmanagement"

**What to look for:**
- How are client permissions structured?
- Common patterns:
  ```
  Pattern A: PK="CLIENT#quasar-sandbox", SK="ENDPOINT#/some/path"
  Pattern B: PK="ENDPOINT#/some/path", SK="CLIENT#quasar-sandbox"
  Pattern C: PK="PERMISSION#12345", SK="PERMISSION", clientId="...", endpoint="..."
  ```

### Step 2: Find a Reference Record

**Search strategies in the console:**

1. **Use the Filter feature:**
   - Click "Scan: Filter results"
   - Add filter: Attribute name = PK, Condition = contains, Value = "client"
   - Or try: Attribute name = SK, Condition = contains, Value = "endpoint"

2. **Look for the quasar-sandbox client:**
   - This client likely has permissions configured
   - Find any record with "quasar-sandbox" in it
   - Note the exact structure (all attributes)

3. **Export a sample:**
   - Click on any item that looks like a permission record
   - Copy the JSON structure
   - This will be your template

### Step 3: Create mcp-client Permission Record

Once you understand the structure, create a new item:

**In DynamoDB Console:**
1. Click "Actions" → "Create item"
2. Choose "JSON view"
3. Enter the record based on the pattern you found

**Example records based on common patterns:**

#### If Pattern A (CLIENT#... as PK):
```json
{
  "PK": "CLIENT#mcp-client",
  "SK": "ENDPOINT#/documentmanagement/insights",
  "allowed": true,
  "methods": ["POST"],
  "scopes": ["fenx.all"],
  "created": "2025-11-27T21:00:00.000Z",
  "description": "Allow mcp-client to access document insights endpoint"
}
```

#### If Pattern B (ENDPOINT#... as PK):
```json
{
  "PK": "ENDPOINT#/documentmanagement/insights",
  "SK": "CLIENT#mcp-client",
  "allowed": true,
  "methods": ["POST"],
  "scopes": ["fenx.all"],
  "created": "2025-11-27T21:00:00.000Z",
  "description": "Allow mcp-client to access document insights endpoint"
}
```

#### If Pattern C (Permission entity):
```json
{
  "PK": "PERMISSION#mcp-client-insights",
  "SK": "PERMISSION",
  "clientId": "mcp-client",
  "endpoint": "/documentmanagement/insights",
  "method": "POST",
  "allowed": true,
  "scopes": ["fenx.all"],
  "tenant": "f488cdba-2122-448d-952c-7a2a47f78f1b",
  "created": "2025-11-27T21:00:00.000Z"
}
```

**Important:**
- Match the EXACT attribute names from existing records
- Include all required attributes (some may be mandatory)
- Copy any additional attributes you see in reference records

### Step 4: Clear Authorization Cache

The authorization Lambda caches results in **ElastiCache for 900 seconds (15 minutes)**.

After adding the DynamoDB record, you MUST clear the cache:

**Option A: Wait (Easiest)**
- Wait 15 minutes for the cache to expire naturally
- Then test again

**Option B: Restart Lambda (Faster)**
1. Go to Lambda console
2. Find: `authorization-evaluatePermission-lambda-stable-8d4fbe4`
3. Click "Configuration" → "Environment variables"
4. Edit any variable (add a space, remove it, save)
5. This triggers a redeployment and clears the cache

**Option C: Update Lambda Configuration**
1. Go to Lambda console
2. Find: `authorization-evaluatePermission-lambda-stable-8d4fbe4`
3. Click "Configuration" → "General configuration"
4. Edit → Click "Save" (even without changes)
5. This clears the function cache

### Step 5: Test the API

After creating the record and clearing cache, test:

```bash
node get-journey-documents.js
```

**Expected result:**
```
✅ SUCCESS! AI insights retrieved.
💬 AI Response: [Details about journey documents...]
```

---

## Alternative: Lambda Environment Variables

If DynamoDB approach is complex, check the Lambda configuration:

1. **Go to Lambda:** `authorization-evaluatePermission-lambda-stable-8d4fbe4`
2. **Check Environment Variables:** Look for:
   - `AUTHORIZED_CLIENTS`
   - `CLIENT_PERMISSIONS`
   - `ENDPOINT_WHITELIST`
   - `CLIENT_WHITELIST`

3. **If found:** Add `mcp-client` to the list
4. **Save and test**

---

## Verification Checklist

After making changes, verify:

- [ ] DynamoDB record created with correct PK/SK
- [ ] All required attributes included in the record
- [ ] Cache cleared (waited 15 mins OR restarted Lambda)
- [ ] Test script shows 200 OK response
- [ ] Journey documents retrieved successfully

---

## If Still Failing

### Check CloudWatch Logs

**Log Group:** `/aws/lambda/authorization-evaluatePermission-lambda-stable-8d4fbe4`

**What to look for:**
- "mcp-client" entries
- "authorization denied" or "permission denied"
- "DynamoDB query" logs showing what it's searching for
- "cache hit" vs "cache miss" to confirm cache was cleared

**AWS Console steps:**
1. CloudWatch → Log groups
2. Find: `/aws/lambda/authorization-evaluatePermission-lambda-stable-8d4fbe4`
3. Click "Search log group"
4. Filter: `mcp-client`
5. Time range: Last 1 hour
6. Look for authorization decision logs

### Contact Fenergo Support

If you need to escalate, provide:

**Issue Summary:**
```
Client "mcp-client" is unable to access the Document Insights API endpoint
despite having valid authentication and proper OAuth scopes.

API Endpoint: POST /documentmanagementquery/api/documentmanagement/insights
Error: HTTP 403 - "Client not authorized to access this endpoint"

Root Cause: Missing authorization record in DynamoDB table
authorization-stable-9fdbcfc for client "mcp-client" and endpoint
"/documentmanagement/insights"

Request: Please add authorization record to allow mcp-client access to
the insights endpoint, or provide guidance on the correct DynamoDB
record structure.
```

**Details to include:**
- Client ID: `mcp-client`
- Tenant ID: `f488cdba-2122-448d-952c-7a2a47f78f1b`
- Scopes: `openid, profile, fenx.all`
- Audience: `Fenergo.Nebula.Authorizer`
- Lambda: `authorization-evaluatePermission-lambda-stable-8d4fbe4`
- DynamoDB Table: `authorization-stable-9fdbcfc`
- Region: `eu-west-1`

---

## Quick Reference

| Component | Value |
|-----------|-------|
| **Client ID** | mcp-client |
| **Tenant ID** | f488cdba-2122-448d-952c-7a2a47f78f1b |
| **Journey ID** | 5a5caba1-623f-45c5-8e02-592fb6c4dc61 |
| **Endpoint** | /documentmanagement/insights |
| **Method** | POST |
| **DynamoDB Table** | authorization-stable-9fdbcfc |
| **Auth Lambda** | authorization-evaluatePermission-lambda-stable-8d4fbe4 |
| **Cache TTL** | 900 seconds (15 minutes) |
| **Region** | eu-west-1 |

---

## Test Commands

```bash
# View current token status and test API
node get-journey-documents.js

# View authorization fix guide
node fix-authorization.js

# Query DynamoDB (requires AWS credentials)
node query-dynamodb-auth.js
```
