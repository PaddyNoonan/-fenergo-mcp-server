import https from 'https';

console.log('📋 FENERGO JOURNEY DOCUMENTS API INFORMATION\n');
console.log('='.repeat(70));

console.log('\n🎯 API ENDPOINT DETAILS:\n');
console.log('Endpoint:    POST /documentmanagementquery/api/documentmanagement/insights');
console.log('Base URL:    https://api.fenxstable.com');
console.log('Full URL:    https://api.fenxstable.com/documentmanagementquery/api/documentmanagement/insights');
console.log('\nPurpose:     Conversational AI endpoint for document insights');
console.log('             Provides natural language responses about documents,');
console.log('             requirements, and journey status.');

console.log('\n📥 CORRECT REQUEST STRUCTURE:\n');
console.log('Method:      POST');
console.log('Content-Type: application/json');
console.log('\nRequired Headers:');
console.log('  - Authorization: Bearer <SSO_ACCESS_TOKEN>');
console.log('  - Content-Type: application/json');
console.log('  - X-Tenant-ID: <TENANT_ID>');

console.log('\nRequest Body (Conversational AI Format):');
console.log('  {');
console.log('    "data": {');
console.log('      "message": "What documents are needed?",  // Natural language query');
console.log('      "scope": {');
console.log('        "documentContext": {');
console.log('          "contextLevel": "Journey",');
console.log('          "contextId": "<JOURNEY_GUID>"');
console.log('        },');
console.log('        "documentRequirementContext": null');
console.log('      },');
console.log('      "conversationHistory": []  // Previous messages in conversation');
console.log('    }');
console.log('  }');

console.log('\n📤 EXPECTED RESPONSE:\n');
console.log('Success (200 OK):');
console.log('  {');
console.log('    "data": {');
console.log('      "response": "Natural language response about documents",');
console.log('      "metadata": { ... }');
console.log('    }');
console.log('  }');
console.log('\nError Responses:');
console.log('  - 401: Token invalid or expired');
console.log('  - 403: Client not authorized (current issue)');
console.log('  - 404: Journey or entity not found');

console.log('\n' + '='.repeat(70));
console.log('\n🧪 TESTING WITH ACTUAL JOURNEY DATA\n');

// Fresh token from SSO authentication
const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IkMxQzc3MkQzRjMyOUU2Q0Q1OEMzQ0M0MUU4MTQzRTQ4ODkwRjNBREYiLCJ4NXQiOiJ3Y2R5MF9NcDVzMVl3OHhCNkJRLVNJa1BPdDgiLCJ0eXAiOiJhdCtqd3QifQ.eyJpc3MiOiJodHRwczovL2lkZW50aXR5LmZlbnhzdGFibGUuY29tIiwibmJmIjoxNzY0MzE4NDIxLCJpYXQiOjE3NjQzMTg0MjEsImV4cCI6MTc2NDMyMjAyMSwiYXVkIjoiRmVuZXJnby5OZWJ1bGEuQXV0aG9yaXplciIsInNjb3BlIjpbIm9wZW5pZCIsInByb2ZpbGUiLCJmZW54LmFsbCJdLCJhbXIiOlsicHdkIl0sImNsaWVudF9pZCI6Im1jcC1jbGllbnQiLCJzdWIiOiIyNmFjN2IyOC1hOTEyLTQwOTgtYmE3Ny00YTk1NGU3NmJjMjEiLCJhdXRoX3RpbWUiOjE3NjQzMTg0MjAsImlkcCI6ImxvY2FsIiwic2lkIjoiREQxQkY0MzA4M0QwQTI5NDEyNjI1RkUwOEY1MzU1QTgifQ.cTHafcQ9SfxLP9AE2vchr_flmz7ZYUkeadZkDmYfubjKJ6F1olT21GUVTlPlbcTJBGGRb9nnj572uy19YAz_J5WbxjjjyKBtAHE2QHNWs8xjBlJthHS1iBdOoNK1CBBe9eJumhVk_Tn3qzhiWXGjdAYDCLztR5CRJjc_nCzaComXkFa-sy9077VRwlPUv4_9WFSNeNIAxwgzDVWQJ3ehq0I_aKY678wdg1Cos2aYiSz2iuTMhX2q4gaMo1UJMCBPRgY4L5QoBOuBqKZHcJKr5tfuHT5Lq09OJqGgwm_chLfnR2Vs-D1Rn8mIsWrbTmT6cX70WVmYmPgBFXf-ifC_Iw";

