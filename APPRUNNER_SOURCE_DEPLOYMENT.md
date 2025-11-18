# AppRunner Source-Based Deployment (No Docker Locally)

## Overview

This guide uses AppRunner's **source-based deployment** feature:
- Your code lives on GitHub
- AppRunner pulls your code automatically
- AppRunner builds the Docker image itself
- No Docker installation needed on your machine

## Prerequisites

✅ Code pushed to GitHub: `https://github.com/PaddyNoonan/-fenergo-mcp-server`
✅ Dockerfile in repo (AppRunner will use it)
✅ AWS Account with AppRunner access
✅ GitHub account connected to AWS

## Step 1: Grant AppRunner Access to GitHub

### Via AWS Console:

1. Go to **AWS AppRunner** → **Repositories**
2. Click **Connect repository**
3. Select **GitHub** as source
4. Click **Connect to GitHub** button
5. Authorize AWS Connector for GitHub (one-time setup)
6. Select your fork: `PaddyNoonan/-fenergo-mcp-server`
7. Choose branch: `main`
8. Click **Next**

## Step 2: Configure AppRunner Service

### In AWS Console, fill out:

**Repository:**
- Source: GitHub
- Repository: `PaddyNoonan/-fenergo-mcp-server`
- Branch: `main`
- Deployment trigger: Automatic (rebuilds on git push)

**Build Settings:**
- Build command: `npm install` (AppRunner auto-runs this)
- Start command: `node apprunner-backend.js`
- Port: `8080`

**Environment Variables:**
```
FENERGO_API_TOKEN=Bearer eyJhbGciOiJSUzI1NiIs...
FENERGO_TENANT_ID=f488cdba-2122-448d-952c-7a2a47f78f1b
PORT=8080
```

**Service Settings:**
- Service name: `fenergo-apprunner` (or your choice)
- Instance type: `0.25 vCPU, 0.5 GB memory` (smallest, sufficient)
- Auto-scaling: Disable for testing (1 instance)

**Security:**
- Use IAM role (default)
- Incoming traffic: Allow `0.0.0.0/0` on port 8080

3. Click **Create & Deploy**

## Step 3: Wait for Deployment

AppRunner will:
1. Clone your GitHub repo
2. Build Docker image from Dockerfile
3. Start the container
4. Show your service URL (something like `https://xxxxx.eu-west-1.awsapprunner.com`)

This typically takes 2-3 minutes.

## Step 4: Verify Deployment

Once deployment completes:

```bash
# Test health endpoint
curl https://your-apprunner-url.awsapprunner.com/health

# Should return:
# {"status":"healthy","timestamp":"...","service":"apprunner-backend"}
```

## Step 5: Update Claude Desktop Config

Edit `~\AppData\Roaming\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fenergo-apprunner": {
      "command": "node",
      "args": ["c:\\Users\\PNoonan\\OneDrive - Fenergo\\Desktop\\MCPTest\\apprunner-mcp-connector.js"],
      "env": {
        "APPRUNNER_URL": "https://your-apprunner-url.awsapprunner.com",
        "FENERGO_API_TOKEN": "Bearer eyJhbGciOiJSUzI1NiIs...",
        "FENERGO_TENANT_ID": "f488cdba-2122-448d-952c-7a2a47f78f1b"
      }
    }
  }
}
```

Replace `your-apprunner-url` with your actual AppRunner URL from AWS console.

## Step 6: Test with Claude Desktop

1. Restart Claude Desktop
2. Start a new chat
3. Ask: "Can you tell me information on Documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
4. Should return actual documents

## How Updates Work

This is the beauty of source-based deployment:

```
Make code changes locally
    ↓
git push to GitHub
    ↓
AppRunner detects change
    ↓
AppRunner pulls latest code
    ↓
AppRunner builds new Docker image
    ↓
AppRunner deploys new version
    ↓
Claude Desktop uses updated service
```

No manual rebuild or push needed! Just `git push`.

## Monitoring & Logs

### Check Service Status:
1. Go to AWS AppRunner console
2. Click your service name
3. See status, URL, and deployment history

### View Logs:
```bash
# Real-time logs
aws logs tail /aws/apprunner/fenergo-apprunner/service --follow

# Last 50 lines
aws logs tail /aws/apprunner/fenergo-apprunner/service --limit 50
```

Replace `fenergo-apprunner` with your actual service name.

### CloudWatch Dashboard:
1. AppRunner console → Your service
2. Click **Monitoring** tab
3. See CPU, memory, request metrics

## Scaling (Optional)

AppRunner can auto-scale based on traffic:

1. Go to your AppRunner service
2. Click **Edit**
3. Under "Auto scaling", increase max instances (default 1)
4. Set CPU/memory thresholds for scaling

For testing, keep at 1 instance (minimum cost).

## Environment Variable Updates

To update `FENERGO_API_TOKEN` (e.g., when it expires):

1. AppRunner console → Your service
2. Click **Edit**
3. Update environment variables
4. Click **Save**
5. AppRunner restarts service automatically

## Troubleshooting

### Service won't deploy
- Check GitHub connection (Step 1)
- Verify Dockerfile is in repo root
- Check build logs in AppRunner console

### Service deploys but returns errors
- Verify environment variables are set correctly
- Check logs: `aws logs tail ...`
- Look for `FENERGO_API_TOKEN` and `FENERGO_TENANT_ID` in logs

### Health endpoint fails
- Service may still be starting (give it 1-2 minutes)
- Check AppRunner service status is "Running"
- Check port 8080 is not blocked

### Claude Desktop tool not working
- Verify AppRunner URL in claude_desktop_config.json is correct
- Test health endpoint manually first
- Restart Claude Desktop after config changes
- Check Claude Desktop logs (Help → Show logs)

## Cost

AppRunner is very cost-effective:
- **0.25 vCPU, 0.5 GB**: ~$4-5/month idle
- Only pay while running
- No charge for deployment, only runtime

## Next Steps

1. Follow Steps 1-5 above to deploy to AppRunner
2. Test with curl to health endpoint
3. Update Claude Desktop config
4. Test with investigate_journey tool
5. Push code changes to GitHub to auto-update

That's it! Your AppRunner service is live and updates automatically with every git push.

