# CloudWatch Log Investigation Guide

## Log Details to Check

**Log Group:** `/aws/lambda/Fenergo-Nebula-Identity-RequestAuthorizer`
**Region:** `eu-west-1` (Ireland)
**Time Range:** Last 15-30 minutes
**Client ID:** `mcp-client`
**Tenant ID:** `f488cdba-2122-448d-952c-7a2a47f78f1b`

## Method 1: AWS Console (Recommended)

### Step-by-Step:

1. **Open AWS Console**
   - URL: https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups
   - Ensure you're in **eu-west-1** region (top-right corner)

2. **Navigate to the Log Group**
   - Find: `/aws/lambda/Fenergo-Nebula-Identity-RequestAuthorizer`
   - Click on the log group name

3. **Search Logs**
   - Click "Search log group" button
   - Use filter pattern: `mcp-client`
   - Set time range: Last 1 hour
   - Click "Search"

4. **Alternative: Use Log Insights**
   - Click "Actions" → "View in CloudWatch Logs Insights"
   - Use this query:
   ```
   fields @timestamp, @message
   | filter @message like /mcp-client/
   | filter @message like /insights/ or @message like /403/ or @message like /authorized/
   | sort @timestamp desc
   | limit 50
   ```
   - Set time range: Last 1 hour
   - Click "Run query"

## Method 2: AWS CLI

If you have AWS CLI configured, run:

```bash
# View recent logs with mcp-client
aws logs tail /aws/lambda/Fenergo-Nebula-Identity-RequestAuthorizer \
  --since 30m \
  --filter-pattern "mcp-client" \
  --region eu-west-1 \
  --follow

# Or use CloudWatch Insights query
aws logs start-query \
  --log-group-name /aws/lambda/Fenergo-Nebula-Identity-RequestAuthorizer \
  --start-time $(date -d '30 minutes ago' +%s) \
  --end-time $(date +%s) \
  --query-string "fields @timestamp, @message | filter @message like /mcp-client/ | sort @timestamp desc | limit 50" \
  --region eu-west-1
```

## What to Look For in the Logs

### 1. Authorization Decision
Look for log entries that show:
- "Client mcp-client not authorized"
- "Authorization denied for client: mcp-client"
- "Client does not have permission to access endpoint"

### 2. Endpoint Validation
Look for:
- Endpoint path: `/documentmanagement/insights`
- API resource checks
- Permission validation logic

### 3. Configuration/Whitelist Checks
Look for:
- "Checking client permissions"
- "Validating endpoint access"
- References to endpoint whitelists or permission maps
- Environment variable checks

### 4. Common Log Patterns

Example log entries you might see:

```
[INFO] Validating token for client: mcp-client
[INFO] Tenant validation passed: f488cdba-2122-448d-952c-7a2a47f78f1b
[INFO] Checking endpoint permissions for: /documentmanagement/insights
[ERROR] Client mcp-client not authorized for endpoint: /documentmanagement/insights
[INFO] Returning 403 Forbidden
```

## Key Questions to Answer from Logs

1. **Where does authorization fail?**
   - Is it during token validation? (Should pass ✓)
   - Is it during tenant check? (Should pass ✓)
   - Is it during endpoint permission check? (LIKELY FAILING HERE)

2. **What configuration controls endpoint access?**
   - Environment variable name?
   - DynamoDB table?
   - Hardcoded in Lambda code?

3. **Which clients ARE authorized?**
   - Look for successful authorization logs
   - Note which client IDs successfully access this endpoint
   - This tells you what configuration to replicate for mcp-client

## After Finding the Issue

Once you identify why `mcp-client` is blocked, you'll need to:

### If it's an environment variable:
1. Go to Lambda console
2. Find: `Fenergo-Nebula-Identity-RequestAuthorizer`
3. Configuration → Environment variables
4. Add/update the variable to include `mcp-client`
5. Save and deploy

### If it's in code:
1. View the Lambda function code
2. Find the authorization logic
3. Update to include `mcp-client` for the `/insights` endpoint
4. Deploy the updated code

### If it's in a database:
1. Identify the table/configuration store
2. Add an entry granting `mcp-client` access to the endpoint
3. The Lambda should pick up the change automatically

## Need Help?

If you find the logs but need help interpreting them, share:
1. The relevant log entries (sanitize any sensitive data)
2. The timestamp of the logs
3. Any error messages or codes

We can then determine the exact fix needed.
