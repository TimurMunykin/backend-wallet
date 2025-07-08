#!/usr/bin/env node

/**
 * Example MCP client showing how to connect to the backend-wallet-mcp-server
 * This demonstrates the basic client-server interaction pattern
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');

class SimpleMcpClient extends EventEmitter {
  constructor(serverCommand) {
    super();
    this.serverProcess = null;
    this.serverCommand = serverCommand;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      // Spawn the MCP server
      this.serverProcess = spawn('node', [this.serverCommand]);
      
      // Handle server output
      this.serverProcess.stdout.on('data', (data) => {
        this.handleServerMessage(data.toString());
      });
      
      this.serverProcess.stderr.on('data', (data) => {
        console.error('Server stderr:', data.toString());
      });
      
      this.serverProcess.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
        this.emit('disconnected');
      });
      
      // Initialize the connection
      this.sendInitialize().then(resolve).catch(reject);
    });
  }

  async sendInitialize() {
    const response = await this.sendRequest({
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'simple-mcp-client',
          version: '1.0.0'
        }
      }
    });
    
    // Send initialized notification
    this.sendNotification({
      method: 'initialized',
      params: {}
    });
    
    return response;
  }

  sendRequest(request) {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const fullRequest = {
        jsonrpc: '2.0',
        id,
        ...request
      };
      
      this.pendingRequests.set(id, { resolve, reject });
      
      this.serverProcess.stdin.write(JSON.stringify(fullRequest) + '\n');
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 5000);
    });
  }

  sendNotification(notification) {
    const fullNotification = {
      jsonrpc: '2.0',
      ...notification
    };
    
    this.serverProcess.stdin.write(JSON.stringify(fullNotification) + '\n');
  }

  handleServerMessage(data) {
    const lines = data.trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const message = JSON.parse(line);
        
        if (message.id && this.pendingRequests.has(message.id)) {
          const { resolve, reject } = this.pendingRequests.get(message.id);
          this.pendingRequests.delete(message.id);
          
          if (message.error) {
            reject(new Error(message.error.message));
          } else {
            resolve(message.result);
          }
        }
      } catch (error) {
        console.error('Failed to parse server message:', error);
      }
    }
  }

  async listTools() {
    return this.sendRequest({
      method: 'tools/list',
      params: {}
    });
  }

  async callTool(name, args) {
    return this.sendRequest({
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    });
  }

  disconnect() {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }
}

// Example usage
async function runExample() {
  console.log('🔗 MCP Client Example');
  console.log('=====================');
  
  const client = new SimpleMcpClient('../dist/index.js');
  
  try {
    // Connect to server
    console.log('Connecting to MCP server...');
    await client.connect();
    console.log('✅ Connected successfully');
    
    // List available tools
    console.log('\n📋 Available tools:');
    const tools = await client.listTools();
    console.log(JSON.stringify(tools, null, 2));
    
    // Call each tool
    console.log('\n🔧 Calling tools:');
    
    // Get total balance
    console.log('\n💰 Getting total balance...');
    const balance = await client.callTool('getTotalBalance', { userId: 'demo-user' });
    console.log(balance);
    
    // Get user accounts
    console.log('\n🏦 Getting user accounts...');
    const accounts = await client.callTool('getUserAccounts', { userId: 'demo-user' });
    console.log(accounts);
    
    // Get recent transactions
    console.log('\n📊 Getting recent transactions...');
    const transactions = await client.callTool('getRecentTransactions', { 
      userId: 'demo-user', 
      limit: 5 
    });
    console.log(transactions);
    
    console.log('\n✅ All operations completed successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.disconnect();
  }
}

if (require.main === module) {
  runExample().catch(console.error);
} 