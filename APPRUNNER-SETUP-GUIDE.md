# AWS AppRunner Setup Guide for Fenergo MCP Connector

**Purpose:** This guide explains how to set up AWS AppRunner to serve as a proxy/gateway for the Fenergo Nebula MCP Server that bridges Claude Desktop to your Fenergo system.

---

## Architecture Overview

```
Claude Desktop
    ↓
apprunner-mcp-connector.js (MCP Server)
    ↓
AWS AppRunner Service
    ↓
Fenergo Nebula API
    ↓
Your Fenergo System (Documents, Journeys, Requirements)
```

---

## Prerequisites

Before setting up AppRunner, you need:

1. **AWS Account** with permissions to:
   - Create AppRunner services
   - Manage ECR (Elastic Container Registry)
   - Create IAM roles and policies
   - Configure networking/security groups

2. **Docker** installed locally (for building container images)

3. **Fenergo API Credentials:**
   - API Token (Bearer token or JWT)
   - Tenant ID
   - API Base URL

4. **Service Account for AppRunner:**
   - AppRunner will need its own service account with permissions to call Fenergo APIs
   - This account should have higher privileges than your user account

---

## Step 1: Create AppRunner Service

### Via AWS Console

1. Navigate to **AWS AppRunner**
2. Click **Create Service**
3. Choose source:
   - **Container image (ECR)**
   - Or **Source code (GitHub/CodePipeline)**

### Configuration

**Service Name:** `fenergo-mcp-server`

**Port:** `80` or `8080` (AppRunner default)

**Environment Variables:**
```
FENERGO_API_BASE_URL=https://api.fenxstable.com/documentmanagementquery/api/documentmanagement
FENERGO_API_TOKEN=Bearer [YOUR_SERVICE_ACCOUNT_TOKEN]
FENERGO_TENANT_ID=f488cdba-2122-448d-952c-7a2a47f78f1b
REQUEST_TIMEOUT=30000
MAX_RETRIES=2
```

---

## Step 2: Deploy Backend Service

The AppRunner needs a backend service that:

1. **Listens for MCP requests** on `/execute`, `/tools`, `/health` endpoints
2. **Translates tool calls** to Fenergo API format
3. **Handles authentication** with service account
4. **Forwards requests** to Fenergo API
5. **Returns responses** in MCP format

### Option A: Node.js Backend (Recommended)

**Create backend service at `/app/backend.js`:**

```javascript
import express from 'express';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const FENERGO_API_BASE = process.env.FENERGO_API_BASE_URL ||
  'https://api.fenxstable.com/documentmanagementquery/api/documentmanagement';
const SERVICE_TOKEN = process.env.FENERGO_API_TOKEN;
const TENANT_ID = process.env.FENERGO_TENANT_ID;

// Health endpoint
app.get('/health', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /health`);
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Tools endpoint
app.get('/tools', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /tools`);
  res.json({
    tools: [
      {
        name: 'investigate_journey',
        description: 'Investigate a Fenergo journey for documents or requirements insights',
        inputSchema: {
          type: 'object',
          properties: {
            journeyId: { type: 'string', description: 'Journey ID (GUID format)' },
            query: { type: 'string', description: 'Natural language question' },
            scope: { type: 'string', enum: ['documents', 'requirements'], description: 'Investigation scope' }
          },
          required: ['journeyId', 'query', 'scope']
        }
      }
    ]
  });
});

// Execute endpoint - MAIN BUSINESS LOGIC
app.post('/execute', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] POST /execute`);
  console.log(`[${timestamp}] Request Body:`, JSON.stringify(req.body, null, 2));

  try {
    const { tool, parameters } = req.body;

    if (tool === 'investigate_journey') {
      const { journeyId, query, scope } = parameters;

      console.log(`[${timestamp}] Calling Fenergo API for journey: ${journeyId}`);

      // Build request to Fenergo API
      const payload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          tool: 'investigate_journey',
          parameters: { journeyId, query, scope }
        }
      };

      // Call Fenergo API
      const fenergoResponse = await callFenergoAPI('/insights', payload);

      console.log(`[${timestamp}] Fenergo API Response:`, JSON.stringify(fenergoResponse, null, 2));

      return res.json(fenergoResponse);
    }

    res.status(400).json({ error: `Unknown tool: ${tool}` });
  } catch (error) {
    console.error(`[${timestamp}] ERROR in /execute:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to call Fenergo API
function callFenergoAPI(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${FENERGO_API_BASE}${endpoint}`);
    const postData = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': SERVICE_TOKEN,
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: 'Failed to parse response', raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
});
```

### Option B: Using Existing MCP Server

If AppRunner should run an MCP server directly, use:
- Base image: `node:18-alpine`
- Entrypoint: `node server.js`
- Expose port via stdout (MCP stdio protocol)

---

## Step 3: Create Dockerfile

**File: `/Dockerfile`**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Environment variables with defaults
ENV PORT=8080
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)});"

# Expose port
EXPOSE 8080

# Start application
CMD ["node", "backend.js"]
```

