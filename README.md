# 🏢 Fenergo Nebula MCP Connector# Fenergo Nebula MCP Connector



**Enterprise-ready Model Context Protocol (MCP) server for seamless Fenergo Nebula API integration.**A secure Model Context Protocol (MCP) server that provides authenticated access to the Fenergo Nebula API for document management and investigation workflows. Designed for enterprise use with OAuth 2.0 authentication, AWS hosting, and GPT Store publishing readiness.



## 🎯 Production-Ready Solution## Features



This is a **complete, production-ready MCP connector** that provides secure access to the Fenergo Nebula API through the Model Context Protocol. Built with **zero external dependencies** for maximum reliability and bulletproof enterprise deployment.- 🔐 **OAuth 2.0 Authentication**: Secure authorization code flow with PKCE

- 🏢 **Enterprise Security**: Rate limiting, CORS protection, and security headers

## ✨ Key Features- ☁️ **AWS Ready**: Complete CloudFormation template and Docker configuration

- 🔧 **MCP Protocol**: Full compliance with Model Context Protocol specification

- 🛡️ **Zero Dependencies**: Bulletproof reliability with no external libraries- 📊 **Document Investigation**: Comprehensive document analysis and compliance checking

- 🔑 **Bearer Token Authentication**: Direct integration with Fenergo Nebula API- 🚀 **Production Ready**: Logging, monitoring, and error handling

- 🏢 **Enterprise Security**: AWS-grade security and monitoring

- ☁️ **AWS Ready**: Complete CloudFormation infrastructure## Quick Start

- 🔧 **MCP Protocol**: 100% compliance with Model Context Protocol 2024-11-05

- 📊 **Document Investigation**: Full Fenergo Nebula document analysis capabilities### Prerequisites

- 🚀 **Production Ready**: Comprehensive testing, logging, and monitoring

- Node.js 18+ 

## 🚀 Quick Start- npm or yarn

- Docker (optional, for containerized deployment)

### Prerequisites- AWS CLI (for AWS deployment)



- Node.js 18+### Local Development

- Fresh Fenergo Nebula API Bearer token

- AWS account (for production deployment)1. **Clone and install dependencies:**

   ```bash

### 1. Test Locally   git clone <repository-url>

   cd fenergo-nebula-mcp-connector

```bash   npm install

# Set your API token   ```

$env:FENERGO_API_TOKEN="your-bearer-token-here"

2. **Configure environment:**

# Test the production server   ```bash

node test-production-server.js   # Copy the template to create your local environment file

```   cp .env.example .env

   # Then edit .env with your actual Fenergo OAuth credentials

### 2. Production Deployment   ```



```bash3. **Build and start:**

# Deploy to AWS using CloudFormation   ```bash

aws cloudformation create-stack \   npm run build

  --stack-name fenergo-nebula-mcp \   npm start

  --template-body file://aws/cloudformation.yml \   ```

  --capabilities CAPABILITY_IAM

```4. **For development with hot reload:**

   ```bash

## 🛠️ Available Tools   npm run dev

   ```

### 1. **ping** - Server Health Check

Tests MCP server connectivity and health status.### Docker Deployment



```json1. **Build and run with Docker Compose:**

{"name": "ping", "arguments": {"message": "test"}}   ```bash

```   docker-compose up -d

   ```

### 2. **test-connection** - API Connection Test

Verifies connectivity and authentication with Fenergo Nebula API.2. **Or build manually:**

   ```bash

```json   docker build -t fenergo-mcp-connector .

{"name": "test-connection", "arguments": {}}   docker run -p 3000:3000 --env-file .env fenergo-mcp-connector

```   ```



### 3. **investigate-document** - Document Investigation## Configuration

Searches and analyzes documents in Fenergo Nebula.

### Environment Variables

```json

{| Variable | Description | Required |

  "name": "investigate-document", |----------|-------------|----------|

  "arguments": {| `FENERGO_API_TOKEN` | Fenergo API Bearer Token | Yes |

    "query": "document-id-or-search-term",| `FENERGO_API_BASE_URL` | Fenergo Nebula API base URL | Yes |

    "maxResults": 10| `JWT_SECRET` | JWT signing secret | Yes |

  }| `PORT` | Server port (default: 3000) | No |

}| `NODE_ENV` | Environment (development/production) | No |

```

### Bearer Token Setup

## 📁 Project Structure

1. Contact Fenergo support to obtain an API bearer token

```2. Ensure your token has the following permissions:

