// Decode and display current token details

const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IkMxQzc3MkQzRjMyOUU2Q0Q1OEMzQ0M0MUU4MTQzRTQ4ODkwRjNBREYiLCJ4NXQiOiJ3Y2R5MF9NcDVzMVl3OHhCNkJRLVNJa1BPdDgiLCJ0eXAiOiJhdCtqd3QifQ.eyJpc3MiOiJodHRwczovL2lkZW50aXR5LmZlbnhzdGFibGUuY29tIiwibmJmIjoxNzY0Mjc5Mjc4LCJpYXQiOjE3NjQyNzkyNzgsImV4cCI6MTc2NDI4Mjg3OCwiYXVkIjoiRmVuZXJnby5OZWJ1bGEuQXV0aG9yaXplciIsInNjb3BlIjpbIm9wZW5pZCIsInByb2ZpbGUiLCJmZW54LmFsbCJdLCJhbXIiOlsicHdkIl0sImNsaWVudF9pZCI6Im1jcC1jbGllbnQiLCJzdWIiOiIyNmFjN2IyOC1hOTEyLTQwOTgtYmE3Ny00YTk1NGU3NmJjMjEiLCJhdXRoX3RpbWUiOjE3NjQyNzcwODEsImlkcCI6ImxvY2FsIiwic2lkIjoiRjM2RDg2ODZBQUJDNDM0MUM0NUEyREJFRTkzMjJGNEQifQ.kutIf-aMAP7L2umzR3g1quoa6NYg5TncwmboErPqeXJfNMui1xgFiAdrVx8UKNSLfN_Ag5e9NZ4PcG0cfKqYVldML7n0yVqlvPri3y3hTii4lddIy_41d708cpXZlikhM3C03hnKEO0Tdd0mavv9TmYUQ2ZMDKA9mIefO21TAhsCFiEftVNyvZ0kx0haPatk1yuuA6wyW2PCnYYUeB4sUUsI3dRN1NwLGz0WEWNwwUwiNcY6eWhXhEBCqqnULLunlG6FWWPykPd4rHDTjBV_2TwAmJeibhn5aG7oAHZZYyyLYBrcP6bBsORNzNZw8TMjNrzRsXzT9_AHTFsGWpb5QA";

console.log('🔍 BEARER TOKEN ANALYSIS\n');
console.log('='.repeat(70));

// Decode header
const [headerB64, payloadB64, signature] = token.split('.');
const header = JSON.parse(Buffer.from(headerB64, 'base64').toString());
const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

console.log('\n📋 TOKEN HEADER:\n');
console.log(JSON.stringify(header, null, 2));

console.log('\n📋 TOKEN PAYLOAD:\n');
console.log(JSON.stringify(payload, null, 2));

console.log('\n📊 KEY CLAIMS:\n');
console.log(`Issuer:         ${payload.iss}`);
console.log(`Client ID:      ${payload.client_id} ⚠️  This is the problem!`);
console.log(`Subject (User): ${payload.sub}`);
console.log(`Audience:       ${payload.aud}`);
console.log(`Scopes:         ${payload.scope.join(', ')}`);
console.log(`Auth Method:    ${payload.amr.join(', ')}`);
console.log(`IDP:            ${payload.idp}`);

console.log('\n⏰ TIMING:\n');
const issuedAt = new Date(payload.iat * 1000);
const notBefore = new Date(payload.nbf * 1000);
const expires = new Date(payload.exp * 1000);
const now = new Date();

console.log(`Issued At:      ${issuedAt.toISOString()}`);
console.log(`Not Before:     ${notBefore.toISOString()}`);
console.log(`Expires:        ${expires.toISOString()}`);
console.log(`Current Time:   ${now.toISOString()}`);
console.log(`Valid:          ${expires > now ? '✅ Yes' : '❌ Expired'}`);
console.log(`Time Remaining: ${Math.floor((expires - now) / 60000)} minutes`);

console.log('\n' + '='.repeat(70));
console.log('\n❌ THE PROBLEM:\n');
console.log(`The token has client_id: "mcp-client"`);
console.log(`The DocumentManagement API blocks "mcp-client" from accessing /insights`);
console.log('');
console.log('Even though:');
console.log('  ✓ You have the right USER permissions');
console.log('  ✓ You have the right SCOPES (fenx.all)');
console.log('  ✓ The token is valid and not expired');
console.log('  ✓ API Gateway authorizer allows it through');
console.log('');
console.log('The APPLICATION-LEVEL authorization check rejects the CLIENT itself.');

console.log('\n💡 SOLUTIONS:\n');
console.log('1. Add mcp-client to the allowed clients list in the controller/filter');
console.log('2. Use a different OAuth client that is already authorized');
console.log('   (e.g., quasar-sandbox, if it has permission)');
console.log('3. Wait for infrastructure team to grant mcp-client permission');

console.log('\n' + '='.repeat(70));
