#!/usr/bin/env pwsh
# AWS App Runner - Update Service with Token

Write-Host "AWS App Runner Token Updater" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""

# Get token from user
Write-Host "Get fresh token from: https://identity.fenxstable.com" -ForegroundColor Yellow
Write-Host ""
$token = Read-Host "Paste your Bearer token"

# Create config as JSON file
$config = @{
    CodeRepository = @{
        RepositoryUrl = "https://github.com/PaddyNoonan/-fenergo-mcp-server"
        SourceCodeVersion = @{
            Type = "BRANCH"
            Value = "main"
        }
        CodeConfiguration = @{
            ConfigurationSource = "API"
            CodeConfigurationValues = @{
                Runtime = "NODEJS_18"
                BuildCommand = "npm install"
                StartCommand = "node chatgpt-mcp-server.js"
                Port = "3000"
                RuntimeEnvironmentVariables = @{
                    FENERGO_API_TOKEN = $token
                    FENERGO_TENANT_ID = "f488cdba-2122-448d-952c-7a2a47f78f1b"
                    PORT = "3000"
                }
            }
        }
    }
}

$jsonConfig = $config | ConvertTo-Json -Depth 10 -Compress
$tempFile = "$env:TEMP\apprunner-update.json"
[System.IO.File]::WriteAllText($tempFile, $jsonConfig)

Write-Host ""
Write-Host "Updating service..." -ForegroundColor Cyan

aws apprunner update-service `
    --service-arn "arn:aws:apprunner:eu-west-1:541796865884:service/fenergo-mcp-server/aa6f1077658c4a6a863becb27fc89b44" `
    --region eu-west-1 `
    --source-configuration file://$tempFile

Remove-Item $tempFile

Write-Host ""
Write-Host "✅ Update complete! Check AWS console for deployment status." -ForegroundColor Green
