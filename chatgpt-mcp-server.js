#!/usr/bin/env node

// ChatGPT MCP HTTP Server for Fenergo Nebula API
// Exposes MCP protocol over HTTP for ChatGPT Enterprise

import http from 'http';
import https from 'https';

const PORT = process.env.PORT || 3000;

// Configuration from environment (mutable for token refresh)
let FENERGO_API_TOKEN = process.env.FENERGO_API_TOKEN;
const FENERGO_TENANT_ID = process.env.FENERGO_TENANT_ID || 'f488cdba-2122-448d-952c-7a2a47f78f1b';
const FENERGO_API_BASE = 'https://api.fenxstable.com/documentmanagementquery/api/documentmanagement';

// Validate configuration
if (!FENERGO_API_TOKEN) {
  console.error('ERROR: FENERGO_API_TOKEN environment variable is required');
  process.exit(1);
}

console.log('🚀 Starting Fenergo MCP Server for ChatGPT...');
console.log(`📍 API Base: ${FENERGO_API_BASE}`);
console.log(`🏢 Tenant: ${FENERGO_TENANT_ID}`);

// HTTP Server
const server = http.createServer(async (req, res) => {
    // MCP tools definition (shared)
    const mcpTools = [
      {
        name: 'investigate_journey',
        description: 'Investigate a Fenergo journey for documents or requirements insights',
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
      }
    ];
  // MCP protocol tool execution endpoint for ChatGPT
  if (req.url === '/mcp' && req.method === 'POST') {
    let body = '';
    console.log(`[${new Date().toISOString()}] /mcp POST request received from ${req.socket.remoteAddress}`);
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      console.log(`[${new Date().toISOString()}] /mcp POST raw body:`, body);
      try {
        const request = JSON.parse(body);
        // JSON-RPC tools/list support (must be after request is defined)
        if (request.jsonrpc === '2.0' && (request.method === 'tools/list' || request.method === 'listTools')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: mcpTools }));
          return;
        }
        // JSON-RPC 2.0 support
        if (request.jsonrpc === '2.0' && request.method === 'initialize') {
          // Respond with protocol info
          const result = {
            protocolVersion: '2024-01-01',
            server: {
              name: 'Fenergo Nebula MCP Server',
              version: '1.0.0',
              endpoints: {
                health: '/health',
                tools: '/tools',
                execute: '/execute',
                updateToken: '/update-token'
              }
            },
            tools: mcpTools
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }));
          return;
        }
        // JSON-RPC tool execution
        if (request.jsonrpc === '2.0' && request.method === 'executeTool') {
          const { tool, parameters } = request.params || {};
          if (tool !== 'investigate_journey') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Unknown tool' } }));
            return;
          }
          const { journeyId, query, scope } = parameters;
          let payload;
          if (scope === 'documents') {
            payload = {
              data: {
                message: query,
                scope: {
                  documentContext: {
                    contextLevel: 'Journey',
                    contextId: journeyId
                  },
                  documentRequirementContext: null
                },
                conversationHistory: []
              }
            };
          } else {
            payload = {
              data: {
                message: query,
                scope: {
                  documentContext: null,
                  documentRequirementContext: {
                    contextLevel: 'Journey',
                    contextId: journeyId
                  }
                },
                conversationHistory: []
              }
            };
          }
          const apiResponse = await callFenergoAPI(payload);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              result: apiResponse.data?.data?.response || 'No data returned',
              metadata: apiResponse.data?.data?.metadata || {}
            }
          }));
          return;
        }
        // Legacy MCP tool execution
        const { tool, parameters } = request;
        if (tool !== 'investigate_journey') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unknown tool' }));
          return;
        }
        const { journeyId, query, scope } = parameters;
        let payload;
        if (scope === 'documents') {
          payload = {
            data: {
              message: query,
              scope: {
                documentContext: {
                  contextLevel: 'Journey',
                  contextId: journeyId
                },
                documentRequirementContext: null
              },
              conversationHistory: []
            }
          };
        } else {
          payload = {
            data: {
              message: query,
              scope: {
                documentContext: null,
                documentRequirementContext: {
                  contextLevel: 'Journey',
                  contextId: journeyId
                }
              },
              conversationHistory: []
            }
          };
        }
        const apiResponse = await callFenergoAPI(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          result: apiResponse.data?.data?.response || 'No data returned',
          metadata: apiResponse.data?.data?.metadata || {}
        }));
      } catch (error) {
        console.error('MCP POST /mcp error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  // CORS headers for ChatGPT
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // No authentication required - token is in environment
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // MCP protocol endpoint for ChatGPT
  if (req.url === '/mcp' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'MCP endpoint is reachable.' }));
    return;
  }

  // Root endpoint - MCP server info
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'Fenergo Nebula MCP Server',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        tools: '/tools',
        execute: '/execute',
        updateToken: '/update-token'
      }
    }));
    return;
  }

  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    return;
  }

  // Token update endpoint
  if (req.url === '/update-token' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { token } = JSON.parse(body);
        if (!token) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Token is required' }));
          return;
        }
        
        FENERGO_API_TOKEN = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        console.log(`🔄 Token updated at ${new Date().toISOString()}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Token updated successfully' }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // MCP tools list
  if (req.url === '/tools' && req.method === 'GET') {
    const tools = {
      tools: [
        {
          name: 'investigate_journey',
          description: 'Investigate a Fenergo journey for documents or requirements insights',
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
        }
      ]
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tools));
    return;
  }

  // Execute tool
  if (req.url === '/execute' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const request = JSON.parse(body);
        const { tool, parameters } = request;
        
        if (tool !== 'investigate_journey') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unknown tool' }));
          return;
        }

        const { journeyId, query, scope } = parameters;
        
        // Build Fenergo API payload
        let payload;
        if (scope === 'documents') {
          payload = {
            data: {
              message: query,
              scope: {
                documentContext: {
                  contextLevel: 'Journey',
                  contextId: journeyId
                },
                documentRequirementContext: null
              },
              conversationHistory: []
            }
          };
        } else {
          payload = {
            data: {
              message: query,
              scope: {
                documentContext: null,
                documentRequirementContext: {
                  contextLevel: 'Journey',
                  contextId: journeyId
                }
              },
              conversationHistory: []
            }
          };
        }

        // Call Fenergo API
        const apiResponse = await callFenergoAPI(payload);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          result: apiResponse.data?.data?.response || 'No data returned',
          metadata: apiResponse.data?.data?.metadata || {}
        }));
        
      } catch (error) {
        console.error('Execute error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Call Fenergo API
function callFenergoAPI(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'api.fenxstable.com',
      port: 443,
      path: '/documentmanagementquery/api/documentmanagement/insights',
      method: 'POST',
      headers: {
        'Authorization': FENERGO_API_TOKEN,
        'Content-Type': 'application/json',
        'X-Tenant-Id': FENERGO_TENANT_ID,
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
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

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Start server
server.listen(PORT, () => {
  console.log(`✅ MCP Server running on http://localhost:${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /update-token - Update Fenergo token without restart`);
  console.log(`   GET  /tools - List available tools`);
  console.log(`   POST /execute - Execute a tool`);
  console.log(``);
  console.log(`🔗 For ChatGPT MCP:`);
  console.log(`   MCP Server URL: http://localhost:${PORT}`);
  console.log(`   Or use ngrok: ngrok http ${PORT}`);
  console.log(``);
  console.log(`🔄 To update token: .\\update-mcp-token.ps1 -Token "YOUR_NEW_TOKEN"`);
});
