#!/usr/bin/env node

// Simple test script to check if the MCP server starts without errors
const { exec } = require('child_process');

console.log('Testing Garmin MCP Server...');

// Test basic startup
const child = exec('node dist/index.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error}`);
    return;
  }
  
  console.log(`stdout: ${stdout}`);
  console.log(`stderr: ${stderr}`);
});

// Send a simple message to test the server
setTimeout(() => {
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  }) + '\n');
}, 100);

setTimeout(() => {
  child.kill();
  console.log('Test completed');
}, 2000);
