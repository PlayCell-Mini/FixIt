#!/usr/bin/env node

// Incremental Cognito Test Script
// Run this to test Cognito signup with incremental attributes

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

// Test 1: Basic signup with only required attributes
async function testBasicSignup() {
  console.log('\n🧪 Test 1: Basic Signup (name and email only)');
  const testData = {
    email: 'basic_test_' + Date.now() + '@example.com',
    password: 'Test123!@#',
    fullName: 'Basic Test User'
    // No role or serviceType
  };

  console.log('📝 Sending signup data:', JSON.stringify(testData, null, 2));

  try {
    const result = await makeRequest('POST', '/api/auth/signup', testData);
    console.log(`📊 Response Status: ${result.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(result.data, null, 2));
    return result.status;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return 500;
  }
}

// Test 2: Signup with role but no serviceType
async function testSignupWithRole() {
  console.log('\n🧪 Test 2: Signup with Role (owner)');
  const testData = {
    email: 'role_test_' + Date.now() + '@example.com',
    password: 'Test123!@#',
    fullName: 'Role Test User',
    role: 'owner',
    address: '123 Test Street'
  };

  console.log('📝 Sending signup data:', JSON.stringify(testData, null, 2));

  try {
    const result = await makeRequest('POST', '/api/auth/signup', testData);
    console.log(`📊 Response Status: ${result.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(result.data, null, 2));
    return result.status;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return 500;
  }
}

// Test 3: Signup with role and serviceType
async function testSignupWithRoleAndServiceType() {
  console.log('\n🧪 Test 3: Signup with Role and ServiceType (provider)');
  const testData = {
    email: 'service_test_' + Date.now() + '@example.com',
    password: 'Test123!@#',
    fullName: 'Service Test User',
    role: 'provider',
    serviceType: 'Plumber',
    address: '123 Test Street'
  };

  console.log('📝 Sending signup data:', JSON.stringify(testData, null, 2));

  try {
    const result = await makeRequest('POST', '/api/auth/signup', testData);
    console.log(`📊 Response Status: ${result.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(result.data, null, 2));
    return result.status;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return 500;
  }
}

// Main
(async () => {
  console.log('='.repeat(70));
  console.log('🚀 Incremental Cognito Signup Test');
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

  // Run the tests incrementally
  const basicStatus = await testBasicSignup();
  const roleStatus = await testSignupWithRole();
  const serviceStatus = await testSignupWithRoleAndServiceType();
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Results:');
  console.log(`✅ Basic Signup: ${basicStatus}`);
  console.log(`✅ Signup with Role: ${roleStatus}`);
  console.log(`✅ Signup with Role and ServiceType: ${serviceStatus}`);
  
  if (basicStatus === 201 && roleStatus === 201 && serviceStatus === 201) {
    console.log('\n🎉 All tests passed! Cognito configuration is working correctly.');
  } else {
    console.log('\n❌ Some tests failed. Check the results above.');
    
    if (serviceStatus !== 201) {
      console.log('\n💡 The issue seems to be specifically with custom:serviceType attribute.');
      console.log('   This could be due to:');
      console.log('   1. The attribute not being properly defined in Cognito');
      console.log('   2. The attribute name not matching exactly (case sensitivity)');
      console.log('   3. The attribute data type not being set to String');
    }
  }
  console.log('='.repeat(70) + '\n');
  
  process.exit(0);
})();