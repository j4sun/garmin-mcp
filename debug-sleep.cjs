#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🔍 Debugging Garmin Sleep Data...');

// Start the MCP server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Test sleep data specifically
const testMessage = {
  jsonrpc: '2.0',
  id: 1,
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

console.log('📤 Sending request:', JSON.stringify(testMessage, null, 2));

server.stdin.write(JSON.stringify(testMessage) + '\n');

server.stdout.on('data', (data) => {
  const response = data.toString();
  console.log('📥 Server response:', response);
  
  try {
    const parsed = JSON.parse(response);
    if (parsed.result && parsed.result.content) {
      const content = parsed.result.content[0].text;
      console.log('✨ Sleep data result:');
      console.log(content);
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

// Clean up after 5 seconds
setTimeout(() => {
  server.kill();
  console.log('✅ Debug test completed');
  process.exit(0);
}, 5000);
