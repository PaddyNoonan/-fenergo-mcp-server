// MCP SSE Server for ChatGPT MCP Connector
// Does NOT break Claude Desktop stdio connector
// Forwards MCP requests to Fenergo API

import http from 'http';
import https from 'https';

const PORT = process.env.PORT || 8080;
let FENERGO_API_TOKEN = process.env.FENERGO_API_TOKEN;
const FENERGO_TENANT_ID = process.env.FENERGO_TENANT_ID || 'f488cdba-2122-448d-952c-7a2a47f78f1b';

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
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: { raw: data } });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/mcp' && req.method === 'POST') {
    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        // Parse MCP request
        const mcpReq = JSON.parse(body);
        // Example MCP request: { tool: 'investigate_journey', parameters: { journeyId, query, scope } }
        if (mcpReq.tool !== 'investigate_journey') {
          res.write(`event: error\ndata: ${JSON.stringify({ error: 'Unknown tool' })}\n\n`);
          res.end();
          return;
        }
        const { journeyId, query, scope } = mcpReq.parameters;
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
          // Debug logging: print outgoing request
          console.log("[DEBUG] Fenergo API Request:", {
            url: 'https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights',
            headers: {
              Authorization: FENERGO_API_TOKEN,
              'Content-Type': 'application/json',
              'X-Tenant-Id': FENERGO_TENANT_ID,
              Accept: 'application/json'
            },
            payload: payload
          });
        const apiResponse = await callFenergoAPI(payload);
          // Debug logging: print raw response
          console.log("[DEBUG] Fenergo API Raw Response:", apiResponse.data);
        // Send MCP response as SSE
        res.write(`event: result\ndata: ${JSON.stringify({ result: apiResponse.data?.data?.response || 'No data returned', metadata: apiResponse.data?.data?.metadata || {} })}\n\n`);
        res.end();
      } catch (error) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    });
    return;
  }
  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    return;
  }
  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`✅ MCP SSE Server running on http://localhost:${PORT}`);
  console.log(`POST /mcp for ChatGPT MCP connector (SSE)`);
  console.log(`GET /health for health check`);
});
