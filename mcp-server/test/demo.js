#!/usr/bin/env node

/**
 * Demo script to test MCP server tools
 * This script shows how to interact with the MCP server
 */

import { spawn } from 'child_process';
import path from 'path';

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

// Test tools list
async function testToolsList() {
  console.log('📋 List Tools:');
  try {
    const response = await sendRequest('tools/list');
    console.log(`Response: ${response}`);
    console.log('\n---\n');
  } catch (error) {
    console.error('Tools list failed:', error);
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
    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // List tools first to see all available capabilities
    await testToolsList();
    
    console.log('✅ Demo completed successfully!');
    
  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    server.kill();
  }
}

runDemo(); 