// Check token validity
const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
const expiresAt = new Date(payload.exp * 1000);
const now = new Date();

console.log('Token Status:');
console.log('  Client ID:', payload.client_id);
console.log('  Scopes:', payload.scope.join(', '));
console.log('  Expires:', expiresAt.toISOString());
console.log('  Status:', expiresAt > now ? '✅ Valid' : '❌ Expired');
console.log('');

if (expiresAt <= now) {
  console.log('❌ Token expired. Please authenticate again.');
  process.exit(1);
}

// Test parameters
const TENANT_ID = "f488cdba-2122-448d-952c-7a2a47f78f1b";
const JOURNEY_ID = "5a5caba1-623f-45c5-8e02-592fb6c4dc61";

console.log('Request Details:');
console.log('  Journey ID:', JOURNEY_ID);
console.log('  Tenant ID:', TENANT_ID);
console.log('  Query:', 'What documents are required for this journey?');
console.log('');

// CORRECT FORMAT: Conversational AI structure
const requestBody = {
  data: {
    message: "What documents are required for this journey?",
    scope: {
      documentContext: {
        contextLevel: "Journey",
        contextId: JOURNEY_ID
      },
      documentRequirementContext: null
    },
    conversationHistory: []
  }
};

const body = JSON.stringify(requestBody);

console.log('📤 Request Body:');
console.log(JSON.stringify(requestBody, null, 2));
console.log('');

const options = {
  hostname: 'api.fenxstable.com',
  port: 443,
  path: '/documentmanagementquery/api/documentmanagement/insights',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'X-Tenant-ID': TENANT_ID
  }
};

console.log('📤 Making API Request...\n');

const req = https.request(options, (res) => {
  console.log('='.repeat(70));
  console.log(`\n📥 RESPONSE STATUS: ${res.statusCode}\n`);

  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS! AI insights retrieved.\n');
      try {
        const response = JSON.parse(data);
        console.log('Response:');
        console.log(JSON.stringify(response, null, 2));

        if (response.data?.response) {
          console.log('\n💬 AI Response:');
          console.log(response.data.response);
        }
      } catch (e) {
        console.log('Response:', data);
      }
    } else if (res.statusCode === 403) {
      console.log('❌ 403 FORBIDDEN - Client Not Authorized\n');
      try {
        const error = JSON.parse(data);
        console.log('Error Response:');
        console.log(JSON.stringify(error, null, 2));
      } catch (e) {
        console.log('Error Response:', data);
      }

      console.log('\n' + '='.repeat(70));
      console.log('\n🔍 AUTHORIZATION ISSUE ANALYSIS:\n');
      console.log('Even with CORRECT request format, Lambda authorizer blocks access.');
      console.log('');
      console.log('Token Details:');
      console.log('  ✓ Client ID: mcp-client');
      console.log('  ✓ Audience: Fenergo.Nebula.Authorizer');
      console.log('  ✓ Scope: fenx.all (should grant all access)');
      console.log('  ✓ In TenantValidationWhitelist: YES');
      console.log('  ✓ Request Format: CORRECT (conversational AI format)');
      console.log('');
      console.log('🔧 NEXT STEPS:\n');
      console.log('Check CloudWatch logs:');
      console.log('  Log Group: /aws/lambda/Fenergo-Nebula-Identity-RequestAuthorizer');
      console.log('  Find: Authorization decision logic for mcp-client');
      console.log('  Look for: Endpoint-specific permission checks');
    } else {
      console.log(`❌ UNEXPECTED STATUS: ${res.statusCode}\n`);
      try {
        const error = JSON.parse(data);
        console.log('Response:');
        console.log(JSON.stringify(error, null, 2));
      } catch (e) {
        console.log('Response:', data);
      }
    }

    console.log('\n' + '='.repeat(70));
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error);
});

req.write(body);
req.end();
