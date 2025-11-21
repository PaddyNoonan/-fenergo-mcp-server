#!/usr/bin/env node

// AWS AppRunner MCP Connector for Claude AI
// Proper MCP Server implementation using stdio transport
// Proxies requests to an AWS AppRunner service running Fenergo Nebula API

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import https from 'https';

class AppRunnerMCPConnector {
  constructor() {
    try {
      console.error('Starting AppRunner MCP Connector...');
      this.config = this.loadSecureConfiguration();
      console.error('Configuration loaded successfully');

      // Session-level token cache (shared across tool calls in same session)
      this.tokenCache = {
        accessToken: null,
        expiresAt: null,
        tokenType: 'Bearer'
      };

      this.server = new Server(
        {
          name: 'apprunner-mcp-connector',
          version: '1.0.0',
          description: 'AWS AppRunner MCP Connector for Claude with OAuth authentication'
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
    const requiredEnvVars = [];
    const optionalEnvVars = ['FENERGO_API_TOKEN'];

    // Check for optional token (fallback for backward compatibility)
    const token = process.env.FENERGO_API_TOKEN;
    if (token) {
      console.error('FENERGO_API_TOKEN: SET (fallback)');
      console.error(`Token validation: length=${token.length}, starts with Bearer: ${token.startsWith('Bearer ')}`);
      if (!token.startsWith('Bearer ') && !token.includes('.')) {
        console.error('Invalid token format detected');
        throw new Error('Security Error: Invalid token format. Expected Bearer token or JWT.');
      }
    } else {
      console.error('FENERGO_API_TOKEN: NOT SET (will use OAuth authenticate_fenergo tool)');
    }

    return {
      apprunnerUrl: process.env.APPRUNNER_URL || 'https://tc8srxrkcp.eu-west-1.awsapprunner.com',
      apiToken: token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : null,
      tenantId: process.env.FENERGO_TENANT_ID || null,
      timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
      retries: parseInt(process.env.MAX_RETRIES || '2', 10)
    };
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'authenticate_fenergo',
            description: 'Authenticate with Fenergo Nebula API using client credentials. Uses OAuth client_credentials grant flow. Must be called first before using investigate_journey. Caches token for the session.',
            inputSchema: {
              type: 'object',
              properties: {
                tenantId: {
                  type: 'string',
                  description: 'Fenergo Tenant ID (GUID format)'
                }
              },
              required: ['tenantId']
            }
          },
          {
            name: 'investigate_journey',
            description: 'Investigate a Fenergo journey from AppRunner for documents or requirements insights. Requires prior authentication using authenticate_fenergo tool.',
            inputSchema: {
              type: 'object',
              properties: {
                journeyId: {
                  type: 'string',
                  description: 'Journey ID (GUID format)',
                  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                },
                query: {
                  type: 'string',
                  description: 'Natural language question about the journey'
                },
                scope: {
                  type: 'string',
                  enum: ['documents', 'requirements'],
                  description: 'Investigation scope: documents or requirements'
                }
              },
              required: ['journeyId', 'query', 'scope']
            }
          },
          {
            name: 'apprunner_health',
            description: 'Check health status of AppRunner service',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const timestamp = new Date().toISOString();

      console.error(`[${timestamp}] Tool Request Received: ${name}`);
      console.error(`[${timestamp}] Arguments:`, JSON.stringify(args, null, 2));

      if (name === 'authenticate_fenergo') {
        console.error(`[${timestamp}] Handling authenticate_fenergo request`);
        const result = await this.handleAuthenticateFenergo(args);
        console.error(`[${timestamp}] authenticate_fenergo response:`, JSON.stringify(result, null, 2));
        return result;
      } else if (name === 'investigate_journey') {
        console.error(`[${timestamp}] Handling investigate_journey request`);
        const result = await this.handleInvestigateJourney(args);
        console.error(`[${timestamp}] investigate_journey response:`, JSON.stringify(result, null, 2));
        return result;
      } else if (name === 'apprunner_health') {
        console.error(`[${timestamp}] Handling health check request`);
        const result = await this.handleHealthCheck();
        console.error(`[${timestamp}] health check response:`, JSON.stringify(result, null, 2));
        return result;
      } else {
        console.error(`[${timestamp}] Unknown tool requested: ${name}`);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`
            }
          ]
        };
      }
    });
  }

  async handleAuthenticateFenergo(args) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] === START handleAuthenticateFenergo ===`);

    try {
      const { tenantId } = args;

      console.error(`[${timestamp}] Received authentication parameters:`);
      console.error(`[${timestamp}]   tenantId: ${tenantId}`);

      // Validate inputs (only tenantId required for client_credentials grant flow)
      if (!tenantId) {
        console.error(`[${timestamp}] Validation failed - missing required tenantId`);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Missing required parameter: tenantId'
            }
          ]
        };
      }

      console.error(`[${timestamp}] Validation passed`);
      console.error(`[${timestamp}] Calling AppRunner /authenticate endpoint`);

      // Call AppRunner /authenticate endpoint
      const response = await this.callAppRunnerAuthenticate(tenantId);

      console.error(`[${timestamp}] Authentication response received:`);
      console.error(`[${timestamp}]   Status Code: ${response.statusCode}`);
      console.error(`[${timestamp}]   Response Data:`, JSON.stringify(response.data, null, 2));

      // Check for success
      if (response.statusCode !== 200 || !response.data.success) {
        const errorMsg = response.data.message || response.data.error || 'Authentication failed';
        console.error(`[${timestamp}] Authentication failed: ${errorMsg}`);
        console.error(`[${timestamp}] === END handleAuthenticateFenergo (AUTH_FAILED) ===`);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Authentication failed: ${errorMsg}`
            }
          ]
        };
      }

      // Cache token in session
      const tokenResponse = response.data;
      this.tokenCache.accessToken = tokenResponse.accessToken;
      this.tokenCache.tokenType = tokenResponse.tokenType || 'Bearer';

      // Calculate token expiration time
      if (tokenResponse.expiresIn) {
        this.tokenCache.expiresAt = new Date(Date.now() + tokenResponse.expiresIn * 1000);
      }

      console.error(`[${timestamp}] Token cached successfully`);
      console.error(`[${timestamp}]   Token Type: ${this.tokenCache.tokenType}`);
      console.error(`[${timestamp}]   Expires At: ${this.tokenCache.expiresAt}`);
      console.error(`[${timestamp}] === END handleAuthenticateFenergo (SUCCESS) ===`);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully authenticated with client credentials for tenant ${tenantId}. Token cached for session. You can now use the investigate_journey tool.`
          }
        ],
        isError: false
      };
    } catch (error) {
      console.error(`[${timestamp}] ERROR in handleAuthenticateFenergo:`, error.message);
      console.error(`[${timestamp}] Error stack:`, error.stack);
      console.error(`[${timestamp}] === END handleAuthenticateFenergo (ERROR) ===`);

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Authentication error: ${error.message}`
          }
        ]
      };
    }
  }

  async handleInvestigateJourney(args) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] === START handleInvestigateJourney ===`);

    try {
      const { journeyId, query, scope } = args;

      console.error(`[${timestamp}] Received parameters:`);
      console.error(`[${timestamp}]   journeyId: ${journeyId}`);
      console.error(`[${timestamp}]   query: ${query}`);
      console.error(`[${timestamp}]   scope: ${scope}`);

      // Validate inputs
      if (!journeyId || !query || !scope) {
        console.error(`[${timestamp}] Validation failed - missing required parameters`);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Missing required parameters: journeyId, query, or scope'
            }
          ]
        };
      }

      console.error(`[${timestamp}] Validation passed`);

      // Check for cached token or fallback to config token
      let authToken = null;
      if (this.tokenCache.accessToken) {
        console.error(`[${timestamp}] Using cached OAuth token`);
        authToken = `${this.tokenCache.tokenType} ${this.tokenCache.accessToken}`;
      } else if (this.config.apiToken) {
        console.error(`[${timestamp}] Using fallback Bearer token from config`);
        authToken = this.config.apiToken;
      } else {
        console.error(`[${timestamp}] ERROR: No authentication token available`);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'No authentication token available. Please call authenticate_fenergo tool first with your Fenergo credentials.'
            }
          ]
        };
      }

      // Build payload for AppRunner /execute endpoint
      // Fenergo API expects structured payload with data wrapper
      const payload = {
        data: {
          message: query,
          scope: {
            documentContext: {
              contextLevel: 'Journey',
              contextId: journeyId
            },
            documentRequirementContext: {
              contextLevel: 'Journey',
              contextId: journeyId
            }
          },
          conversationHistory: []
        }
      };

      console.error(`[${timestamp}] Built payload:`, JSON.stringify(payload, null, 2));
      console.error(`[${timestamp}] Calling AppRunner API at ${this.config.apprunnerUrl}/execute`);

      // Call AppRunner service /execute endpoint
      const response = await this.callAppRunnerAPI(payload, authToken);

      console.error(`[${timestamp}] AppRunner API response received:`);
      console.error(`[${timestamp}]   Status Code: ${response.statusCode}`);
      console.error(`[${timestamp}]   Response Data:`, JSON.stringify(response.data, null, 2));

      // Extract result from response
      let result = response.data && response.data.result
        ? response.data.result
        : (response.data ? JSON.stringify(response.data) : 'No response from AppRunner');

      // Ensure result is a string
      if (typeof result !== 'string') {
        result = JSON.stringify(result);
      }

      console.error(`[${timestamp}] Extracted result:`, result);
      console.error(`[${timestamp}] === END handleInvestigateJourney (SUCCESS) ===`);

      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ],
        isError: false
      };
    } catch (error) {
      console.error(`[${timestamp}] ERROR in handleInvestigateJourney:`, error.message);
      console.error(`[${timestamp}] Error stack:`, error.stack);
      console.error(`[${timestamp}] === END handleInvestigateJourney (ERROR) ===`);

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error investigating journey: ${error.message}`
          }
        ]
      };
    }
  }

  async handleHealthCheck() {
    try {
      const isHealthy = await this.checkAppRunnerHealth();
      return {
        content: [
          {
            type: 'text',
            text: isHealthy
              ? 'AppRunner service is healthy and accessible'
              : 'AppRunner service is not responding'
          }
        ],
        isError: !isHealthy
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Health check failed: ${error.message}`
          }
        ]
      };
    }
  }

  async callAppRunnerAPI(payload, authToken = null, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString();
      const postData = JSON.stringify(payload);
      const url = new URL(`${this.config.apprunnerUrl}/execute`);

      // Use provided authToken or fall back to config token
      const token = authToken || this.config.apiToken;

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
          'X-Tenant-Id': this.config.tenantId,
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: this.config.timeout
      };

      const requestType = retryCount === 0 ? 'INITIAL' : `RETRY_${retryCount}`;
      console.error(`[${timestamp}] [${requestType}] === START API Request ===`);
      console.error(`[${timestamp}] [${requestType}] Endpoint: ${url.hostname}${options.path}`);
      console.error(`[${timestamp}] [${requestType}] Method: ${options.method}`);
      console.error(`[${timestamp}] [${requestType}] Tenant ID: ${this.config.tenantId}`);
      console.error(`[${timestamp}] [${requestType}] Timeout: ${this.config.timeout}ms`);
      console.error(`[${timestamp}] [${requestType}] Payload:`, postData);

      const req = https.request(options, (res) => {
        let data = '';
        const startTime = Date.now();

        console.error(`[${timestamp}] [${requestType}] Response received - Status: ${res.statusCode}`);
        console.error(`[${timestamp}] [${requestType}] Response Headers:`, JSON.stringify(res.headers, null, 2));

        res.on('data', chunk => {
          data += chunk;
          console.error(`[${timestamp}] [${requestType}] Data chunk received (${chunk.length} bytes)`);
        });

        res.on('end', () => {
          const duration = Date.now() - startTime;
          console.error(`[${timestamp}] [${requestType}] All data received (Total: ${data.length} bytes, Duration: ${duration}ms)`);
          console.error(`[${timestamp}] [${requestType}] Response Body:`, data);

          // Retry on 5xx errors
          if (res.statusCode >= 500 && retryCount < this.config.retries) {
            console.error(`[${timestamp}] [${requestType}] Server error (${res.statusCode}), retrying... (${retryCount + 1}/${this.config.retries})`);
            setTimeout(() => {
              this.callAppRunnerAPI(payload, authToken, retryCount + 1).then(resolve).catch(reject);
            }, 1000 * (retryCount + 1));
            return;
          }

          try {
            const parsedData = JSON.parse(data);
            console.error(`[${timestamp}] [${requestType}] Parsed JSON response:`, JSON.stringify(parsedData, null, 2));
            console.error(`[${timestamp}] [${requestType}] === END API Request (SUCCESS) ===`);
            resolve({
              statusCode: res.statusCode,
              data: parsedData
            });
          } catch (e) {
            console.error(`[${timestamp}] [${requestType}] Failed to parse JSON: ${e.message}`);
            console.error(`[${timestamp}] [${requestType}] === END API Request (PARSE_ERROR) ===`);
            resolve({
              statusCode: res.statusCode,
              data: { raw: data }
            });
          }
        });
      });

      req.on('error', (err) => {
        console.error(`[${timestamp}] [${requestType}] ERROR - Network Error: ${err.message}`);
        console.error(`[${timestamp}] [${requestType}] Error Code: ${err.code}`);
        console.error(`[${timestamp}] [${requestType}] Error Stack:`, err.stack);

        // Retry on network errors
        if (retryCount < this.config.retries) {
          console.error(`[${timestamp}] [${requestType}] Retrying... (${retryCount + 1}/${this.config.retries})`);
          setTimeout(() => {
            this.callAppRunnerAPI(payload, authToken, retryCount + 1).then(resolve).catch(reject);
          }, 1000 * (retryCount + 1));
          return;
        }

        console.error(`[${timestamp}] [${requestType}] === END API Request (ERROR - Max retries exceeded) ===`);
        reject(err);
      });

      req.on('timeout', () => {
        console.error(`[${timestamp}] [${requestType}] ERROR - Request Timeout (${this.config.timeout}ms)`);
        req.destroy();

        if (retryCount < this.config.retries) {
          console.error(`[${timestamp}] [${requestType}] Retrying... (${retryCount + 1}/${this.config.retries})`);
          setTimeout(() => {
            this.callAppRunnerAPI(payload, authToken, retryCount + 1).then(resolve).catch(reject);
          }, 1000 * (retryCount + 1));
          return;
        }

        console.error(`[${timestamp}] [${requestType}] === END API Request (ERROR - Timeout) ===`);
        reject(new Error('Request timeout'));
      });

      console.error(`[${timestamp}] [${requestType}] Writing payload to request...`);
      req.write(postData);
      console.error(`[${timestamp}] [${requestType}] Calling req.end()...`);
      req.end();
    });
  }

  async callAppRunnerAuthenticate(tenantId) {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString();
      const postData = JSON.stringify({ tenantId });
      const url = new URL(`${this.config.apprunnerUrl}/authenticate`);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: this.config.timeout
      };

      console.error(`[${timestamp}] [AUTH] === START Authentication Request ===`);
      console.error(`[${timestamp}] [AUTH] Endpoint: ${url.hostname}${options.path}`);
      console.error(`[${timestamp}] [AUTH] Tenant ID: ${tenantId}`);

      const req = https.request(options, (res) => {
        let data = '';

        console.error(`[${timestamp}] [AUTH] Response status: ${res.statusCode}`);

        res.on('data', chunk => {
          data += chunk;
          console.error(`[${timestamp}] [AUTH] Data chunk received (${chunk.length} bytes)`);
        });

        res.on('end', () => {
          console.error(`[${timestamp}] [AUTH] All data received (${data.length} bytes)`);
          console.error(`[${timestamp}] [AUTH] Response body:`, data);

          try {
            const parsedData = JSON.parse(data);
            console.error(`[${timestamp}] [AUTH] Parsed JSON response:`, JSON.stringify(parsedData, null, 2));
            console.error(`[${timestamp}] [AUTH] === END Authentication Request (SUCCESS) ===`);
            resolve({
              statusCode: res.statusCode,
              data: parsedData
            });
          } catch (e) {
            console.error(`[${timestamp}] [AUTH] Failed to parse response as JSON: ${e.message}`);
            console.error(`[${timestamp}] [AUTH] === END Authentication Request (PARSE_ERROR) ===`);
            resolve({
              statusCode: res.statusCode,
              data: { raw: data }
            });
          }
        });
      });

      req.on('error', (err) => {
        console.error(`[${timestamp}] [AUTH] === Request ERROR ===`);
        console.error(`[${timestamp}] [AUTH] Error: ${err.message}`);
        console.error(`[${timestamp}] [AUTH] Code: ${err.code}`);
        console.error(`[${timestamp}] [AUTH] Stack:`, err.stack);
        reject(err);
      });

      req.on('timeout', () => {
        console.error(`[${timestamp}] [AUTH] === Request TIMEOUT ===`);
        req.destroy();
        reject(new Error('Authentication request timeout'));
      });

      console.error(`[${timestamp}] [AUTH] Writing payload to request...`);
      req.write(postData);
      console.error(`[${timestamp}] [AUTH] Calling req.end()...`);
      req.end();
    });
  }

  async checkAppRunnerHealth() {
    return new Promise((resolve) => {
      const url = new URL(`${this.config.apprunnerUrl}/health`);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'GET',
        timeout: 5000
      };

      const req = https.request(options, (res) => {
        resolve(res.statusCode < 500);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  setupErrorHandling() {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection:', reason);
      process.exit(1);
    });
  }

  logServerStart() {
    console.error('AppRunner MCP Connector initialized');
    console.error(`AppRunner URL: ${this.config.apprunnerUrl}`);
    console.error(`Tenant ID: ${this.config.tenantId}`);
    console.error(`Timeout: ${this.config.timeout}ms`);
    console.error(`Max Retries: ${this.config.retries}`);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AppRunner MCP Connector connected to Claude');
  }
}

// Main execution
const connector = new AppRunnerMCPConnector();
connector.run().catch(error => {
  console.error('Failed to start AppRunner MCP Connector:', error);
  process.exit(1);
});