---

## Step 4: Build and Push to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name fenergo-mcp-server --region us-east-1

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [YOUR_AWS_ACCOUNT].dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t fenergo-mcp-server:latest .

# Tag image
docker tag fenergo-mcp-server:latest [YOUR_AWS_ACCOUNT].dkr.ecr.us-east-1.amazonaws.com/fenergo-mcp-server:latest

# Push to ECR
docker push [YOUR_AWS_ACCOUNT].dkr.ecr.us-east-1.amazonaws.com/fenergo-mcp-server:latest
```

---

## Step 5: Configure AppRunner Service

### Environment Variables

Set in AppRunner console or via AWS CLI:

```bash
aws apprunner create-service \
  --service-name fenergo-mcp-server \
  --source-configuration ImageRepository="{RepositoryUrl=[ECR_IMAGE_URL],ImageConfiguration={Port=8080}}" \
  --instance-configuration Cpu=1024,Memory=2048 \
  --region us-east-1
```

### Environment Configuration

```
FENERGO_API_BASE_URL = https://api.fenxstable.com/documentmanagementquery/api/documentmanagement
FENERGO_API_TOKEN = Bearer [SERVICE_ACCOUNT_TOKEN]
FENERGO_TENANT_ID = f488cdba-2122-448d-952c-7a2a47f78f1b
REQUEST_TIMEOUT = 30000
MAX_RETRIES = 2
NODE_ENV = production
LOG_LEVEL = debug
```

### IAM Role Configuration

**Policy needed:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## Step 6: Security Configuration

### Network Security

1. **VPC Endpoint** (if AppRunner is in VPC):
   - Allow outbound HTTPS (443) to Fenergo API
   - Allow inbound from local network on port 8080 or 80

2. **WAF Rules** (optional):
   - Rate limiting to prevent abuse
   - IP whitelist for trusted sources

### Secrets Management

**DO NOT hardcode credentials!** Use:

- **AWS Secrets Manager:**
  ```bash
  aws secretsmanager create-secret \
    --name fenergo/api-token \
    --secret-string "[YOUR_SERVICE_ACCOUNT_TOKEN]"
  ```

- **AppRunner IAM Role:** Grant permission to read secret

- **Environment Variable:** Reference secret in AppRunner config

---

## Step 7: Monitoring & Logs

### CloudWatch Logs

AppRunner automatically sends logs to CloudWatch:

```bash
# View logs
aws logs tail /aws/apprunner/fenergo-mcp-server/service

# Stream logs in real-time
aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow
```

### Key Things to Monitor

1. **Health Check Status:**
   - If unhealthy, AppRunner will restart the service
   - Check `/health` endpoint logs

2. **Error Rates:**
   - Monitor `/execute` endpoint errors
   - Look for Fenergo API permission errors (401/403)
   - Look for timeout errors (5xx)

3. **Response Times:**
   - High latency may indicate Fenergo API slowness
   - Check Content-Length in responses

### Example Log Analysis

```bash
# Find all errors
aws logs filter-log-events \
  --log-group-name /aws/apprunner/fenergo-mcp-server/service \
  --filter-pattern "ERROR"

# Find slow requests (>1000ms)
aws logs filter-log-events \
  --log-group-name /aws/apprunner/fenergo-mcp-server/service \
  --filter-pattern "[..., duration > 1000]"
```

---

## Step 8: Testing AppRunner Endpoint

Once deployed, test the service:

```bash
# Get AppRunner URL
APPRUNNER_URL=$(aws apprunner describe-service \
  --service-arn arn:aws:apprunner:us-east-1:[ACCOUNT]:service/fenergo-mcp-server/[SERVICE_ID] \
  --query 'Service.ServiceUrl' --output text)

