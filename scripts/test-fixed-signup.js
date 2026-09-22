#!/usr/bin/env node

// Fixed Signup Test Script
// Run this to test the fixed signup functionality

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

// Test signup as provider with Electrician service type
async function testSignupProvider() {
  console.log('\n🧪 Testing Fixed Provider Signup with Electrician Service Type...');
  const testData = {
    email: 'fixed_electrician_test_' + Date.now() + '@example.com', // Use unique email
    password: 'Test123!@#',
    fullName: 'Fixed Test Electrician Provider',
    role: 'provider',
    serviceType: 'Electrician',
    address: '789 Fixed Electric Avenue, Test City'
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

// Test signup as owner
async function testSignupOwner() {
  console.log('\n🧪 Testing Fixed Owner Signup...');
  const testData = {
    email: 'fixed_owner_test_' + Date.now() + '@example.com', // Use unique email
    password: 'Test123!@#',
    fullName: 'Fixed Test Owner',
    role: 'owner',
    address: '123 Fixed Test Street, Test City'
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
  console.log('🚀 Fixed Signup Diagnostic Test');
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
  const providerSuccess = await testSignupProvider();
  const ownerSuccess = await testSignupOwner();
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Results:');
  console.log(`✅ Provider Signup: ${providerSuccess ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Owner Signup: ${ownerSuccess ? 'PASSED' : 'FAILED'}`);
  
  if (providerSuccess && ownerSuccess) {
    console.log('\n🎉 All signup tests completed successfully!');
  } else {
    console.log('\n❌ Some signup tests failed. Check server logs for details.');
  }
  console.log('='.repeat(70) + '\n');
  
  process.exit((providerSuccess && ownerSuccess) ? 0 : 1);
})();