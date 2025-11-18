# Deploy to AppRunner RIGHT NOW - 6 Simple Steps

Your code is already on GitHub. AppRunner will build and deploy automatically from there.

## Step 1: Go to AWS AppRunner Console
```
https://console.aws.amazon.com/apprunner
```

## Step 2: Click "Create Service"

## Step 3: Select GitHub as Source
- Click **Connect to GitHub** (one-time setup)
- Authorize AWS
- Select repository: **PaddyNoonan/-fenergo-mcp-server**
- Select branch: **main**
- Click **Next**

## Step 4: Configure Service Settings

**Build command:** (leave as default - AppRunner knows to use Dockerfile)

**Start command:**
```
node apprunner-backend.js
```

**Port:**
```
8080
```

**Environment variables** - click "Add environment variable" three times:

| Name | Value |
|------|-------|
| `FENERGO_API_TOKEN` | `Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjFBMUY1QjJBMzI3RDEzNjlDQjZGMjdENEExMzNFOTM3NzFFMkY2MTciLCJ4NXQiOiJHaDliS2pKOUUybkxieWZVb1RQcE4zSGk5aGMiLCJ0eXAiOiJhdCtqd3QifQ.eyJpc3MiOiJodHRwczovL2lkZW50aXR5LmZlbnhzdGFibGUuY29tIiwibmJmIjoxNzYzNDgwMDY5LCJpYXQiOjE3NjM0ODAwNjksImV4cCI6MTc2MzQ4MDk2OSwiYXVkIjoiRmVuZXJnby5OZWJ1bGEuQXV0aG9yaXplciIsInNjb3BlIjpbIm9wZW5pZCIsInByb2ZpbGUiLCJ0ZW5hbnQiLCJmZW54LmFsbCIsInJvbGVzIiwiZW1haWwiXSwiYW1yIjpbInB3ZCJdLCJjbGllbnRfaWQiOiJmZW5lcmdvLW5lYnVsYS1hZG1pbi10b29sIiwic3ViIjoiMjZhYzdiMjgtYTkxMi00MDk4LWJhNzctNGE5NTRlNzZiYzIxIiwiYXV0aF90aW1lIjoxNzYzNDc1MDkyLCJpZHAiOiJsb2NhbCIsInRlbmFudCI6ImY0ODhjZGJhLTIxMjItNDQ4ZC05NTJjLTdhMmE0N2Y3OGYxYiIsInNpZCI6IjI1RTVENzJGRUZGNkY4MTQ4NjhGRkVGOUE2MDFFMzlCIn0.eDt1wPGYAPsb3lp0DSNIiJpRI2MuKDxIYITtHeBsNF3tpKBczR1_q9UVGfmRNx1beRfcA12FlPpvRvsHwfad_8eyvclTOrPXAzv55fRcs3BFl415Z0iTry0280526EQ2Kt9cX_0t6PtVQf3B2aIczWTTSWHmJEUxfrH-AQZgvarAjuAyNKYl2MF5zkUhomugF6bb21dYyOIEonLuZFw0iPTp1YDH8Qg4YkCB6ttiwoZ1IWYBjxsViDQj6Eky8DTmOkbyhhlcOA1pqqcfZ1SXJjvA6Ja4uIAdn0a0qDidHGJeDgy6ccRCyPkHB27EHkss-2-DQn5ZBPjKjW1hGvyYxQ` |
| `FENERGO_TENANT_ID` | `f488cdba-2122-448d-952c-7a2a47f78f1b` |
| `PORT` | `8080` |

Click **Next**

## Step 5: Configure Service

**Service name:** `fenergo-apprunner` (or any name you like)

**Instance:**
- vCPU: `0.25`
- Memory: `0.5 GB`
- (This is the smallest/cheapest - perfect for testing)

**Auto scaling:** Disable for now
- Max instances: `1`

Click **Next** → **Create & Deploy**

## Step 6: Wait for Deployment

AppRunner will:
1. Clone your GitHub repo
2. Build Docker image automatically
3. Start your service
4. Show you a service URL

**Takes 2-3 minutes.** You'll see a green checkmark when done.

---

## After Deployment

### Copy Your Service URL
Once deployed, you'll see something like:
```
https://abcd1234.eu-west-1.awsapprunner.com
```

Copy this URL.

### Test It Works
```bash
curl https://your-apprunner-url.awsapprunner.com/health
```

Should return:
```json
{"status":"healthy","timestamp":"...","service":"apprunner-backend"}
```

### Update Claude Desktop Config

Edit `~\AppData\Roaming\Claude\claude_desktop_config.json`:

Find this section:
```json
"fenergo-apprunner": {
  "command": "node",
  "args": ["c:\\Users\\PNoonan\\OneDrive - Fenergo\\Desktop\\MCPTest\\apprunner-mcp-connector.js"],
  "env": {
    "APPRUNNER_URL": "https://YOUR-APPRUNNER-URL-HERE",
    "FENERGO_API_TOKEN": "Bearer eyJhbGc...",
    "FENERGO_TENANT_ID": "f488cdba-2122-448d-952c-7a2a47f78f1b"
  }
}
```

Replace `YOUR-APPRUNNER-URL-HERE` with your actual URL from Step 5.

### Restart Claude Desktop

1. Close Claude Desktop completely
2. Wait 2 seconds
3. Reopen Claude Desktop
4. Start a new chat
5. Ask: "Can you tell me information on Documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
6. Should get actual documents back! ✅

---

## That's It!

Your AppRunner service is now live and will:
- **Auto-update** whenever you `git push` to GitHub
- **Handle requests** from Claude Desktop
- **Call Fenergo API** with the correct payload
- **Return results** to Claude

No Docker, no local builds, no manual uploads. Just push to GitHub and AppRunner handles the rest.

