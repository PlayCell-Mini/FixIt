#!/usr/bin/env node

// API Test Script
// Run this to test the marketplace APIs

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

// Test functions
async function testHealthCheck() {
  console.log('\n🧪 Testing Health Check...');
  try {
    const result = await makeRequest('GET', '/health');
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, result.data);
    return result.status === 200;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function testCreateServiceRequest() {
  console.log('\n🧪 Testing POST /api/hire...');
  const testData = {
    workerId: 'worker_test_001',
    customerId: 'customer_test_001',
    serviceType: 'Plumber',
    description: 'Test: Fix leaking kitchen sink'
  };

  try {
    const result = await makeRequest('POST', '/api/hire', testData);
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, result.data);
    return result.status === 201 && result.data.success;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function testCreateServiceRequestWithMissingFields() {
  console.log('\n🧪 Testing POST /api/hire with missing fields...');
  const testData = {
    workerId: 'worker_test_002',
    // Missing customerId, serviceType, description
  };

  try {
    const result = await makeRequest('POST', '/api/hire', testData);
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, result.data);
    return result.status === 400 && !result.data.success;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function testGetAllServices() {
  console.log('\n🧪 Testing GET /api/services...');
  try {
    const result = await makeRequest('GET', '/api/services');
    console.log(`   Status: ${result.status}`);
    console.log(`   Count: ${result.data.count}`);
    console.log(`   Response:`, result.data);
    return result.status === 200 && result.data.success;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function testGetServicesByType() {
  console.log('\n🧪 Testing GET /api/services?serviceType=Plumber...');
  try {
    const result = await makeRequest('GET', '/api/services?serviceType=Plumber');
    console.log(`   Status: ${result.status}`);
    console.log(`   Count: ${result.data.count}`);
    console.log(`   Filter: ${result.data.filter}`);
    return result.status === 200 && result.data.success;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('='.repeat(60));
  console.log('🚀 Marketplace API Test Suite');
  console.log('='.repeat(60));

  const results = {
    healthCheck: await testHealthCheck(),
    createService: await testCreateServiceRequest(),
    createServiceInvalid: await testCreateServiceRequestWithMissingFields(),
    getAllServices: await testGetAllServices(),
    getServicesByType: await testGetServicesByType()
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
