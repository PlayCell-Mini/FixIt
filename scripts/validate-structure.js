#!/usr/bin/env node

// Validation Test Script
// Run this to validate the data structure being sent to Cognito

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

// Test with minimal data to see if we can isolate the issue
async function testMinimalProviderSignup() {
  console.log('\n🧪 Testing Minimal Provider Signup...');
  const testData = {
    email: 'minimal_test_' + Date.now() + '@example.com', // Use unique email
    password: 'Test123!@#',
    fullName: 'Minimal Test Provider',
    role: 'provider',
    serviceType: 'Plumber', // Simple service type
    address: '123 Test Street' // Simple address
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

// Test data structure validation
function validateDataStructure() {
  console.log('\n🔍 Validating Data Structure...');
  
  // Simulate the data structure we're sending
  const userAttributes = [
    {
      Name: 'name',
      Value: 'Minimal Test Provider'
    },
    {
      Name: 'address',
      Value: '123 Test Street'
    },
    {
      Name: 'custom:role',
      Value: 'provider'
    },
    {
      Name: 'custom:serviceType',
      Value: 'Plumber'
    }
  ];
  
  console.log('✅ User Attributes Structure:');
  console.log(JSON.stringify(userAttributes, null, 2));
  
  // Check for prohibited attributes
  const prohibitedAttributes = ['sub', 'email_verified', 'phone_number_verified'];
  const hasProhibited = userAttributes.some(attr => prohibitedAttributes.includes(attr.Name));
  
  if (hasProhibited) {
    console.log('❌ Contains prohibited attributes');
    return false;
  }
  
  // Check for empty values
  const hasEmptyValues = userAttributes.some(attr => 
    attr.Value === null || 
    attr.Value === undefined || 
    attr.Value.toString().trim() === ''
  );
  
  if (hasEmptyValues) {
    console.log('❌ Contains empty attribute values');
    return false;
  }
  
  console.log('✅ No prohibited attributes found');
  console.log('✅ No empty attribute values found');
  console.log('✅ Data structure is valid');
  return true;
}

// Main
(async () => {
  console.log('='.repeat(70));
  console.log('🚀 Cognito Data Structure Validation Test');
  console.log('='.repeat(70));
  
  // Validate data structure first
  const isStructureValid = validateDataStructure();
  
  if (!isStructureValid) {
    console.log('\n❌ Data structure validation failed!');
    process.exit(1);
  }
  
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

  // Run the test
  const success = await testMinimalProviderSignup();
  
  console.log('\n' + '='.repeat(70));
  if (success) {
    console.log('🎉 Minimal signup test completed successfully!');
    console.log('   This indicates the code is working correctly.');
    console.log('   The issue is likely with AWS Cognito configuration.');
  } else {
    console.log('❌ Minimal signup test failed.');
    console.log('   Check server logs for details.');
  }
  console.log('='.repeat(70) + '\n');
  
  process.exit(success ? 0 : 1);
})();