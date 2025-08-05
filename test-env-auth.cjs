#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🧪 Testing Environment Variable Authentication...');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('❌ No .env file found. Please create one using:');
  console.log('   cp .env.example .env');
  console.log('   # Then edit .env with your credentials');
  process.exit(1);
}

// Read .env file to check configuration
const envContent = fs.readFileSync('.env', 'utf8');
const hasUsername = envContent.includes('GARMIN_USERNAME=') && !envContent.includes('GARMIN_USERNAME=your.email@example.com');
const hasPassword = envContent.includes('GARMIN_PASSWORD=') && !envContent.includes('GARMIN_PASSWORD=your_password_here');
const hasAutoAuth = envContent.includes('GARMIN_AUTO_AUTH=true');

console.log('📁 Environment file status:');
console.log(`   Username configured: ${hasUsername ? '✅' : '❌'}`);
console.log(`   Password configured: ${hasPassword ? '✅' : '❌'}`);
console.log(`   Auto-auth enabled: ${hasAutoAuth ? '✅' : '❌'}`);

if (!hasUsername || !hasPassword) {
  console.log('\n⚠️  Please configure your credentials in .env file');
  process.exit(1);
}

console.log('\n🚀 Starting MCP server to test auto-authentication...');

// Start the MCP server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let authSuccess = false;

server.stderr.on('data', (data) => {
  const output = data.toString();
  console.log('📜 Server log:', output.trim());
  
  if (output.includes('Auto-authenticated with Garmin Connect')) {
    authSuccess = true;
    console.log('✅ Auto-authentication successful!');
  } else if (output.includes('Auto-authentication failed')) {
    console.log('❌ Auto-authentication failed - check your credentials');
  }
});

server.stdout.on('data', (data) => {
  console.log('📤 Server output:', data.toString().trim());
});

// Test authentication without credentials (should use env vars)
setTimeout(() => {
  console.log('\n🔐 Testing authentication tool without credentials...');
  const authTest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'authenticate_garmin',
      arguments: {}
    }
  };
  
  server.stdin.write(JSON.stringify(authTest) + '\n');
}, 3000);

// Clean up after 10 seconds
setTimeout(() => {
  server.kill();
  console.log('\n📊 Test Results:');
  console.log(`   Auto-authentication: ${authSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('\n✅ Environment variable test completed');
  process.exit(0);
}, 10000);
