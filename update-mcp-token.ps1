# Update MCP Server Token Without Restart
# Run this script whenever your Fenergo token expires

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

Write-Host "🔄 Updating MCP server token..." -ForegroundColor Cyan

# Normalize token
if (-not $Token.StartsWith("Bearer ")) {
    $Token = "Bearer $Token"
}

# Send update to running MCP server
try {
    $body = @{ token = $Token } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:3000/update-token" -Method POST -Body $body -ContentType "application/json"
    
    Write-Host "✅ Token updated successfully!" -ForegroundColor Green
    Write-Host "Server will use the new token for all subsequent requests." -ForegroundColor White
    
} catch {
    Write-Host "❌ Failed to update token: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Restart the server with the new token:" -ForegroundColor Yellow
    Write-Host '$env:FENERGO_API_TOKEN = "' $Token '"; node chatgpt-mcp-server.js' -ForegroundColor Gray
}
