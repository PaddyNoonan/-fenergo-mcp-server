// Fix Authorization for mcp-client in DynamoDB
// This script investigates and fixes the authorization issue

console.log('🔧 AUTHORIZATION FIX TOOL\n');
console.log('='.repeat(70));

console.log('\n📊 CURRENT SITUATION:\n');
console.log('Problem:  mcp-client blocked from /documentmanagement/insights');
console.log('Location: DynamoDB table: authorization-stable-9fdbcfc');
console.log('Cause:    Missing permission record in DynamoDB');
console.log('');

console.log('Authorization Flow:');
console.log('  1. API Gateway Lambda → ✅ ALLOWS (TenantValidationWhitelist)');
console.log('  2. App Lambda (authorization-evaluatePermission) → ❌ DENIES');
console.log('     - Checks: DynamoDB authorization-stable-9fdbcfc');
console.log('     - Caches: ElastiCache (900 sec TTL)');
console.log('     - Result: No permission record found for mcp-client');

console.log('\n' + '='.repeat(70));
console.log('\n🔍 WHAT TO DO IN AWS CONSOLE:\n');

console.log('Step 1: EXAMINE EXISTING RECORDS');
console.log('-------');
console.log('In DynamoDB Console (authorization-stable-9fdbcfc):');
console.log('');
console.log('A. Look for endpoint permission records:');
console.log('   - Scan the table');
console.log('   - Filter by PK or SK containing "insights" or "documentmanagement"');
console.log('   - Or search for "endpoint" in any field');
console.log('');
console.log('B. Look for client permission records:');
console.log('   - Search for other client IDs (e.g., "quasar-sandbox")');
console.log('   - Note the record structure (PK, SK, attributes)');
console.log('');
console.log('C. Common DynamoDB patterns for authorization:');
console.log('   - Option 1: PK=CLIENT#{clientId}, SK=ENDPOINT#{path}');
console.log('   - Option 2: PK=ENDPOINT#{path}, SK=CLIENT#{clientId}');
console.log('   - Option 3: PK=TENANT#{tenantId}, SK=CLIENT#{clientId}#ENDPOINT#{path}');
console.log('   - Option 4: PK=PERMISSION#{id}, attributes contain client/endpoint');

console.log('\n\nStep 2: CREATE PERMISSION RECORD');
console.log('-------');
console.log('Once you understand the structure, create a new item:');
console.log('');
console.log('Example structures based on common patterns:');
console.log('');
console.log('Pattern A - Client-based PK:');
console.log(JSON.stringify({
  PK: 'CLIENT#mcp-client',
  SK: 'ENDPOINT#/documentmanagement/insights',
  allowed: true,
  methods: ['POST'],
  scopes: ['fenx.all'],
  created: new Date().toISOString()
}, null, 2));
console.log('');
console.log('Pattern B - Endpoint-based PK:');
console.log(JSON.stringify({
  PK: 'ENDPOINT#/documentmanagement/insights',
  SK: 'CLIENT#mcp-client',
  allowed: true,
  methods: ['POST'],
  scopes: ['fenx.all'],
  created: new Date().toISOString()
}, null, 2));
console.log('');
console.log('Pattern C - Permission entity:');
console.log(JSON.stringify({
  PK: 'PERMISSION#' + Math.random().toString(36).substring(7),
  SK: 'PERMISSION',
  clientId: 'mcp-client',
  endpoint: '/documentmanagement/insights',
  method: 'POST',
  allowed: true,
  scopes: ['fenx.all'],
  created: new Date().toISOString()
}, null, 2));

console.log('\n\nStep 3: CLEAR CACHE (IMPORTANT!)');
console.log('-------');
console.log('The authorization Lambda caches results in ElastiCache for 900 seconds.');
console.log('After adding the DynamoDB record, you must either:');
console.log('');
console.log('Option A: Wait 15 minutes for cache to expire');
console.log('Option B: Flush the ElastiCache cache (if you have access)');
console.log('Option C: Restart/redeploy the authorization Lambda');

console.log('\n' + '='.repeat(70));
console.log('\n💡 ALTERNATIVE APPROACHES:\n');

console.log('If DynamoDB approach is complex, consider:');
console.log('');
console.log('1. Check if there\'s an API to add client permissions');
console.log('   - Look for admin endpoints in the API Gateway');
console.log('   - Check DocumentManagement service for permission APIs');
console.log('');
console.log('2. Check Lambda environment variables');
console.log('   - authorization-evaluatePermission-lambda-stable-8d4fbe4');
console.log('   - Look for CLIENT_WHITELIST or ENDPOINT_PERMISSIONS vars');
console.log('');
console.log('3. Check if mcp-client needs additional OAuth scopes');
console.log('   - Current: openid, profile, fenx.all');
console.log('   - Might need: fenx.documents.read, fenx.insights.access');

console.log('\n' + '='.repeat(70));
console.log('\n📋 INFORMATION FOR FENERGO SUPPORT:\n');

console.log('If you need to contact Fenergo support, provide:');
console.log('');
console.log('Client Details:');
console.log('  - Client ID: mcp-client');
console.log('  - Audience: Fenergo.Nebula.Authorizer');
console.log('  - Scopes: openid, profile, fenx.all');
console.log('  - Tenant: f488cdba-2122-448d-952c-7a2a47f78f1b');
console.log('');
console.log('Endpoint:');
console.log('  - POST /documentmanagementquery/api/documentmanagement/insights');
console.log('');
console.log('Error:');
console.log('  - HTTP 403: Client not authorized to access this endpoint');
console.log('  - API Gateway Lambda: ALLOWS request');
console.log('  - App Lambda (authorization-evaluatePermission): DENIES request');
console.log('  - Root cause: Missing permission in DynamoDB authorization-stable-9fdbcfc');
console.log('');
console.log('Request:');
console.log('  - mcp-client needs permission to access insights endpoint');
console.log('  - Token authentication works correctly');
console.log('  - Only missing application-level authorization record');

console.log('\n' + '='.repeat(70));
console.log('\n🎯 QUICK REFERENCE:\n');
console.log('DynamoDB Table: authorization-stable-9fdbcfc');
console.log('Region:         eu-west-1');
console.log('Items:          148,423');
console.log('Size:           40.2 MB');
console.log('');
console.log('Lambda:         authorization-evaluatePermission-lambda-stable-8d4fbe4');
console.log('Cache:          ElastiCache (900 sec TTL)');
console.log('');
console.log('Client:         mcp-client');
console.log('Endpoint:       /documentmanagement/insights');
console.log('Method:         POST');
console.log('Tenant:         f488cdba-2122-448d-952c-7a2a47f78f1b');
console.log('Journey:        5a5caba1-623f-45c5-8e02-592fb6c4dc61');

console.log('\n' + '='.repeat(70));
