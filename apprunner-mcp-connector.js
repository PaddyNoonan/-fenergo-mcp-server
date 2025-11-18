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

      this.server = new Server(
        {
          name: 'apprunner-mcp-connector',
          version: '1.0.0',
          description: 'AWS AppRunner MCP Connector for Claude with automatic retry and failover'
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
    const requiredEnvVars = ['FENERGO_API_TOKEN'];
    const missing = requiredEnvVars.filter(env => {
      const exists = !!process.env[env];
      console.error(`Environment variable ${env}: ${exists ? 'SET' : 'MISSING'}`);
      return !exists;
    });

    if (missing.length > 0) {
      console.error(`Missing environment variables: ${missing.join(', ')}`);
      throw new Error(`Security Error: Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate token format
    const token = process.env.FENERGO_API_TOKEN;
    console.error(`Token validation: length=${token ? token.length : 0}, starts with Bearer: ${token ? token.startsWith('Bearer ') : false}`);

    if (!token.startsWith('Bearer ') && !token.includes('.')) {
      console.error('Invalid token format detected');
      throw new Error('Security Error: Invalid token format. Expected Bearer token or JWT.');
    }

    return {
      apprunnerUrl: process.env.APPRUNNER_URL || 'https://brruyqnwu2.eu-west-1.awsapprunner.com',
      apiToken: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      tenantId: process.env.FENERGO_TENANT_ID || 'f488cdba-2122-448d-952c-7a2a47f78f1b',
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
            name: 'investigate_journey',
            description: 'Investigate a Fenergo journey from AppRunner for documents or requirements insights',
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

      if (name === 'investigate_journey') {
        return await this.handleInvestigateJourney(args);
      } else if (name === 'apprunner_health') {
        return await this.handleHealthCheck();
      } else {
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

  async handleInvestigateJourney(args) {
    try {
      const { journeyId, query, scope } = args;

      // Validate inputs
      if (!journeyId || !query || !scope) {
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

      // Build payload for AppRunner /execute endpoint
      const payload = {
        tool: 'investigate_journey',
        parameters: {
          journeyId: journeyId,
          query: query,
          scope: scope
        }
      };

      // Call AppRunner service /execute endpoint
      const response = await this.callAppRunnerAPI(payload);

      // Extract result from response
      const result = response.data && response.data.result
        ? response.data.result
        : (response.data ? JSON.stringify(response.data) : 'No response from AppRunner');

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
      console.error('Error in handleInvestigateJourney:', error);
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

  async callAppRunnerAPI(payload, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload);
      const url = new URL(`${this.config.apprunnerUrl}/execute`);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': this.config.apiToken,
          'Content-Type': 'application/json',
          'X-Tenant-Id': this.config.tenantId,
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: this.config.timeout
      };

      console.error(`[Request ${retryCount === 0 ? 'initial' : `retry ${retryCount}`}] POST ${url.hostname}${options.path}`);

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          console.error(`[Response] Status ${res.statusCode}`);

          // Retry on 5xx errors
          if (res.statusCode >= 500 && retryCount < this.config.retries) {
            console.error(`[Retry] Server error (${res.statusCode}), retrying... (${retryCount + 1}/${this.config.retries})`);
            setTimeout(() => {
              this.callAppRunnerAPI(payload, retryCount + 1).then(resolve).catch(reject);
            }, 1000 * (retryCount + 1));
            return;
          }

          try {
            resolve({
              statusCode: res.statusCode,
              data: JSON.parse(data)
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              data: { raw: data }
            });
          }
        });
      });

      req.on('error', (err) => {
        console.error(`[Error] ${err.message}`);

        // Retry on network errors
        if (retryCount < this.config.retries) {
          console.error(`[Retry] Network error, retrying... (${retryCount + 1}/${this.config.retries})`);
          setTimeout(() => {
            this.callAppRunnerAPI(payload, retryCount + 1).then(resolve).catch(reject);
          }, 1000 * (retryCount + 1));
          return;
        }

        reject(err);
      });

      req.on('timeout', () => {
        console.error('[Timeout] Request timed out');
        req.destroy();

        if (retryCount < this.config.retries) {
          console.error(`[Retry] Timeout, retrying... (${retryCount + 1}/${this.config.retries})`);
          setTimeout(() => {
            this.callAppRunnerAPI(payload, retryCount + 1).then(resolve).catch(reject);
          }, 1000 * (retryCount + 1));
          return;
        }

        reject(new Error('Request timeout'));
      });

      req.write(postData);
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
