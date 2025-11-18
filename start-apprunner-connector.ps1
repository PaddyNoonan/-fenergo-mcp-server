# PowerShell startup script for AWS AppRunner MCP Connector
# This script makes it easy to start the connector with proper configuration

param(
    [string]$Token = "",
    [string]$AppRunnerUrl = "https://brruyqnwu2.eu-west-1.awsapprunner.com",
    [string]$TenantId = "f488cdba-2122-448d-952c-7a2a47f78f1b",
    [int]$Port = 8091,
    [int]$Timeout = 30000,
    [int]$Retries = 2
)

Write-Host "🚀 AWS AppRunner MCP Connector Startup Script" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green

# Check if connector file exists
Write-Host "Checking connector file..." -ForegroundColor Yellow
if (-Not (Test-Path "apprunner-mcp-connector.js")) {
    Write-Host "❌ apprunner-mcp-connector.js not found" -ForegroundColor Red
    Write-Host "Make sure you're in the correct directory" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Connector file found" -ForegroundColor Green

# Check token
if ([string]::IsNullOrWhiteSpace($Token)) {
    Write-Host ""
    Write-Host "⚠️  No token provided!" -ForegroundColor Yellow
    Write-Host "Your Fenergo API token is required to run the connector" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  .\start-apprunner-connector.ps1 -Token 'Bearer YOUR_TOKEN_HERE'" -ForegroundColor White
    Write-Host ""
    Write-Host "Optional parameters:" -ForegroundColor Cyan
    Write-Host "  -AppRunnerUrl (default: $AppRunnerUrl)" -ForegroundColor White
    Write-Host "  -TenantId (default: $TenantId)" -ForegroundColor White
    Write-Host "  -Port (default: $Port)" -ForegroundColor White
    Write-Host "  -Timeout in ms (default: $Timeout)" -ForegroundColor White
    Write-Host "  -Retries (default: $Retries)" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Ensure token has Bearer prefix
if (-Not $Token.StartsWith("Bearer ")) {
    $Token = "Bearer $Token"
}

# Configure environment
Write-Host ""
Write-Host "⚙️  Configuration:" -ForegroundColor Cyan
Write-Host "  AppRunner URL: $AppRunnerUrl" -ForegroundColor White
Write-Host "  Tenant ID: $TenantId" -ForegroundColor White
Write-Host "  Port: $Port" -ForegroundColor White
Write-Host "  Request Timeout: $Timeout ms" -ForegroundColor White
Write-Host "  Max Retries: $Retries" -ForegroundColor White
Write-Host ""

# Set environment variables
$env:APPRUNNER_URL = $AppRunnerUrl
$env:FENERGO_API_TOKEN = $Token
$env:FENERGO_TENANT_ID = $TenantId
$env:PORT = $Port
$env:REQUEST_TIMEOUT = $Timeout
$env:MAX_RETRIES = $Retries
$env:NODE_ENV = "production"

# Start the connector
Write-Host "Starting connector..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the connector" -ForegroundColor Gray
Write-Host ""

node apprunner-mcp-connector.js

# Cleanup on exit
Write-Host ""
Write-Host "🛑 Connector stopped" -ForegroundColor Yellow
