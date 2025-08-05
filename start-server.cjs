#!/usr/bin/env node

// Startup wrapper that ensures .env is loaded
require('dotenv').config();

// Debug environment loading
console.error(`📁 Environment variables loaded`);
console.error(`🔐 Username: ${process.env.GARMIN_USERNAME ? 'configured' : 'missing'}`);
console.error(`🔐 Password: ${process.env.GARMIN_PASSWORD ? 'configured' : 'missing'}`);
console.error(`🔐 Auto-auth: ${process.env.GARMIN_AUTO_AUTH || 'false'}`);

// Start the main server
const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

server.on('exit', (code) => {
  process.exit(code);
});
