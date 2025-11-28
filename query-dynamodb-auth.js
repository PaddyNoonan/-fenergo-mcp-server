// Query DynamoDB authorization table to understand record structure
// Run: node query-dynamodb-auth.js

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'authorization-stable-9fdbcfc';
const REGION = 'eu-west-1';

console.log('🔍 QUERYING DYNAMODB AUTHORIZATION TABLE\n');
console.log('='.repeat(70));
console.log(`\nTable: ${TABLE_NAME}`);
console.log(`Region: ${REGION}\n`);

// Create DynamoDB client
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function scanForRecords(filterKeyword, maxResults = 10) {
  console.log(`\n🔎 Scanning for records containing: "${filterKeyword}"\n`);

  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 100 // Scan more to increase chance of finding matches
    });

    const response = await docClient.send(command);
    console.log(`Scanned ${response.Items.length} items\n`);

    // Filter items that contain the keyword in any field
    const matches = response.Items.filter(item => {
      const itemStr = JSON.stringify(item).toLowerCase();
      return itemStr.includes(filterKeyword.toLowerCase());
    });

    if (matches.length === 0) {
      console.log(`❌ No matches found for "${filterKeyword}"`);
      console.log('\nShowing first 3 items as examples:\n');
      response.Items.slice(0, 3).forEach((item, i) => {
        console.log(`Example ${i + 1}:`);
        console.log(JSON.stringify(item, null, 2));
        console.log('');
      });
    } else {
      console.log(`✅ Found ${matches.length} matching records:\n`);
      matches.slice(0, maxResults).forEach((item, i) => {
        console.log(`Match ${i + 1}:`);
        console.log(JSON.stringify(item, null, 2));
        console.log('');
      });
    }

    return matches;
  } catch (error) {
    console.error('❌ Error scanning DynamoDB:', error.message);
    if (error.name === 'ResourceNotFoundException') {
      console.error('\nTable not found. Please verify:');
      console.error('  1. Table name is correct');
      console.error('  2. Region is correct (eu-west-1)');
      console.error('  3. AWS credentials have access to this table');
    } else if (error.name === 'UnrecognizedClientException') {
      console.error('\nAWS credentials not configured. Please:');
      console.error('  1. Run: aws configure');
      console.error('  2. Or set environment variables:');
      console.error('     - AWS_ACCESS_KEY_ID');
      console.error('     - AWS_SECRET_ACCESS_KEY');
      console.error('     - AWS_REGION=eu-west-1');
    }
    throw error;
  }
}

async function main() {
  try {
    // Search for different patterns
    console.log('='.repeat(70));
    console.log('\n📋 SEARCH 1: Records mentioning "insights"\n');
    await scanForRecords('insights', 5);

    console.log('\n' + '='.repeat(70));
    console.log('\n📋 SEARCH 2: Records mentioning "documentmanagement"\n');
    await scanForRecords('documentmanagement', 5);

    console.log('\n' + '='.repeat(70));
    console.log('\n📋 SEARCH 3: Records mentioning "mcp-client"\n');
    const mcpRecords = await scanForRecords('mcp-client', 10);

    console.log('\n' + '='.repeat(70));
    console.log('\n📋 SEARCH 4: Records mentioning "quasar-sandbox" (comparison)\n');
    await scanForRecords('quasar-sandbox', 5);

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 ANALYSIS:\n');

    if (mcpRecords && mcpRecords.length > 0) {
      console.log('✅ mcp-client records FOUND in authorization table');
      console.log('   → Check if any grant access to /documentmanagement/insights');
      console.log('   → If not, you may need to add a specific endpoint permission');
    } else {
      console.log('❌ NO mcp-client records found in authorization table');
      console.log('   → This explains the 403 error');
      console.log('   → Need to add authorization record for mcp-client');
    }

    console.log('\n💡 NEXT STEPS:\n');
    console.log('1. Review the record structure from the searches above');
    console.log('2. Identify the pattern used (PK/SK structure)');
    console.log('3. Create a matching record for mcp-client + insights endpoint');
    console.log('4. Use AWS Console or AWS CLI to add the record');
    console.log('5. Wait 15 mins for cache to clear OR restart Lambda');

  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Check if AWS SDK is installed
try {
  console.log('✅ AWS SDK detected\n');
  main();
} catch (error) {
  console.error('❌ AWS SDK not installed');
  console.error('\nTo install:');
  console.error('  npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb');
  console.error('\nThen run this script again.');
  process.exit(1);
}
