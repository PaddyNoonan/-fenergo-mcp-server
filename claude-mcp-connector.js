// Claude AI MCP Connector Proxy
// Proxies JSON-RPC 2.0 requests from Claude to AWS App Runner MCP server

import http from 'http';
import https from 'https';
import process from 'process';

const LOCAL_PORT = process.env.PORT || 8090;
const REMOTE_MCP_URL = process.env.REMOTE_MCP_URL || 'https://brruyqnwu2.eu-west-1.awsapprunner.com/mcp';

function proxyMcpRequest(jsonRpcBody, callback) {
  const url = new URL(REMOTE_MCP_URL);
  const isHttps = url.protocol === 'https:';
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': process.env.FENERGO_TENANT_ID || 'f488cdba-2122-448d-952c-7a2a47f78f1b',
  };
  if (process.env.FENERGO_API_TOKEN) {
    headers['Authorization'] = process.env.FENERGO_API_TOKEN;
  }
  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers
  };
  const reqModule = isHttps ? https : http;
  const req = reqModule.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      callback(null, res.statusCode, data);
    });
  });
  req.on('error', (err) => callback(err));
  req.write(JSON.stringify(jsonRpcBody));
  req.end();
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/mcp') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let json;
      try {
        json = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      proxyMcpRequest(json, (err, status, data) => {
        if (err) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        } else {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(data);
        }
      });
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(LOCAL_PORT, () => {
  console.error(`Claude MCP Connector proxy running on http://localhost:${LOCAL_PORT}`);
  console.error(`Proxying MCP requests to: ${REMOTE_MCP_URL}`);
});
