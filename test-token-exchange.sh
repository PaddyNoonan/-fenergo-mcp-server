#!/bin/bash

# Test Token Exchange directly with Fenergo
# Using a code from the previous authorization flow

CLIENT_ID="mcp-client"
CLIENT_SECRET="GKpbB0kB0y9a3MglFSFOTTDtQsXAtNLycog7W5+yQe8="
REDIRECT_URI="https://tc8srxrkcp.eu-west-1.awsapprunner.com/signin-oidc"
AUTHORITY="https://identity.fenxstable.com"

# Use the code and verifier from the last successful authorization
CODE="53DA4AE77E9E0248F281887B82940107FD798C6F328D9C52A47A716B83B18F32-1"
CODE_VERIFIER="doKKheFjQDdBlD74pvhoipobyOwTgQOSn6HGShNLWlU"

echo "========== TOKEN EXCHANGE TEST =========="
echo ""
echo "Testing: POST ${AUTHORITY}/connect/token"
echo ""
echo "Parameters:"
echo "  Client ID: ${CLIENT_ID}"
echo "  Client Secret: ${CLIENT_SECRET:0:10}...${CLIENT_SECRET: -10}"
echo "  Code: ${CODE:0:20}..."
echo "  Code Verifier: ${CODE_VERIFIER}"
echo ""
echo "========== ATTEMPT 1: client_secret_post (credentials in body) =========="

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${AUTHORITY}/connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -d "grant_type=authorization_code&code=${CODE}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&redirect_uri=${REDIRECT_URI}&code_verifier=${CODE_VERIFIER}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status: ${HTTP_CODE}"
echo "Response: ${BODY}"
echo ""

if [[ ${HTTP_CODE} -eq 200 ]]; then
  echo "✅ SUCCESS with client_secret_post"
else
  echo "❌ FAILED with client_secret_post (HTTP ${HTTP_CODE})"
  echo ""
  echo "========== ATTEMPT 2: client_secret_basic (HTTP Basic Auth) =========="
  
  # Create Basic Auth header: Base64(client_id:client_secret)
  BASIC_AUTH=$(echo -n "${CLIENT_ID}:${CLIENT_SECRET}" | base64)
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${AUTHORITY}/connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Accept: application/json" \
    -H "Authorization: Basic ${BASIC_AUTH}" \
    -d "grant_type=authorization_code&code=${CODE}&redirect_uri=${REDIRECT_URI}&code_verifier=${CODE_VERIFIER}")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)
  
  echo "HTTP Status: ${HTTP_CODE}"
  echo "Response: ${BODY}"
  echo ""
  
  if [[ ${HTTP_CODE} -eq 200 ]]; then
    echo "✅ SUCCESS with client_secret_basic"
  else
    echo "❌ FAILED with client_secret_basic (HTTP ${HTTP_CODE})"
  fi
fi
