#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('Testing Garmin MCP Server...');

// Start the MCP server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Test the tools/list endpoint
const testMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

server.stdin.write(JSON.stringify(testMessage) + '\n');

server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('Server stderr:', data.toString());
});

// Clean up after 3 seconds
setTimeout(() => {
  server.kill();
  console.log('Test completed');
  process.exit(0);
}, 3000);
