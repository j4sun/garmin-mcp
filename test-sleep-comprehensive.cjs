#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🔍 Comprehensive Sleep Data Test...');
console.log('This test will check multiple dates and show detailed error messages');

// Start the MCP server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let messageId = 1;

// Function to send a test message
function sendMessage(name, args, description) {
  const message = {
    jsonrpc: '2.0',
    id: messageId++,
    method: 'tools/call',
    params: {
      name: name,
      arguments: args
    }
  };
  
  console.log(`\n📤 ${description}`);
  console.log('Request:', JSON.stringify(message, null, 2));
  server.stdin.write(JSON.stringify(message) + '\n');
}

// Listen for responses
server.stdout.on('data', (data) => {
  const response = data.toString();
  console.log('\n📥 Raw response:', response);
  
  try {
    const parsed = JSON.parse(response);
    if (parsed.result && parsed.result.content) {
      const content = parsed.result.content[0].text;
      console.log('📄 Formatted response:');
      console.log(content);
    } else if (parsed.error) {
      console.log('❌ Error response:', parsed.error);
    }
  } catch (e) {
    console.log('Raw text (not JSON):', response);
  }
});

server.stderr.on('data', (data) => {
  console.log('🐛 Server debug:', data.toString());
});

// Test sequence
setTimeout(() => {
  console.log('\n=== Starting Test Sequence ===');
  
  // Test 1: List tools to verify server is working
  sendMessage('', {}, 'Testing if server responds to tools list');
  setTimeout(() => {
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: messageId++,
      method: 'tools/list'
    }) + '\n');
  }, 500);
  
  // Test 2: Try health metrics without authentication
  setTimeout(() => {
    sendMessage('get_health_metrics', {
      startDate: '2025-07-05',
      endDate: '2025-07-05',
      metrics: ['sleep']
    }, 'Testing sleep data without authentication');
  }, 1500);
  
  // Test 3: Try different date
  setTimeout(() => {
    sendMessage('get_health_metrics', {
      startDate: '2025-07-01',
      endDate: '2025-07-01',
      metrics: ['sleep']
    }, 'Testing sleep data for July 1st');
  }, 2500);
  
  // Test 4: Try all metrics
  setTimeout(() => {
    sendMessage('get_health_metrics', {
      startDate: '2025-07-05',
      endDate: '2025-07-05'
    }, 'Testing all health metrics');
  }, 3500);
  
}, 1000);

// Clean up after 10 seconds
setTimeout(() => {
  server.kill();
  console.log('\n✅ Comprehensive test completed');
  process.exit(0);
}, 10000);
