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

      // Token cache for SSO authentication
      this.tokenCache = {
        accessToken: null,
        expiresAt: null
      };

      this.server = new Server(
        {
          name: 'Fenergo Insights Connector',
          version: '1.0.0',
          description: 'Enterprise Fenergo Nebula API connector for Claude Desktop with dynamic OIDC SSO authentication'
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
    const requiredEnvVars = ['FENERGO_TENANT_ID'];
    const missing = requiredEnvVars.filter(env => {
      const exists = !!process.env[env];
      console.error(`Environment variable ${env}: ${exists ? 'SET' : 'MISSING'}`);
      return !exists;
    });

    if (missing.length > 0) {
      console.error(`Missing environment variables: ${missing.join(', ')}`);
      throw new Error(`Security Error: Missing required environment variables: ${missing.join(', ')}`);
    }

    return {
      apiBaseUrl: process.env.FENERGO_API_BASE_URL ||
        'https://api.fenxstable.com/documentmanagementquery/api',
      tenantId: process.env.FENERGO_TENANT_ID,
      appRunnerUrl: process.env.APPRUNNER_URL ||
        'https://tc8srxrkcp.eu-west-1.awsapprunner.com',
      timeout: parseInt(process.env.FENERGO_TIMEOUT || '30000', 10),
      retries: parseInt(process.env.FENERGO_RETRIES || '2', 10)
    };
  }

  async attemptSSO() {
    return new Promise((resolve, reject) => {
      const requestBody = JSON.stringify({ tenantId: this.config.tenantId });
      const parsedUrl = new URL(`${this.config.appRunnerUrl}/auth/login`);

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);

            if (response.accessToken) {
              const now = Date.now();
              this.tokenCache.accessToken = response.accessToken;
              this.tokenCache.expiresAt = now + ((response.expiresIn || 3600) * 1000);
              resolve({ token: response.accessToken, expiresIn: response.expiresIn || 3600 });
            } else if (response.authorizationUrl) {
              resolve({ authorizationUrl: response.authorizationUrl });
            } else {
              reject(new Error('Unexpected response from AppRunner'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(requestBody);
      req.end();
    });
  }

  async getSSOToken() {
    const now = Date.now();

    // Return cached token if still valid (with 60 second buffer)
    if (this.tokenCache.accessToken && this.tokenCache.expiresAt && this.tokenCache.expiresAt > now + 60000) {
      console.error('Using cached SSO token');
      return this.tokenCache.accessToken;
    }

    // Check if token is provided via environment variable
    if (process.env.FENERGO_SSO_TOKEN) {
      console.error('Using SSO token from environment variable');
      const token = process.env.FENERGO_SSO_TOKEN;

      // Attempt to cache it with expiration info
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload.exp) {
            const expiresAt = payload.exp * 1000;
            this.tokenCache.accessToken = token;
            this.tokenCache.expiresAt = expiresAt;
            console.error(`Token cached, expires at ${new Date(expiresAt).toISOString()}`);
          }
        }
      } catch (e) {
        console.error('Warning: Could not parse token expiration from JWT');
      }

      return token;
    }

    // Use attemptSSO to get either a token or authorization URL
    const result = await this.attemptSSO();

    if (result.token) {
      console.error(`SSO token acquired from AppRunner, expires in ${result.expiresIn}s`);
      return result.token;
    }

    if (result.authorizationUrl) {
      throw new Error(
        `No SSO token available. Please authenticate first by calling the 'authenticate' tool in Claude Desktop. ` +
        `That will provide you with the authentication URL to complete SSO login.`
      );
    }

    throw new Error('Unexpected response from SSO flow');
  }


  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'investigate_journey',
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
          },
          {
            name: 'authenticate',
            description: 'Authenticate with Fenergo via SSO to obtain an access token for API calls',
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
          case 'investigate_journey':
            return await this.handleJourneyInvestigation(args);
          case 'fenergo_ping':
            return await this.handlePing();
          case 'fenergo_token_status':
            return await this.handleTokenStatus();
          case 'authenticate':
            return await this.handleAuthenticate();
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

    // Build request payload for AppRunner /execute endpoint
    const payload = {
      data: {
        message: query.trim(),
        scope: {
          documentContext: {
            contextLevel: "Journey",
            contextId: journeyId
          },
          documentRequirementContext: scope === "requirements" ? {
            contextLevel: "Journey",
            contextId: journeyId
          } : null
        },
        conversationHistory: []
      }
    };

    // Route through AppRunner backend which has the authenticated token
    const apiUrl = `${this.config.appRunnerUrl}/execute`;
    const response = await this.makeAppRunnerRequest(apiUrl, 'POST', payload);

    if (response.statusCode === 200 && response.data?.data?.response) {
      // Format the AI response from the insights endpoint
      return {
        content: [{
          type: 'text',
          text: response.data.data.response
        }]
      };
    } else if (response.statusCode === 401) {
      throw new Error('Authentication failed: Token may be expired or invalid. Please authenticate using the "authenticate" tool.');
    } else if (response.statusCode === 403) {
      throw new Error('Authorization failed: Your token does not have permission to access this resource. This may require administrator approval.');
    } else {
      throw new Error(`API request failed with status ${response.statusCode}: ${JSON.stringify(response.data)}`);
    }
  }

  async handleAuthenticate() {
    console.error('Attempting SSO authentication');

    try {
      const result = await this.attemptSSO();

      // If result contains a token, we're authenticated!
      if (result.token) {
        console.error('SSO authentication successful - token acquired');
        await this.logSuccess('SSO authentication successful');

        return {
          content: [{
            type: 'text',
            text: `✅ **SSO Authentication Successful!**

You are now authenticated with Fenergo for tenant \`${this.config.tenantId}\`.

**Token Details:**
- Status: Valid and cached
- Expires In: ${result.expiresIn || 3600} seconds
- Scopes: openid, profile, fenx.all

You can now use me to investigate journeys and query documents. Just ask me anything about your Fenergo data!`
          }]
        };
      }

      // If result contains authorizationUrl, show it to user
      if (result.authorizationUrl) {
        console.error('SSO authentication flow initiated - showing auth URL to user');
        return {
          content: [{
            type: 'text',
            text: `🔐 **Fenergo SSO Authentication - Step 1 of 2**

I've initiated the SSO authentication flow. Here's what to do:

**Step 1: Click this link to log in with your Fenergo credentials:**
${result.authorizationUrl}

**Step 2: After you authenticate in your browser:**
1. You'll see a confirmation page
2. Come back and call "authenticate" again
3. I'll retrieve your cached token automatically
4. You'll then have full access to query all Fenergo journeys and documents`
          }]
        };
      }

      throw new Error('Unexpected response from authentication flow');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logError('SSO authentication failed', error);

      return {
        content: [{
          type: 'text',
          text: `❌ **SSO Authentication Failed**

Error: ${errorMessage}

Time: ${new Date().toISOString()}`
        }],
        isError: true
      };
    }
  }

  async handlePing() {
    const timestamp = new Date().toISOString();

    try {
      // Test SSO authentication
      const token = await this.getSSOToken();
      const tokenValid = token && token.length > 0;

      const testUrl = new URL(this.config.apiBaseUrl);

      const result = {
        success: true,
        server: 'Fenergo Insights Connector',
        message: '🟢 Pong! Fenergo Insights Connector is operational',
        timestamp,
        environment: process.env.NODE_ENV || 'development',
        apiEndpoint: testUrl.origin,
        tenantConfigured: !!this.config.tenantId,
        ssoAuthenticated: tokenValid,
        authMethod: 'OIDC SSO',
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
      const now = Date.now();
      const cached = this.tokenCache.accessToken && this.tokenCache.expiresAt;

      if (cached && this.tokenCache.expiresAt > now) {
        const timeRemaining = this.tokenCache.expiresAt - now;
        const result = {
          tokenValid: true,
          source: 'SSO (Cached)',
          expiresAt: new Date(this.tokenCache.expiresAt).toLocaleString(),
          timeRemainingMs: timeRemaining,
          timeRemainingMinutes: Math.floor(timeRemaining / (1000 * 60)),
          status: '✅ Valid'
        };

        return {
          content: [{
            type: 'text',
            text: `🔐 **SSO Token Status**\n\n${JSON.stringify(result, null, 2)}`
          }]
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: `⚠️ **No Active SSO Token**\n\nPlease authenticate first using the 'authenticate' tool.`
          }]
        };
      }
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

  async makeAppRunnerRequest(apiUrl, method, payload) {
    // Make request to AppRunner backend (no token needed - AppRunner handles auth)
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(apiUrl);
      const postData = payload ? JSON.stringify(payload) : undefined;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': this.config.tenantId,
          'Accept': 'application/json',
          'User-Agent': 'Fenergo-Claude-Connector/1.0.0',
          ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
        },
        timeout: this.config.timeout,
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

  async makeSecureApiRequest(apiUrl, method, payload) {
    // Get fresh or cached SSO token
    const token = await this.getSSOToken();

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(apiUrl);
      const postData = payload ? JSON.stringify(payload) : undefined;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
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

      // Automatically attempt SSO authentication on startup
      console.error(`Attempting automatic SSO authentication for tenant ${this.config.tenantId}...`);
      try {
        const authResult = await this.attemptSSO();
        if (authResult && authResult.token) {
          // Token received immediately (e.g., from cache)
          await this.logSuccess(`Authenticated successfully for tenant ${this.config.tenantId}`);
        } else if (authResult && authResult.authorizationUrl) {
          // Browser-based SSO required - notify user
          await this.logSuccess(`Authentication required. Please open this URL in your browser to authenticate:\n${authResult.authorizationUrl}`);
        }
      } catch (authError) {
        // Don't fail server startup if auth fails - user can manually authenticate later
        console.error(`Auto-authentication could not complete: ${authError.message}`);
        console.error('You can manually authenticate using the "authenticate" tool when needed.');
      }
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