📦 fenergo-nebula-mcp/   - Document investigation access

├── 🚀 fenergo-production-server.js     # Main production server   - API read/write permissions

├── ⚙️  fenergo-production-config.json  # Claude Desktop config3. Set the token in your environment configuration

├── 🧪 test-production-server.js        # Production test suite

├── 🧪 test-alternative-mcp-client.js   # MCP compliance tests## MCP Tools

├── 📦 package.json                     # Dependencies

├── 🐳 Dockerfile                       # Container specification### `test-connection`

├── 📋 PROJECT-SUMMARY.md               # Complete project overviewTest the connection to Fenergo Nebula API with current bearer token.

├── 🚀 AWS-DEPLOYMENT-GUIDE.md          # Detailed AWS deployment guide

├── 🌩️  aws/cloudformation.yml          # AWS infrastructure template**Parameters:** None

└── 🔧 src/                            # TypeScript source code

```### `investigate-document`

Perform document investigation using Fenergo's analysis engine.

## 🔧 Configuration

**Parameters:**

### Environment Variables- `documentId` (required): Document identifier

- `investigationType` (required): Type of investigation (`compliance`, `risk`, `aml`, `kyc`)

- `FENERGO_API_TOKEN`: Bearer token for Fenergo Nebula API- `parameters` (optional): Investigation parameters

- `FENERGO_API_BASE_URL`: API base URL (default: Fenergo Nebula production)

- `NODE_ENV`: Environment (development/production)### `list-investigations`

Get available investigation types and their requirements.

### API Configuration

## MCP Resources

The server connects to:

```### `fenergo://api-schema`

https://api.fenergonebula.com/documentmanagementquery/api/documentmanagementOpenAPI schema for the Fenergo Nebula API

```

### `fenergo://api-status`

## 🧪 TestingCurrent API connection status and configuration



### Test Production Server## MCP Prompts

```bash

node test-production-server.js### `compliance-investigation`

```Guided workflow for performing compliance investigations on documents

**Expected Result:** All tools should show ✅ SUCCESS

## AWS Deployment

### Test MCP Compliance  

```bash### Prerequisites

node test-alternative-mcp-client.js- AWS CLI configured

```- ECR repository created

**Expected Result:** 100% success rate with all server variants- Domain name and SSL certificate (optional)



## 🌩️ AWS Deployment### Deploy with CloudFormation



### Infrastructure Components1. **Build and push Docker image:**

   ```bash

- **ECS Fargate**: Serverless container hosting   # Login to ECR

- **Application Load Balancer**: High availability and SSL   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

- **VPC with Security Groups**: Network security   

- **CloudWatch**: Monitoring and logging   # Build and push

- **Secrets Manager**: Secure token storage   docker build -t fenergo-mcp-connector .

   docker tag fenergo-mcp-connector:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/fenergo-mcp-connector:latest

### Deployment Steps   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/fenergo-mcp-connector:latest

   ```

1. **Review AWS deployment guide**: `AWS-DEPLOYMENT-GUIDE.md`

2. **Deploy infrastructure**: Use CloudFormation template2. **Deploy infrastructure:**

3. **Configure monitoring**: Set up CloudWatch alerts   ```bash

4. **Test production endpoints**: Verify all tools working   aws cloudformation create-stack \

     --stack-name fenergo-mcp-connector \

## 🔒 Security     --template-body file://aws/cloudformation.yml \

     --parameters \

- ✅ **Bearer Token Authentication**: Secure API access       ParameterKey=OAuthClientId,ParameterValue="your-client-id" \

- ✅ **AWS IAM Integration**: Role-based access control       ParameterKey=OAuthClientSecret,ParameterValue="your-client-secret" \

- ✅ **VPC Network Isolation**: Private subnet deployment       ParameterKey=JWTSecret,ParameterValue="your-jwt-secret" \

- ✅ **Secrets Management**: AWS Secrets Manager integration       ParameterKey=DomainName,ParameterValue="mcp.yourdomain.com" \

- ✅ **Zero External Dependencies**: No supply chain vulnerabilities     --capabilities CAPABILITY_IAM

   ```

## 📊 Monitoring

3. **Monitor deployment:**

- **Health Checks**: Built-in MCP server health monitoring   ```bash

- **API Connectivity**: Automatic Fenergo API connection testing   aws cloudformation describe-stacks --stack-name fenergo-mcp-connector

- **CloudWatch Metrics**: Comprehensive AWS monitoring   ```

