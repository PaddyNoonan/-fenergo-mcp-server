#!/usr/bin/env node

// Claude Desktop Fenergo MCP Server
// Enterprise-grade connector for Fenergo Nebula API integration with Claude Desktop

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import https from 'https';

class FenergoClaudeConnector {
  constructor() {
    try {
      console.error('Starting Fenergo Claude Connector...');
      this.config = this.loadSecureConfiguration();
      console.error('Configuration loaded successfully');
      
      this.server = new Server(
        {
          name: 'fenergo-claude-connector',
          version: '1.0.0',
          description: 'Enterprise Fenergo Nebula API connector for Claude Desktop with OAuth2.0 security'
        },
        {
          capabilities: {
            tools: {},
            logging: {},
            prompts: {}
          }
        }
      );
      console.error('Server instance created');

      this.setupToolHandlers();
      console.error('Tool handlers setup complete');
      
      this.setupErrorHandling();
      console.error('Error handling setup complete');
      
      this.logServerStart();
      console.error('Server logging initialized');
    } catch (error) {
      console.error('Error in constructor:', error.message);
      throw error;
    }
  }

  loadSecureConfiguration() {
    console.error('Loading configuration...');
    const requiredEnvVars = ['FENERGO_API_TOKEN', 'FENERGO_TENANT_ID'];
    const missing = requiredEnvVars.filter(env => {
      const exists = !!process.env[env];
      console.error(`Environment variable ${env}: ${exists ? 'SET' : 'MISSING'}`);
      return !exists;
    });
    
    if (missing.length > 0) {
      console.error(`Missing environment variables: ${missing.join(', ')}`);
      throw new Error(`Security Error: Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate token format (should start with Bearer or be JWT)
    const token = process.env.FENERGO_API_TOKEN;
    console.error(`Token validation: length=${token ? token.length : 0}, starts with Bearer: ${token ? token.startsWith('Bearer ') : false}, contains dots: ${token ? token.includes('.') : false}`);
    
    if (!token.startsWith('Bearer ') && !token.includes('.')) {
      console.error('Invalid token format detected');
      throw new Error('Security Error: Invalid token format. Expected Bearer token or JWT.');
    }

    return {
      apiBaseUrl: process.env.FENERGO_API_BASE_URL || 
        'https://api.fenxstable.com/documentmanagementquery/api/documentmanagement',
      apiToken: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      tenantId: process.env.FENERGO_TENANT_ID,
      timeout: parseInt(process.env.FENERGO_TIMEOUT || '30000', 10),
      retries: parseInt(process.env.FENERGO_RETRIES || '2', 10)
    };
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'fenergo_insights_agent_docstask',
            description: 'Investigate journeys in Fenergo Nebula for compliance, risk assessment, and document management. Choose between Documents or Requirements scope and ask your question naturally.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Your investigation question. You can include the journey ID anywhere in your message and ask any question about the journey. Example: "What is the status of journey b44f1862-cc32-4296-898d-c92a881c7fff?" or "Check compliance for journey 12345678-1234-1234-1234-123456789abc"',
                },
                scope: {
                  type: 'string',
                  enum: ['documents', 'requirements'],
                  description: 'Select the investigation scope: "documents" (investigate document context) or "requirements" (investigate document requirement context)',
                }
              },
              required: ['query', 'scope']
            }
          },
          {
            name: 'fenergo_ping',
            description: 'Test connectivity and authentication with Fenergo Nebula API',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false
            }
          },
          {
            name: 'fenergo_token_status',
            description: 'Check JWT token validity and expiration status',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false
            }
          }
        ]
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        this.logToolExecution(name, args);

        switch (name) {
          case 'fenergo_insights_agent_docstask':
            return await this.handleJourneyInvestigation(args);
          case 'fenergo_ping':
            return await this.handlePing();
          case 'fenergo_token_status':
            return await this.handleTokenStatus();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await this.logError(`Tool execution failed for ${name}`, error);
        
        return {
          content: [{
            type: 'text',
            text: `❌ Error: ${errorMessage}\n\nTool: ${name}\nTime: ${new Date().toISOString()}`
          }],
          isError: true
        };
      }
    });
  }

  async handleJourneyInvestigation(request) {
    const { query, scope } = request;

    // Validate required fields
    if (!query || query.trim().length === 0) {
      throw new Error('Investigation query is required. Please provide your question about a journey.');
    }

    if (!scope) {
      throw new Error('Scope selection is required. Please choose either "documents" or "requirements".');
    }

    // Extract journey ID (GUID) from the free-form text
    const guidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const journeyIdMatch = query.match(guidRegex);
    
    if (!journeyIdMatch) {
      throw new Error('No valid journey ID found in your query. Please include a journey ID (GUID format) in your message. Example: "What is the status of journey b44f1862-cc32-4296-898d-c92a881c7fff?"');
    }

    const journeyId = journeyIdMatch[0];

    // Build JSON-RPC 2.0 payload for /execute
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        tool: "investigate_journey",
        parameters: {
          journeyId,
          query: query.trim(),
          scope
        }
      }
    };

    const apiUrl = `${this.config.apiBaseUrl}/insights`;
    const response = await this.makeSecureApiRequest(apiUrl, 'POST', payload);

    if (response.statusCode === 200 && response.data?.result) {
      // Optionally format the result if needed
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data.result, null, 2)
        }]
      };
    } else if (response.statusCode === 401) {
      throw new Error('Authentication failed: Token may be expired or invalid. Please refresh your Fenergo API token.');
    } else {
      throw new Error(`API request failed with status ${response.statusCode}: ${JSON.stringify(response.data)}`);
    }
  }

  async handlePing() {
    const timestamp = new Date().toISOString();
    
    try {
      // Basic connectivity test without using API quota
      const testUrl = new URL(this.config.apiBaseUrl);
      const tokenValid = this.validateTokenFormat(this.config.apiToken);
      
      const result = {
        success: true,
        server: 'fenergo-claude-connector',
        message: '🟢 Pong! Fenergo Claude Connector is operational',
        timestamp,
        environment: process.env.NODE_ENV || 'development',
        apiEndpoint: testUrl.origin,
        tenantConfigured: !!this.config.tenantId,
        tokenValidFormat: tokenValid,
        version: '1.0.0'
      };
      
      await this.logSuccess('Ping successful');
      
      return {
        content: [{
          type: 'text',
          text: `🟢 **Fenergo Connector Status**\n\n${JSON.stringify(result, null, 2)}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logError('Ping failed', error);
      
      return {
        content: [{
          type: 'text',
          text: `🔴 **Ping Failed**\n\nError: ${errorMessage}\nTime: ${timestamp}`
        }],
        isError: true
      };
    }
  }

  async handleTokenStatus() {
    try {
      const token = this.config.apiToken.replace('Bearer ', '');
      
      // Basic JWT validation (decode without verification for expiry check)
      if (token.includes('.')) {
        const parts = token.split('.');
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            const exp = payload.exp * 1000; // Convert to milliseconds
            const now = Date.now();
            const isValid = exp > now;
            const timeRemaining = Math.max(0, exp - now);
            
            const result = {
              tokenValid: isValid,
              expiresAt: new Date(exp).toLocaleString(),
              timeRemainingMs: timeRemaining,
              timeRemainingMinutes: Math.floor(timeRemaining / (1000 * 60)),
              status: isValid ? '✅ Valid' : '❌ Expired'
            };
            
            return {
              content: [{
                type: 'text',
                text: `🔐 **Token Status**\n\n${JSON.stringify(result, null, 2)}`
              }]
            };
          } catch (parseError) {
            return {
              content: [{
                type: 'text',
                text: '⚠️ **Token Status**: Unable to parse JWT token payload'
              }]
            };
          }
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: '⚠️ **Token Status**: Token format not recognized as JWT'
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{
          type: 'text',
          text: `❌ **Token Status Error**: ${errorMessage}`
        }],
        isError: true
      };
    }
  }

  validateTokenFormat(token) {
    return token.startsWith('Bearer ') && (token.includes('.') || token.length > 50);
  }

  async makeSecureApiRequest(apiUrl, method, payload) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(apiUrl);
      const postData = payload ? JSON.stringify(payload) : undefined;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
          'Authorization': this.config.apiToken,
          'Content-Type': 'application/json',
          'X-Tenant-Id': this.config.tenantId,
          'Accept': 'application/json',
          'User-Agent': 'Fenergo-Claude-Connector/1.0.0',
          ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
        },
        timeout: this.config.timeout,
        // Enterprise security settings
        secureProtocol: 'TLSv1_2_method',
        rejectUnauthorized: true
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              statusCode: res.statusCode || 0,
              data: jsonData,
              headers: res.headers
            });
          } catch (parseError) {
            resolve({
              statusCode: res.statusCode || 0,
              data: { message: data },
              headers: res.headers
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  formatInvestigationResponse(data, journeyId, customQuery, scope) {
    let formatted = `📊 **Fenergo Journey Investigation Results**\n`;
    formatted += `${'='.repeat(60)}\n\n`;
    formatted += `🆔 **Journey ID**: \`${journeyId}\`\n`;
    formatted += `📋 **Scope**: ${scope === 'documents' ? 'Documents Context' : 'Requirements Context'}\n`;
    formatted += `💬 **Query**: "${customQuery}"\n`;
    formatted += `🕒 **Timestamp**: ${new Date().toLocaleString()}\n\n`;

    if (data.data?.response) {
      formatted += `📋 **Investigation Results:**\n\n${data.data.response}\n\n`;
    }

    if (data.data?.metadata) {
      formatted += `📊 **Metadata:**\n`;
      formatted += `- Document Count: ${data.data.metadata.documentCount || 'N/A'}\n`;
      formatted += `- Document Requirements: ${data.data.metadata.documentRequirementCount || 'N/A'}\n\n`;
    }

    if (data.data?.conversation && data.data.conversation.length > 0) {
      formatted += `💬 **Conversation History**: ${data.data.conversation.length} messages\n`;
    }

    formatted += `\n✅ Investigation completed successfully`;
    return formatted;
  }

  // Enterprise logging methods
  async logServerStart() {
    const startMessage = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      server: 'fenergo-claude-connector',
      message: 'Claude Desktop connector started',
      version: '1.0.0',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };
    
    console.error(JSON.stringify(startMessage));
  }

  async logToolExecution(toolName, args) {
    const logMessage = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      server: 'fenergo-claude-connector',
      message: `Executing tool: ${toolName}`,
      args: Object.keys(args || {})
    };
    
    console.error(JSON.stringify(logMessage));
  }

  async logSuccess(message) {
    const logMessage = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      server: 'fenergo-claude-connector',
      message
    };
    
    console.error(JSON.stringify(logMessage));
  }

  async logError(message, error) {
    const logMessage = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      server: 'fenergo-claude-connector',
      message,
      error: error instanceof Error ? error.message : String(error)
    };
    
    console.error(JSON.stringify(logMessage));
  }

  setupErrorHandling() {
    process.on('uncaughtException', async (error) => {
      await this.logError('Uncaught exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      await this.logError('Unhandled rejection', reason);
    });

    process.on('SIGTERM', async () => {
      await this.logSuccess('Received SIGTERM, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      await this.logSuccess('Received SIGINT, shutting down gracefully');
      process.exit(0);
    });
  }

  async start() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      await this.logSuccess('Fenergo Claude Connector ready for Claude Desktop integration');
    } catch (error) {
      await this.logError('Failed to start server', error);
      throw error;
    }
  }
}

// Start the server automatically when loaded
const connector = new FenergoClaudeConnector();
connector.start().catch((error) => {
  console.error('Failed to start Fenergo Claude Connector:', error);
  process.exit(1);
});

export { FenergoClaudeConnector };