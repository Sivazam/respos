/**
 * Manual index deployment script
 * This script creates the required Firestore indexes using the REST API
 */

const fs = require('fs');
const https = require('https');

// Project configuration
const PROJECT_ID = 'restpossys';
const INDEXES_FILE = './firestore.indexes.json';

// Read indexes from file
function readIndexes() {
  try {
    const data = fs.readFileSync(INDEXES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading indexes file:', error);
    return null;
  }
}

// Make HTTP request to Firestore REST API
function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIREBASE_TOKEN || 'YOUR_TOKEN_HERE'}`
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || responseData}`));
          }
        } catch (e) {
          reject(new Error(`Invalid response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Create indexes
async function createIndexes() {
  const indexesConfig = readIndexes();
  if (!indexesConfig) {
    console.error('Failed to read indexes configuration');
    return;
  }

  console.log('Creating Firestore indexes for project:', PROJECT_ID);
  console.log('Indexes to create:', indexesConfig.indexes.length);

  for (const index of indexesConfig.indexes) {
    try {
      console.log(`Creating index for ${index.collectionGroup}...`);
      
      const indexData = {
        name: `projects/${PROJECT_ID}/databases/(default)/collectionGroups/${index.collectionGroup}/indexes/-`,
        queryScope: index.queryScope,
        fields: index.fields
      };

      const result = await makeRequest('/databases/(default)/indexes', 'POST', indexData);
      console.log(`✅ Index created successfully for ${index.collectionGroup}`);
      console.log(`   Index name: ${result.name}`);
      
      // Wait a bit between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed to create index for ${index.collectionGroup}:`, error.message);
    }
  }
}

// List existing indexes
async function listIndexes() {
  try {
    console.log('Listing existing indexes...');
    const result = await makeRequest('/databases/(default)/indexes', 'GET');
    console.log('Existing indexes:');
    result.indexes?.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}`);
      console.log(`   Collection: ${index.collectionGroup}`);
      console.log(`   Fields: ${index.fields?.map(f => `${f.fieldPath} (${f.order})`).join(', ')}`);
      console.log(`   State: ${index.state}`);
      console.log('');
    });
  } catch (error) {
    console.error('Failed to list indexes:', error.message);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'list':
      await listIndexes();
      break;
    case 'create':
      await createIndexes();
      break;
    default:
      console.log('Usage:');
      console.log('  node deploy-indexes-manual.js list    - List existing indexes');
      console.log('  node deploy-indexes-manual.js create  - Create all indexes');
      console.log('');
      console.log('Note: You need to set FIREBASE_TOKEN environment variable');
      console.log('      or manually edit the script with your token.');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createIndexes, listIndexes };