# Test health
curl https://$APPRUNNER_URL/health

# Test tools endpoint
curl https://$APPRUNNER_URL/tools

# Test execute endpoint
curl -X POST https://$APPRUNNER_URL/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "investigate_journey",
    "parameters": {
      "journeyId": "5a5caba1-623f-45c5-8e02-592fb6c4dc61",
      "query": "What documents are required?",
      "scope": "documents"
    }
  }'
```

---

## Step 9: Troubleshooting

### AppRunner Service Won't Start

**Check:**
1. CloudWatch Logs for startup errors
2. IAM role has ECR read permissions
3. Environment variables are set correctly
4. Docker image is valid

**Solution:**
```bash
# View detailed service info
aws apprunner describe-service --service-arn [SERVICE_ARN]

# Check CloudWatch logs
aws logs describe-log-streams \
  --log-group-name /aws/apprunner/fenergo-mcp-server/service
```

### Health Check Failing

**Check:**
1. `/health` endpoint returning 200 OK
2. Port 8080 is correctly exposed
3. Startup delay is sufficient (health check delays)

**Solution:**
```bash
# Increase health check delay
aws apprunner update-service \
  --service-arn [SERVICE_ARN] \
  --instance-configuration HealthCheckConfiguration='{Interval=30,Timeout=10,HealthyThreshold=1,UnhealthyThreshold=3}'
```

### Fenergo API Returns No Data

**Check:**
1. Service account token is valid
2. Service account has correct permissions
3. Tenant ID is correct
4. API endpoint is correct

**Solution:**
1. Test token directly from AppRunner logs
2. Request elevated permissions for service account
3. Verify API endpoint URL

### High Latency / Timeouts

**Check:**
1. Fenergo API response times
2. Network connectivity
3. Request timeout settings

**Solution:**
```bash
# Increase timeout
aws apprunner update-service \
  --service-arn [SERVICE_ARN] \
  --instance-configuration Cpu=2048,Memory=4096
```

---

## Step 10: Production Checklist

Before running in production:

- [ ] **Secrets:** Using AWS Secrets Manager, not hardcoded
- [ ] **Logging:** CloudWatch logs configured and monitored
- [ ] **Monitoring:** CloudWatch alarms set for errors
- [ ] **Scaling:** Auto-scaling configured for traffic spikes
- [ ] **Backup:** Service account token rotated regularly
- [ ] **Testing:** Load testing completed
- [ ] **Documentation:** Team knows how to access/debug
- [ ] **Disaster Recovery:** Plan for service failures
- [ ] **Cost:** Estimated monthly costs reviewed
- [ ] **Security:** VPC, WAF, and IAM policies reviewed

---

## Updating AppRunner Service

### Deploy New Version

```bash
# Push new image
docker tag fenergo-mcp-server:latest \
  [ACCOUNT].dkr.ecr.us-east-1.amazonaws.com/fenergo-mcp-server:v2.0
docker push [ACCOUNT].dkr.ecr.us-east-1.amazonaws.com/fenergo-mcp-server:v2.0

# Update service
aws apprunner start-deployment --service-arn [SERVICE_ARN]
```

### Rollback

```bash
# Switch back to previous image
aws apprunner update-service \
  --service-arn [SERVICE_ARN] \
  --source-configuration ImageRepository="{RepositoryUrl=[OLD_IMAGE_URL]}"

aws apprunner start-deployment --service-arn [SERVICE_ARN]
```

---

## Summary

You now have an AppRunner service that:
1. ✅ Exposes MCP endpoints (/tools, /execute, /health)
2. ✅ Authenticates with Fenergo using service account
3. ✅ Proxies tool calls to Fenergo API
4. ✅ Returns results in MCP format
5. ✅ Logs all requests/responses for debugging
6. ✅ Auto-scales based on traffic
7. ✅ Manages secrets securely

**Your Claude Desktop connector can now call the AppRunner service and access Fenergo data!**

---

## Support & Resources

- **AWS AppRunner Documentation:** https://docs.aws.amazon.com/apprunner/
- **CloudWatch Logs:** https://docs.aws.amazon.com/cloudwatch/latest/logs/
- **AWS Secrets Manager:** https://docs.aws.amazon.com/secretsmanager/
- **Fenergo API Documentation:** Contact your Fenergo administrator

---

**Last Updated:** 2025-11-18
**MCP Connector Version:** 1.0.0
