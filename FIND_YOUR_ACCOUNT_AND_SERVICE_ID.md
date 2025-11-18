# How to Find Your AWS Account ID and AppRunner Service ID

You need these two pieces of information to restart AppRunner:

```bash
aws apprunner start-deployment \
  --service-arn arn:aws:apprunner:eu-west-1:ACCOUNT:service/fenergo-mcp-server/SERVICE_ID \
  --region eu-west-1
```

---

## Method 1: AWS Console (Easiest)

### Find Your Account ID:
1. Log into **AWS Console**
2. Click your **account name** in the top right
3. Click **"My Account"** or **"Account Settings"**
4. Look for **"Account ID"** - it's a 12-digit number
5. Copy it (format: `123456789012`)

### Find Your AppRunner Service ID:
1. Go to **AWS AppRunner**
2. Find service named: **`fenergo-mcp-server`**
3. Click on it
4. Look at the URL in your browser - it shows the service ARN
5. The URL will look like: `https://console.aws.amazon.com/apprunner/home?region=eu-west-1#/...`
6. Copy the full **ARN** from the service details page

**The ARN format is:**
```
arn:aws:apprunner:eu-west-1:123456789012:service/fenergo-mcp-server/abcd1234efgh5678
```

---

## Method 2: AWS CLI (If credentials work)

### Find Account ID:
```bash
aws sts get-caller-identity --query Account --output text
```

This will output your 12-digit account ID.

### Find AppRunner Service ARN:
```bash
aws apprunner list-services --region eu-west-1 --query 'ServiceSummaryList[?ServiceName==`fenergo-mcp-server`].ServiceArn' --output text
```

This will output the full ARN.

---

## Method 3: Check Local AWS Config Files

### Windows:
Look in: `C:\Users\[USERNAME]\.aws\config` and `C:\Users\[USERNAME]\.aws\credentials`

These files might have comments or history showing your account ID.

### Mac/Linux:
Look in: `~/.aws/config` and `~/.aws/credentials`

---

## What You'll Get

Once you have both pieces, your command will look like:

```bash
aws apprunner start-deployment \
  --service-arn arn:aws:apprunner:eu-west-1:123456789012:service/fenergo-mcp-server/abcd1234efgh5678 \
  --region eu-west-1
```

**Components:**
- `123456789012` = Your AWS Account ID (12 digits)
- `abcd1234efgh5678` = Your Service ID (AppRunner generates this)
- `eu-west-1` = Region (stays the same)
- `fenergo-mcp-server` = Service name (stays the same)

---

## Quick Reference Format

Once found, save this for later use:

```
AWS Account ID: ________________
Service ID: ________________
Region: eu-west-1
Service Name: fenergo-mcp-server

Full ARN:
arn:aws:apprunner:eu-west-1:[ACCOUNT]:service/fenergo-mcp-server/[SERVICE_ID]
```

---

## If You're Stuck

**Easiest option:** Go to AWS Console → AppRunner → Click on `fenergo-mcp-server` → Copy the ARN from the service details page.

Then paste the full ARN into this command:

```bash
aws apprunner start-deployment --service-arn [PASTE_ARN_HERE] --region eu-west-1
```

---

**Next Step:** Find these values and reply with them (or the full ARN), then I'll help you restart AppRunner!

