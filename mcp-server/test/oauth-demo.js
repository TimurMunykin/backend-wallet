import { spawn } from 'child_process';
import http from 'http';

console.log('🚀 OAuth MCP Server Demo');
console.log('========================');

// Test OAuth flow
async function testOAuthFlow() {
  console.log('\n📋 Testing OAuth MCP Server...');
  
  // Create a test client to communicate with MCP server
  const testClient = spawn('node', ['-e', `
    const { Client } = require('./dist/client-example.js');
    const client = new Client();
    
    // Connect to MCP server
    client.connect('stdio')
      .then(() => {
        console.log('✅ Connected to OAuth MCP Server');
        
        // Test list tools
        return client.listTools();
      })
      .then((tools) => {
        console.log('📋 Available tools:', tools.map(t => t.name));
        
        // Test call a tool
        return client.callTool('list-accounts', {});
      })
      .then((result) => {
        console.log('🔧 Tool result:', result);
        console.log('✅ OAuth MCP Server is working!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Error:', error.message);
        process.exit(1);
      });
  `], { 
    stdio: 'inherit',
    env: { 
      ...process.env,
      OAUTH_AUTHORIZATION_SERVER: 'http://localhost:3000'
    }
  });
  
  testClient.on('close', (code) => {
    if (code === 0) {
      console.log('✅ OAuth test completed successfully!');
    } else {
      console.error('❌ OAuth test failed');
    }
  });
}

// Run basic OAuth configuration test
async function testOAuthConfig() {
  console.log('\n⚙️  Testing OAuth Configuration...');
  
  // Test discovery endpoint
  
  const url = 'http://localhost:3000/.well-known/oauth-authorization-server';
  
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const metadata = JSON.parse(data);
          console.log('✅ Authorization Server Metadata found');
          console.log('  - Issuer:', metadata.issuer);
          console.log('  - Authorization endpoint:', metadata.authorization_endpoint);
          console.log('  - Token endpoint:', metadata.token_endpoint);
          console.log('  - Supported scopes:', metadata.scopes_supported.join(', '));
          resolve(metadata);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Request timeout')));
  });
}

// Main test runner
async function runTests() {
  try {
    await testOAuthConfig();
    console.log('\n🎉 OAuth Authorization Server is ready!');
    
    console.log('\n💡 Next steps:');
    console.log('1. Configure your MCP client with OAuth credentials');
    console.log('2. Register a client using POST /oauth/register');
    console.log('3. Obtain tokens using Client Credentials Flow');
    console.log('4. Use tokens in MCP server requests');
    
  } catch (error) {
    console.error('❌ OAuth test failed:', error.message);
    process.exit(1);
  }
}

runTests(); 