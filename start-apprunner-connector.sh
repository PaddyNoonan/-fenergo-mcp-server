#!/bin/bash

# Bash startup script for AWS AppRunner MCP Connector
# This script makes it easy to start the connector with proper configuration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
APPRUNNER_URL="${APPRUNNER_URL:-https://brruyqnwu2.eu-west-1.awsapprunner.com}"
TENANT_ID="${TENANT_ID:-f488cdba-2122-448d-952c-7a2a47f78f1b}"
PORT="${PORT:-8091}"
REQUEST_TIMEOUT="${REQUEST_TIMEOUT:-30000}"
MAX_RETRIES="${MAX_RETRIES:-2}"
FENERGO_API_TOKEN="${FENERGO_API_TOKEN:-}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--token)
            FENERGO_API_TOKEN="$2"
            shift 2
            ;;
        -u|--url)
            APPRUNNER_URL="$2"
            shift 2
            ;;
        --tenant-id)
            TENANT_ID="$2"
            shift 2
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        --timeout)
            REQUEST_TIMEOUT="$2"
            shift 2
            ;;
        --retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        -h|--help)
            echo "AWS AppRunner MCP Connector Startup Script"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -t, --token TOKEN           Fenergo API token (required)"
            echo "  -u, --url URL               AppRunner URL (default: $APPRUNNER_URL)"
            echo "  --tenant-id ID              Fenergo Tenant ID (default: $TENANT_ID)"
            echo "  -p, --port PORT             Port to listen on (default: $PORT)"
            echo "  --timeout MS                Request timeout in ms (default: $REQUEST_TIMEOUT)"
            echo "  --retries N                 Max retry attempts (default: $MAX_RETRIES)"
            echo "  -h, --help                  Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --token 'Bearer eyJ...'"
            echo "  $0 -t 'eyJ...' -p 8092 --timeout 60000"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}🚀 AWS AppRunner MCP Connector Startup Script${NC}"
echo ""

# Check Node.js
echo -e "${YELLOW}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo -e "${YELLOW}Please install Node.js 18+ from https://nodejs.org/${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js $NODE_VERSION found${NC}"

# Check connector file
echo -e "${YELLOW}Checking connector file...${NC}"
if [[ ! -f "apprunner-mcp-connector.js" ]]; then
    echo -e "${RED}❌ apprunner-mcp-connector.js not found${NC}"
    echo -e "${YELLOW}Make sure you're in the correct directory${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Connector file found${NC}"

# Check token
if [[ -z "$FENERGO_API_TOKEN" ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  No token provided!${NC}"
    echo -e "${YELLOW}Your Fenergo API token is required to run the connector${NC}"
    echo ""
    echo -e "${CYAN}Usage:${NC}"
    echo -e "${NC}  $0 --token 'Bearer YOUR_TOKEN_HERE'${NC}"
    echo ""
    echo -e "${CYAN}Optional parameters:${NC}"
    echo -e "${NC}  --url (default: $APPRUNNER_URL)${NC}"
    echo -e "${NC}  --tenant-id (default: $TENANT_ID)${NC}"
    echo -e "${NC}  --port (default: $PORT)${NC}"
    echo -e "${NC}  --timeout (default: $REQUEST_TIMEOUT)${NC}"
    echo -e "${NC}  --retries (default: $MAX_RETRIES)${NC}"
    echo ""
    exit 1
fi

# Ensure token has Bearer prefix
if [[ ! "$FENERGO_API_TOKEN" =~ ^Bearer ]]; then
    FENERGO_API_TOKEN="Bearer $FENERGO_API_TOKEN"
fi

# Display configuration
echo ""
echo -e "${CYAN}⚙️  Configuration:${NC}"
echo -e "${NC}  AppRunner URL: $APPRUNNER_URL${NC}"
echo -e "${NC}  Tenant ID: $TENANT_ID${NC}"
echo -e "${NC}  Port: $PORT${NC}"
echo -e "${NC}  Request Timeout: $REQUEST_TIMEOUT ms${NC}"
echo -e "${NC}  Max Retries: $MAX_RETRIES${NC}"
echo ""

# Export environment variables
export APPRUNNER_URL
export FENERGO_API_TOKEN
export FENERGO_TENANT_ID="$TENANT_ID"
export PORT
export REQUEST_TIMEOUT
export MAX_RETRIES
export NODE_ENV="production"

# Start connector
echo -e "${YELLOW}Starting connector...${NC}"
echo ""
echo -e "${NC}Press Ctrl+C to stop the connector${NC}"
echo ""

# Trap interrupt signal to gracefully shutdown
trap 'echo ""; echo -e "${YELLOW}🛑 Connector stopped${NC}"; exit 0' SIGINT

node apprunner-mcp-connector.js
