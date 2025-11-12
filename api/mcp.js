// Vercel Serverless Function for Fenergo MCP
const https = require('https');

const FENERGO_TENANT_ID = process.env.FENERGO_TENANT_ID || 'f488cdba-2122-448d-952c-7a2a47f78f1b';
const FENERGO_API_BASE = 'https://api.fenxstable.com/documentmanagementquery/api/documentmanagement';

// Get token from environment
function getToken() {
  return process.env.FENERGO_API_TOKEN;
}

// Call Fenergo API
function callFenergoAPI(payload, token) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'api.fenxstable.com',
      port: 443,
      path: '/documentmanagementquery/api/documentmanagement/insights',
      method: 'POST',
      headers: {
        'Authorization': token,
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

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = getToken();
  if (!token) {
    return res.status(500).json({ error: 'FENERGO_API_TOKEN not configured' });
  }

  // Root endpoint
  if (req.url === '/' && req.method === 'GET') {
    return res.status(200).json({
      name: 'Fenergo Nebula MCP Server',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/api/mcp?action=health',
        tools: '/api/mcp?action=tools',
        execute: '/api/mcp?action=execute'
      }
    });
  }

  const { action } = req.query;

  // Health check
  if (action === 'health' && req.method === 'GET') {
    return res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  }

  // Tools list
  if (action === 'tools' && req.method === 'GET') {
    return res.status(200).json({
      tools: [{
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
      }]
    });
  }

  // Execute tool
  if (action === 'execute' && req.method === 'POST') {
    try {
      const { tool, parameters } = req.body;
      
      if (tool !== 'investigate_journey') {
        return res.status(400).json({ error: 'Unknown tool' });
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

      const apiResponse = await callFenergoAPI(payload, token);
      
      return res.status(200).json({
        result: apiResponse.data?.data?.response || 'No data returned',
        metadata: apiResponse.data?.data?.metadata || {}
      });
      
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(404).json({ error: 'Not found' });
};
