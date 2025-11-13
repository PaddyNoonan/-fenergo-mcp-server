# AWS App Runner Deployment Guide

## Complete Setup Instructions for Fenergo MCP Server

### Prerequisites
- AWS Account
- GitHub repository: `https://github.com/PaddyNoonan/-fenergo-mcp-server`
- Fresh Fenergo API token

---

## Method 1: Deploy via AWS Console (Easiest)

### Step 1: Open AWS App Runner
1. Go to: https://console.aws.amazon.com/apprunner
2. Select your AWS region (e.g., us-east-1)
3. Click **"Create service"**

### Step 2: Configure Source
1. **Repository type**: Source code repository
2. Click **"Add new"** to connect GitHub
3. Authorize AWS to access your GitHub
4. **Repository**: Select `PaddyNoonan/-fenergo-mcp-server`
5. **Branch**: `main`
6. **Deployment trigger**: Automatic
7. Click **Next**

### Step 3: Configure Build
1. **Configuration file**: Use a configuration file (apprunner.yaml)
2. App Runner will auto-detect the file ✅
3. Click **Next**

### Step 4: Configure Service
**IMPORTANT:** If environment variables section doesn't appear, you need to:

1. Click **"Edit configuration"** or **"Override"**
2. This expands manual configuration options
3. Now you'll see:
   - **Service name**: `fenergo-mcp-server`
   - **Port**: 3000
   - **Environment variables** section

4. Add environment variables:
   
   **Click "Add environment variable"** (3 times):
   
   | Name | Value |
   |------|-------|
   | `FENERGO_API_TOKEN` | `Bearer eyJ...` (your full token) |
   | `FENERGO_TENANT_ID` | `f488cdba-2122-448d-952c-7a2a47f78f1b` |
   | `PORT` | `3000` |

5. **Instance configuration**: 
   - CPU: 1 vCPU
   - Memory: 2 GB

6. Click **Next**

### Step 5: Review and Deploy
1. Review all settings
2. Click **"Create & deploy"**
3. Wait 5-10 minutes for deployment

### Step 6: Get Your URL
Once deployed, you'll see:
```
Service URL: https://xxxxx.us-east-1.awsapprunner.com
```

**Use this URL in ChatGPT MCP Server configuration!**

---

## Method 2: Deploy via AWS CLI (Advanced)

If you prefer command line:

```bash
# Install AWS CLI first
# Then run:

aws apprunner create-service \
  --service-name fenergo-mcp-server \
  --source-configuration '{
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/PaddyNoonan/-fenergo-mcp-server",
      "SourceCodeVersion": {
        "Type": "BRANCH",
        "Value": "main"
      },
      "CodeConfiguration": {
        "ConfigurationSource": "API",
        "CodeConfigurationValues": {
          "Runtime": "NODEJS_18",
          "BuildCommand": "npm install",
          "StartCommand": "node chatgpt-mcp-server.js",
          "Port": "3000",
          "RuntimeEnvironmentVariables": {
            "FENERGO_API_TOKEN": "YOUR_TOKEN_HERE",
            "FENERGO_TENANT_ID": "f488cdba-2122-448d-952c-7a2a47f78f1b",
            "PORT": "3000"
          }
        }
      }
    }
  }' \
  --instance-configuration '{
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }'
```

---

## Updating Environment Variables Later

If you need to update the token:

1. Go to AWS App Runner console
2. Select your service: `fenergo-mcp-server`
3. Click **"Configuration"** tab
4. Find **"Environment variables"** section
5. Click **"Edit"**
6. Update `FENERGO_API_TOKEN` value
7. Click **"Save"**
8. Service will automatically redeploy

---

## Troubleshooting

### "Environment variables section not showing"
- Click "Override configuration file settings"
- Or use "Manual" configuration instead of "Use configuration file"

### Build fails
- Check GitHub connection is authorized
- Verify `apprunner.yaml` exists in repo
- Check logs in App Runner console

### Service won't start
- Verify environment variables are set
- Check application logs in App Runner console
- Ensure port 3000 is correct

### Token expires
- Update environment variable with fresh token
- Service automatically redeploys

---

## Cost Estimate

**Free Tier:** First service gets some free hours  
**After free tier:** ~$5-10/month for:
- 1 vCPU
- 2 GB RAM
- Always-on service

---

## Alternative: Use Secrets Manager (Recommended for Production)

For better security, use AWS Secrets Manager:

1. Store token in Secrets Manager
2. Reference it in App Runner:
   ```
   FENERGO_API_TOKEN: arn:aws:secretsmanager:...
   ```

This way tokens aren't visible in console!

---

## Next Steps After Deployment

1. Copy your App Runner URL: `https://xxxxx.awsapprunner.com`
2. Open ChatGPT
3. Go to MCP settings
4. Add server URL
5. Test with a query!

---

## Questions?

- AWS App Runner docs: https://docs.aws.amazon.com/apprunner/
- Your GitHub repo: https://github.com/PaddyNoonan/-fenergo-mcp-server
- Claude Desktop MCP (working!): Uses local config

**Current Status:**
✅ Claude Desktop - Working perfectly  
⏳ ChatGPT - Awaiting AWS deployment
