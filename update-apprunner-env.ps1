#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Updates AWS AppRunner service with OAuth client credentials
.DESCRIPTION
    Adds FENERGO_CLIENT_SECRET environment variable to the AppRunner service
    to enable OAuth 2.0 password grant authentication flow
#>

# AppRunner service configuration
$ServiceArn = "arn:aws:apprunner:eu-west-1:541796865884:service/fenergo-mcp-server/aa6f1077658c4a6a863becb27fc89b44"
$Region = "eu-west-1"

# OAuth credentials (from user)
$ClientId = "quasar-sandbox"
$ClientSecret = "4dxIqk+/MnT6hIKecUFa1iqjLs/AhorbUQgMWjTDQqI="
$OAuthEndpoint = "https://identity.fenxstable.com/connect/token"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "AppRunner Service Update" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service ARN: $ServiceArn"
Write-Host "Region: $Region"
Write-Host ""
Write-Host "Adding environment variables:" -ForegroundColor Yellow
Write-Host "  - FENERGO_CLIENT_ID"
Write-Host "  - FENERGO_CLIENT_SECRET"
Write-Host "  - FENERGO_OAUTH_ENDPOINT"
Write-Host ""

# Get current service configuration
Write-Host "Fetching current AppRunner service configuration..." -ForegroundColor Yellow
try {
    $serviceInfo = aws apprunner describe-service `
        --service-arn $ServiceArn `
        --region $Region `
        --output json | ConvertFrom-Json

    if ($serviceInfo -and $serviceInfo.Service) {
        Write-Host "✓ Service found: $(($serviceInfo.Service.ServiceArn -split '/')[-1])" -ForegroundColor Green
        Write-Host "  Status: $($serviceInfo.Service.Status)"
        Write-Host "  Service URL: $($serviceInfo.Service.ServiceUrl)"
    } else {
        Write-Host "✗ Service not found or returned invalid response" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Failed to fetch service configuration" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Prepare environment variables for update
# Note: AppRunner environment variables are passed as key=value pairs
$envVars = @(
    "FENERGO_CLIENT_ID=$ClientId",
    "FENERGO_CLIENT_SECRET=$ClientSecret",
    "FENERGO_OAUTH_ENDPOINT=$OAuthEndpoint"
)

Write-Host ""
Write-Host "Updating AppRunner service with environment variables..." -ForegroundColor Yellow
Write-Host ""

# Update the service
try {
    $updateResult = aws apprunner update-service `
        --service-arn $ServiceArn `
        --instance-configuration `
        --region $Region `
        --output json 2>&1

    # Parse JSON response
    $updateJson = $updateResult | ConvertFrom-Json

    if ($updateJson -and $updateJson.Service) {
        Write-Host "✓ Service update initiated successfully" -ForegroundColor Green
        Write-Host "  Operation ID: $($updateJson.OperationId)"
        Write-Host "  Status: $($updateJson.Service.Status)"
    } else {
        # Check if update failed
        if ($updateResult -match "ValidationException\|InvalidRequestException") {
            Write-Host "✗ Service update failed due to validation error" -ForegroundColor Red
            Write-Host "Response: $updateResult"
            exit 1
        }
    }
} catch {
    Write-Host "✗ Failed to update service" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Update via AWS Console:" -ForegroundColor Yellow
    Write-Host "1. Go to AWS AppRunner console"
    Write-Host "2. Click on service: fenergo-mcp-server"
    Write-Host "3. Click 'Edit'"
    Write-Host "4. Scroll to 'Environment variables'"
    Write-Host "5. Add these variables:"
    Write-Host "   Name: FENERGO_CLIENT_ID"
    Write-Host "   Value: $ClientId"
    Write-Host "   ---"
    Write-Host "   Name: FENERGO_CLIENT_SECRET"
    Write-Host "   Value: $ClientSecret"
    Write-Host "   ---"
    Write-Host "   Name: FENERGO_OAUTH_ENDPOINT"
    Write-Host "   Value: $OAuthEndpoint"
    Write-Host "6. Click 'Save'"
    Write-Host "7. AppRunner will restart the service (2-3 minutes)"
    exit 1
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Update Complete!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ AppRunner is restarting the service..." -ForegroundColor Yellow
Write-Host "   This typically takes 2-3 minutes"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Wait for AppRunner status to change to 'RUNNING'"
Write-Host "2. Test the health endpoint:"
Write-Host "   curl https://brruyqnwu2.eu-west-1.awsapprunner.com/health"
Write-Host "3. Test OAuth authentication in Claude Desktop:"
Write-Host "   - Restart Claude Desktop"
Write-Host "   - Ask Claude to call the authenticate_fenergo tool"
Write-Host "   - You should be prompted for username/password/tenantId"
Write-Host ""
Write-Host "AppRunner Logs:" -ForegroundColor Yellow
Write-Host "View real-time logs with:"
Write-Host "aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow --region $Region"
Write-Host ""
