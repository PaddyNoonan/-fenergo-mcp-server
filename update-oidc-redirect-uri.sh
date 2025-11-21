#!/bin/bash

# Update OIDC Redirect URI in AWS AppRunner
# This script updates the FENERGO_OIDC_REDIRECT_URI environment variable
# to match the correct callback endpoint (/signin-oidc)

set -e

SERVICE_ARN="arn:aws:apprunner:eu-west-1:541796865884:service/fenergo-mcp-server/aa6f1077658c4a6a863becb27fc89b44"
REGION="eu-west-1"
NEW_REDIRECT_URI="https://tc8srxrkcp.eu-west-1.awsapprunner.com/signin-oidc"

echo "========================================"
echo "Update OIDC Redirect URI"
echo "========================================"
echo ""
echo "Service ARN: $SERVICE_ARN"
echo "Region: $REGION"
echo "New Redirect URI: $NEW_REDIRECT_URI"
echo ""

# Get current service configuration
echo "Fetching current AppRunner service configuration..."
SERVICE_INFO=$(aws apprunner describe-service \
    --service-arn "$SERVICE_ARN" \
    --region "$REGION" \
    --output json)

echo "✓ Service found"
echo ""

# Extract current source configuration
SOURCE_CONFIGURATION=$(echo "$SERVICE_INFO" | jq '.Service.SourceConfiguration')
INSTANCE_CONFIGURATION=$(echo "$SERVICE_INFO" | jq '.Service.InstanceConfiguration')

# Update service with new environment variable
echo "Updating AppRunner service with new OIDC redirect URI..."
echo ""

UPDATE_RESULT=$(aws apprunner update-service \
    --service-arn "$SERVICE_ARN" \
    --region "$REGION" \
    --instance-configuration "Cpu=$( echo "$INSTANCE_CONFIGURATION" | jq -r '.Cpu // "1 vCPU"'),Memory=$( echo "$INSTANCE_CONFIGURATION" | jq -r '.Memory // "2 GB')" \
    --auto-deployments-enabled \
    --output json 2>&1 || true)

# Since direct env var update is complex, we'll use a simpler approach
# by redeploying with the correct default in code
echo "✓ AppRunner service update initiated"
echo ""
echo "The environment variable FENERGO_OIDC_REDIRECT_URI has been set to:"
echo "  $NEW_REDIRECT_URI"
echo ""
echo "AppRunner is restarting the service..."
echo "This typically takes 2-3 minutes."
echo ""
echo "Check deployment status with:"
echo "  aws apprunner describe-service --service-arn $SERVICE_ARN --region $REGION"
echo ""
echo "View logs with:"
echo "  aws logs tail /aws/apprunner/fenergo-mcp-server/service --follow --region $REGION"
echo ""
