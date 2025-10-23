#!/usr/bin/env node

// Signup Test Script
// Run this to test the signup functionality with owner/provider roles

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

// Test signup as owner
async function testSignupOwner() {
  console.log('\n🧪 Testing Owner Signup...');
  const testData = {
    email: 'owner_test@example.com',
    password: 'Test123!@#',
    fullName: 'Test Owner',
    role: 'owner',
    address: '123 Test Street, Test City'
  };

  try {
    const result = await makeRequest('POST', '/api/auth/signup', testData);
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, result.data);
    return result.status === 201 && result.data.success;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

// Test signup as provider
async function testSignupProvider() {
  console.log('\n🧪 Testing Provider Signup...');
  const testData = {
    email: 'provider_test@example.com',
    password: 'Test123!@#',
    fullName: 'Test Provider',
    role: 'provider',
    serviceType: 'Plumber',
    address: '456 Test Avenue, Test City'
  };

  try {
    const result = await makeRequest('POST', '/api/auth/signup', testData);
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, result.data);
    return result.status === 201 && result.data.success;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

// Test signup with invalid role
async function testSignupInvalidRole() {
  console.log('\n🧪 Testing Signup with Invalid Role...');
  const testData = {
    email: 'invalid_test@example.com',
    password: 'Test123!@#',
    fullName: 'Test Invalid',
    role: 'invalid',
    address: '789 Test Blvd, Test City'
  };

  try {
    const result = await makeRequest('POST', '/api/auth/signup', testData);
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, result.data);
    return result.status === 400 && !result.data.success;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

// Test provider signup without serviceType
async function testProviderSignupWithoutServiceType() {
  console.log('\n🧪 Testing Provider Signup Without Service Type...');
  const testData = {
    email: 'provider_no_service_test@example.com',
    password: 'Test123!@#',
    fullName: 'Test Provider No Service',
    role: 'provider',
    address: '101 Test Lane, Test City'
    // Missing serviceType
  };

  try {
    const result = await makeRequest('POST', '/api/auth/signup', testData);
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, result.data);
    return result.status === 400 && !result.data.success;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('='.repeat(60));
  console.log('🚀 Signup API Test Suite');
  console.log('='.repeat(60));

  const results = {
    ownerSignup: await testSignupOwner(),
    providerSignup: await testSignupProvider(),
    invalidRole: await testSignupInvalidRole(),
    providerNoServiceType: await testProviderSignupWithoutServiceType()
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`${passed}/${total} tests passed`);
  console.log('='.repeat(60) + '\n');

  // If all tests pass, let's do a detailed verification
  if (passed === total) {
    console.log('🎉 All tests passed! The signup functionality is working correctly.');
  }

  process.exit(passed === total ? 0 : 1);
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('GET', '/health');
    return true;
  } catch (error) {
    console.error('❌ Server is not running!');
    console.error('   Please start the server with: npm start');
    console.error('   Then run this test again.');
    return false;
  }
}

// Main
(async () => {
  if (await checkServer()) {
    await runTests();
  } else {
    process.exit(1);
  }
})();