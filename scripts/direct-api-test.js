#!/usr/bin/env node

// Direct API Test Script
// Run this to test the /api/auth/signup endpoint directly

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test signup with the exact payload structure from successful test
async function testDirectSignup() {
  console.log('\n🧪 Testing Direct Signup with Correct Payload...');
  
  // This is the exact payload structure that worked in our successful test
  const testData = {
    email: 'direct_test_' + Date.now() + '@example.com',
    password: 'Test123!@#',
    fullName: 'Direct Test User',
    role: 'provider',
    serviceType: 'Plumber',
    address: '123 Test Street'
  };

  console.log('📝 Sending signup data:', JSON.stringify(testData, null, 2));

  try {
    const result = await makeRequest('POST', '/api/auth/signup', testData);
    console.log(`\n📊 Response Status: ${result.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(result.data, null, 2));
    return result.status === 201 && result.data.success;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Test owner signup
async function testOwnerSignup() {
  console.log('\n🧪 Testing Owner Signup...');
  
  const testData = {
    email: 'owner_test_' + Date.now() + '@example.com',
    password: 'Test123!@#',
    fullName: 'Owner Test User',
    role: 'owner',
    address: '456 Owner Street'
  };

  console.log('📝 Sending signup data:', JSON.stringify(testData, null, 2));

  try {
    const result = await makeRequest('POST', '/api/auth/signup', testData);
    console.log(`\n📊 Response Status: ${result.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(result.data, null, 2));
    return result.status === 201 && result.data.success;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Main
(async () => {
  console.log('='.repeat(70));
  console.log('🚀 Direct API Signup Test');
  console.log('='.repeat(70));
  
  // Check if server is running
  try {
    const health = await makeRequest('GET', '/health');
    if (health.status !== 200) {
      console.error('❌ Server is not running properly!');
      process.exit(1);
    }
    console.log('✅ Server is running');
  } catch (error) {
    console.error('❌ Server is not running!');
    console.error('   Please start the server with: npm start');
    process.exit(1);
  }

  // Run the tests
  const providerSuccess = await testDirectSignup();
  const ownerSuccess = await testOwnerSignup();
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Results:');
  console.log(`✅ Provider Signup: ${providerSuccess ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Owner Signup: ${ownerSuccess ? 'PASSED' : 'FAILED'}`);
  
  if (providerSuccess && ownerSuccess) {
    console.log('\n🎉 All direct API tests passed!');
    console.log('   This confirms the backend is working correctly.');
  } else {
    console.log('\n❌ Some direct API tests failed.');
    console.log('   Check the results above for details.');
  }
  console.log('='.repeat(70) + '\n');
  
  process.exit((providerSuccess && ownerSuccess) ? 0 : 1);
})();