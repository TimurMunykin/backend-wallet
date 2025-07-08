#!/usr/bin/env node

/**
 * Demo script to test MCP server tools
 * This script shows how to interact with the MCP server
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 MCP Server Demo');
console.log('==================\n');

// Start the MCP server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let requestId = 1;

// Helper function to send JSON-RPC request
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params
  };
  
  console.log(`Request: ${JSON.stringify(request, null, 2)}`);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 5000);
    
    const onData = (data) => {
      clearTimeout(timeout);
      server.stdout.removeListener('data', onData);
      resolve(data.toString());
    };
    
    server.stdout.on('data', onData);
    server.stdin.write(JSON.stringify(request) + '\n');
  });
}

// Test ping tool
async function testPing() {
  console.log('🏓 Test Ping:');
  try {
    const response = await sendRequest('tools/call', {
      name: 'ping',
      arguments: {}
    });
    console.log(`Response: ${response}`);
    console.log('\n---\n');
  } catch (error) {
    console.error('Ping test failed:', error);
  }
}

// Handle server output
server.stdout.on('data', (data) => {
  console.log(`Response: ${data.toString()}`);
});

server.stderr.on('data', (data) => {
  console.error(`Server error: ${data.toString()}`);
});

async function runDemo() {
  try {
    // Test ping first
    await testPing();
    
    // List tools
    console.log('📋 List Tools:');
    await sendRequest('tools/list');
    console.log('\n---\n');
    
    // Test getTotalBalance
    console.log('📋 Get Total Balance:');
    await sendRequest('tools/call', {
      name: 'getTotalBalance',
      arguments: {
        userId: 'demo-user'
      }
    });
    console.log('\n---\n');
    
    // Test getUserAccounts
    console.log('📋 Get User Accounts:');
    await sendRequest('tools/call', {
      name: 'getUserAccounts',
      arguments: {
        userId: 'demo-user'
      }
    });
    console.log('\n---\n');
    
    // Test getRecentTransactions
    console.log('📋 Get Recent Transactions:');
    await sendRequest('tools/call', {
      name: 'getRecentTransactions',
      arguments: {
        userId: 'demo-user',
        limit: 5
      }
    });
    console.log('\n---\n');
    
  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    server.kill();
  }
}

runDemo(); 