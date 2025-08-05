#!/usr/bin/env node

// Simple script to test authentication status and detect login page errors

require('dotenv').config();
const pkg = require('garmin-connect');
const { GarminConnect } = pkg;

async function testAuthStatus() {
  console.log('🔍 Testing Garmin Connect authentication status...');
  
  const username = process.env.GARMIN_USERNAME;
  const password = process.env.GARMIN_PASSWORD;
  
  if (!username || !password) {
    console.error('❌ GARMIN_USERNAME and GARMIN_PASSWORD must be set in .env file');
    return;
  }
  
  const client = new GarminConnect({ username, password });
  
  try {
    console.log('🔐 Attempting to login...');
    await client.login();
    console.log('✅ Login successful');
    
    console.log('📊 Testing API call to detect JSON parsing issues...');
    const userProfile = await client.getUserProfile();
    console.log('✅ API call successful - no JSON parsing errors');
    console.log('👤 User:', userProfile.displayName || userProfile.fullName || 'Unknown');
    
  } catch (error) {
    console.error('❌ Error detected:');
    console.error('Error message:', error.message);
    
    if (error.message.includes('login page') || 
        error.message.includes('Unexpected token') ||
        error.message.includes('not valid JSON')) {
      console.error('🚨 LOGIN PAGE ERROR DETECTED - Session has expired or authentication failed');
      console.error('💡 This is the error you\'re seeing in the MCP');
    } else {
      console.error('❓ Different error type:', error.message);
    }
  }
}

testAuthStatus().catch(console.error);
