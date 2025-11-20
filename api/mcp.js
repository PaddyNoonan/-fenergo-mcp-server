// Vercel Serverless Function for Fenergo MCP
const https = require('https');

const FENERGO_TENANT_ID = process.env.FENERGO_TENANT_ID || 'f488cdba-2122-448d-952c-7a2a47f78f1b';
const FENERGO_API_BASE = 'https://api.fenxstable.com/documentmanagementquery/api/documentmanagement';

// Get token from environment
function getToken() {
  return process.env.FENERGO_API_TOKEN;
}

// OAuth Authentication for password grant flow
function authenticateWithOAuth(username, password, tenantId) {
  return new Promise((resolve, reject) => {
    const clientId = process.env.FENERGO_CLIENT_ID || 'quasar-sandbox';
    const clientSecret = process.env.FENERGO_CLIENT_SECRET;
    const oauthEndpoint = process.env.FENERGO_OAUTH_ENDPOINT || 'https://identity.fenxstable.com/connect/token';

    // Build request body
    const bodyParams = new URLSearchParams();
    bodyParams.append('grant_type', 'password');
    bodyParams.append('username', username);
    bodyParams.append('password', password);
    bodyParams.append('client_id', clientId);
    if (clientSecret) {
      bodyParams.append('client_secret', clientSecret);
    }
    bodyParams.append('scope', 'openid profile email tenant fenergo.all fenx.documents.read fenx.journey.read');

    const postBody = bodyParams.toString();

    const options = {
      hostname: 'identity.fenxstable.com',
      port: 443,
      path: '/connect/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postBody),
        'Accept': 'application/json',
        'X-Tenant-Id': tenantId
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300 && parsed.access_token) {
            resolve({
              success: true,
              accessToken: parsed.access_token,
              tokenType: parsed.token_type || 'Bearer',
              expiresIn: parsed.expires_in || 3600,
              scope: parsed.scope
            });
          } else {
            reject(new Error(`OAuth failed: ${res.statusCode} - ${parsed.error || data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse OAuth response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postBody);
    req.end();
  });
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
        authenticate: '/api/mcp?action=authenticate',
        tools: '/api/mcp?action=tools',
        execute: '/api/mcp?action=execute'
      }
    });
  }

  // Authenticate endpoint (OAuth)
  if (req.url.startsWith('/api/mcp') && req.url.includes('action=authenticate') && req.method === 'POST') {
    try {
      const { username, password, tenantId } = req.body || {};

      if (!username || !password || !tenantId) {
        return res.status(400).json({ error: 'Missing required fields: username, password, tenantId' });
      }

      try {
        const authResult = await authenticateWithOAuth(username, password, tenantId);
        return res.status(200).json(authResult);
      } catch (oauthError) {
        // Fallback: use static token if OAuth fails
        const token = getToken();
        if (token) {
          return res.status(200).json({
            success: true,
            accessToken: token.replace('Bearer ', ''),
            tokenType: 'Bearer',
            expiresIn: 3600,
            scope: 'fallback',
            note: 'Using configured API token as fallback'
          });
        }
        throw oauthError;
      }
    } catch (error) {
      return res.status(401).json({ error: 'Authentication failed', message: error.message });
    }
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