- **Structured Logging**: JSON logs for analysis

## Usage with MCP Clients

## 🆘 Troubleshooting

### Claude Desktop

### Common Issues

Add to your Claude Desktop configuration:

1. **401 Authentication Error**

   - **Cause**: Expired Bearer token (15-minute expiry)```json

   - **Solution**: Refresh token from Fenergo Nebula{

  "mcpServers": {

2. **Connection Timeout**    "fenergo-nebula": {

   - **Cause**: Network or security group issues      "command": "node",

   - **Solution**: Check VPC security groups and NAT gateway      "args": ["dist/index.js"],

      "env": {

3. **MCP Client Issues**        "FENERGO_API_TOKEN": "your-bearer-token",

   - **Cause**: Claude Desktop has Zod validation bugs        "JWT_SECRET": "your-jwt-secret"

   - **Solution**: Use alternative MCP clients      }

    }

### Debug Mode  }

}

Enable detailed logging:```

```bash

$env:LOG_LEVEL="debug"### VS Code MCP Extension

node fenergo-production-server.js

```The `.vscode/mcp.json` file is pre-configured for local development.



## 📈 Performance## Security Features



- **Zero Dependencies**: Maximum performance and reliability- **OAuth 2.0 with PKCE**: Secure authorization flow

- **Pure Node.js**: Optimized for enterprise workloads- **Rate Limiting**: Configurable request limits

- **Auto-scaling**: AWS ECS handles variable loads- **CORS Protection**: Cross-origin request security

- **Load Balancing**: Application Load Balancer distribution- **Helmet Security**: Security headers and XSS protection

- **Input Validation**: Zod schema validation

## 🏆 Production Readiness- **Error Handling**: Secure error messages without data leakage

- **Audit Logging**: Comprehensive request and authentication logging

### ✅ **Completed Features**

- Enterprise MCP server with full Fenergo integration## API Documentation

- Complete AWS deployment infrastructure

- Comprehensive testing and validationThe server exposes an OpenAPI schema at runtime via the `fenergo://api-schema` resource. For detailed API documentation, start the server and query this resource.

- Security and monitoring implementation

- Documentation and deployment guides## Monitoring and Logging



### ✅ **Quality Assurance**### Health Check

- 100% MCP protocol compliance validated```bash

- Zero external dependencies for reliabilitycurl http://localhost:3000/health

- Enterprise security standards met```

- Production testing completed

- AWS infrastructure validated### Logs

Structured JSON logging is enabled by default in production. Configure log levels with the `LOG_LEVEL` environment variable.

## 📞 Support

### AWS CloudWatch

For deployment assistance or technical support, refer to:When deployed on AWS, logs are automatically sent to CloudWatch with the log group `/ecs/fenergo-mcp-connector`.

- **PROJECT-SUMMARY.md**: Complete project overview

- **AWS-DEPLOYMENT-GUIDE.md**: Detailed deployment instructions## Development



## 🎉 Ready for Production!### Project Structure

```

This Fenergo Nebula MCP Connector is **enterprise-ready** and provides:├── src/

- **Bulletproof reliability** with zero external dependencies│   ├── index.ts              # Main server entry point

- **Full MCP protocol compliance** for any standard client│   ├── services/

- **Complete AWS deployment infrastructure**│   │   ├── auth.ts           # OAuth 2.0 service

- **Enterprise security and monitoring**│   │   ├── config.ts         # Configuration management

- **Comprehensive Fenergo Nebula API integration**│   │   └── fenergo-api.ts    # Fenergo API client

│   ├── middleware/

**Deploy with confidence!** 🚀│   │   ├── error-handler.ts  # Error handling
│   │   └── rate-limiter.ts   # Rate limiting
│   └── utils/
│       └── logger.ts         # Logging utility
├── aws/
│   └── cloudformation.yml    # AWS infrastructure
├── Dockerfile                # Container configuration
├── docker-compose.yml        # Local development
└── .vscode/
    └── mcp.json             # MCP configuration
```

### Scripts
- `npm run build` - Build TypeScript
- `npm run dev` - Development with watch mode
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Run linting and tests
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create a GitHub issue for bugs and feature requests
- Check the Fenergo documentation for API questions
- Review the MCP specification for protocol questions

## Changelog

### v1.0.0
- Initial release
- OAuth 2.0 authentication
- Document investigation tools
- AWS deployment configuration
- MCP protocol compliance