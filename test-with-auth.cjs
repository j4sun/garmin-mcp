#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

console.log('🔍 Testing Garmin MCP with Authentication...');
console.log('⚠️  This will require your Garmin Connect credentials');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Start the MCP server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let authenticated = false;
let requestQueue = [];

server.stdout.on('data', (data) => {
  const response = data.toString();
  console.log('📥 Server response:', response);
  
  try {
    const parsed = JSON.parse(response);
    if (parsed.result && parsed.result.content) {
      const content = parsed.result.content[0].text;
      console.log('📄 Response content:');
      console.log(content);
      
      if (content.includes('Successfully authenticated')) {
        authenticated = true;
        console.log('✅ Authentication successful! Now testing sleep data...');
        
        // Test sleep data
        const sleepTest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'get_health_metrics',
            arguments: {
              startDate: '2025-07-10',
              endDate: '2025-07-10',
              metrics: ['sleep']
            }
          }
        };
        
        server.stdin.write(JSON.stringify(sleepTest) + '\n');
      }
    }
  } catch (e) {
    console.log('Raw response (not JSON):', response);
  }
});

server.stderr.on('data', (data) => {
  console.log('🐛 Server stderr:', data.toString());
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Get credentials
rl.question('Garmin Connect Username: ', (username) => {
  rl.question('Garmin Connect Password: ', (password) => {
    console.log('🔐 Authenticating...');
    
    const authMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'authenticate_garmin',
        arguments: {
          username: username,
          password: password
        }
      }
    };
    
    server.stdin.write(JSON.stringify(authMessage) + '\n');
    
    // Clean up after 15 seconds
    setTimeout(() => {
      server.kill();
      rl.close();
      console.log('✅ Test completed');
      process.exit(0);
    }, 15000);
  });
});
