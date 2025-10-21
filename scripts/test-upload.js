#!/usr/bin/env node
/**
 * Test Script for S3 Upload API
 * Tests the /api/upload endpoint
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`\n${'='.repeat(60)}`);
console.log(`${colors.cyan}🧪 FixIt Upload API Test Suite${colors.reset}`);
console.log(`${'='.repeat(60)}\n`);

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Create a test image buffer
 */
function createTestImage() {
  // Create a simple 1x1 PNG image
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
    0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  return pngHeader;
}

/**
 * Create multipart form data
 */
function createMultipartData(file, userId, fileType) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const contentType = 'image/png';
  
  let data = '';
  
  // Add file field
  data += `--${boundary}\r\n`;
  data += `Content-Disposition: form-data; name="file"; filename="test-image.png"\r\n`;
  data += `Content-Type: ${contentType}\r\n\r\n`;
  
  const bodyStart = Buffer.from(data, 'utf-8');
  const bodyEnd = Buffer.from(`\r\n--${boundary}\r\n` +
    `Content-Disposition: form-data; name="userId"\r\n\r\n${userId}\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="fileType"\r\n\r\n${fileType}\r\n` +
    `--${boundary}--\r\n`, 'utf-8');
  
  return {
    body: Buffer.concat([bodyStart, file, bodyEnd]),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

/**
 * Make HTTP request
 */
function makeRequest(method, endpoint, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

/**
 * Test: Health check before running upload tests
 */
async function testHealthCheck() {
  totalTests++;
  console.log(`\n${colors.blue}🧪 Test 1: Health Check${colors.reset}`);
  
  try {
    const result = await makeRequest('GET', '/health');
    
    if (result.status === 200 && result.data.status === 'healthy') {
      console.log(`   ${colors.green}✓ Status: ${result.status}${colors.reset}`);
      console.log(`   ${colors.green}✓ Server is healthy${colors.reset}`);
      passedTests++;
      return true;
    } else {
      console.log(`   ${colors.red}✗ Unexpected response${colors.reset}`);
      failedTests++;
      return false;
    }
  } catch (error) {
    console.log(`   ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    console.log(`   ${colors.yellow}⚠ Make sure server is running: npm start${colors.reset}`);
    failedTests++;
    return false;
  }
}

/**
 * Test: Upload profile picture
 */
async function testUploadProfilePicture() {
  totalTests++;
  console.log(`\n${colors.blue}🧪 Test 2: Upload Profile Picture${colors.reset}`);
  
  try {
    const testImage = createTestImage();
    const { body, contentType } = createMultipartData(testImage, 'test_user_123', 'profile');
    
    const result = await makeRequest('POST', '/api/upload', body, {
      'Content-Type': contentType,
      'Content-Length': body.length
    });
    
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, JSON.stringify(result.data, null, 2));
    
    if (result.status === 200 && result.data.success) {
      console.log(`   ${colors.green}✓ Profile picture uploaded successfully${colors.reset}`);
      console.log(`   ${colors.green}✓ File URL: ${result.data.fileUrl}${colors.reset}`);
      passedTests++;
      return true;
    } else {
      console.log(`   ${colors.red}✗ Upload failed${colors.reset}`);
      failedTests++;
      return false;
    }
  } catch (error) {
    console.log(`   ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    failedTests++;
    return false;
  }
}

/**
 * Test: Upload job photo
 */
async function testUploadJobPhoto() {
  totalTests++;
  console.log(`\n${colors.blue}🧪 Test 3: Upload Job Photo${colors.reset}`);
  
  try {
    const testImage = createTestImage();
    const { body, contentType } = createMultipartData(testImage, 'worker_456', 'job');
    
    const result = await makeRequest('POST', '/api/upload', body, {
      'Content-Type': contentType,
      'Content-Length': body.length
    });
    
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, JSON.stringify(result.data, null, 2));
    
    if (result.status === 200 && result.data.success) {
      console.log(`   ${colors.green}✓ Job photo uploaded successfully${colors.reset}`);
      console.log(`   ${colors.green}✓ File URL: ${result.data.fileUrl}${colors.reset}`);
      passedTests++;
      return true;
    } else {
      console.log(`   ${colors.red}✗ Upload failed${colors.reset}`);
      failedTests++;
      return false;
    }
  } catch (error) {
    console.log(`   ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    failedTests++;
    return false;
  }
}

/**
 * Test: Upload without file (should fail)
 */
async function testUploadWithoutFile() {
  totalTests++;
  console.log(`\n${colors.blue}🧪 Test 4: Upload Without File (Should Fail)${colors.reset}`);
  
  try {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const body = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="userId"\r\n\r\ntest123\r\n` +
      `--${boundary}--\r\n`
    );
    
    const result = await makeRequest('POST', '/api/upload', body, {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    });
    
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, JSON.stringify(result.data, null, 2));
    
    if (result.status === 400 && result.data.success === false) {
      console.log(`   ${colors.green}✓ Correctly rejected upload without file${colors.reset}`);
      passedTests++;
      return true;
    } else {
      console.log(`   ${colors.red}✗ Should have returned 400 error${colors.reset}`);
      failedTests++;
      return false;
    }
  } catch (error) {
    console.log(`   ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    failedTests++;
    return false;
  }
}

/**
 * Test: Upload without userId (should fail)
 */
async function testUploadWithoutUserId() {
  totalTests++;
  console.log(`\n${colors.blue}🧪 Test 5: Upload Without userId (Should Fail)${colors.reset}`);
  
  try {
    const testImage = createTestImage();
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="test.png"\r\n` +
        `Content-Type: image/png\r\n\r\n`),
      testImage,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    
    const result = await makeRequest('POST', '/api/upload', body, {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    });
    
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, JSON.stringify(result.data, null, 2));
    
    if (result.status === 400 && result.data.success === false) {
      console.log(`   ${colors.green}✓ Correctly rejected upload without userId${colors.reset}`);
      passedTests++;
      return true;
    } else {
      console.log(`   ${colors.red}✗ Should have returned 400 error${colors.reset}`);
      failedTests++;
      return false;
    }
  } catch (error) {
    console.log(`   ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    failedTests++;
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`${colors.cyan}Starting upload API tests...${colors.reset}\n`);
  console.log(`${colors.yellow}⚠ Note: These tests will only work if:${colors.reset}`);
  console.log(`   1. Server is running (npm start)`);
  console.log(`   2. AWS credentials are configured in .env`);
  console.log(`   3. S3 bucket exists and is accessible\n`);
  
  // Run tests sequentially
  const serverHealthy = await testHealthCheck();
  
  if (!serverHealthy) {
    console.log(`\n${colors.red}⚠ Server health check failed. Skipping upload tests.${colors.reset}`);
    printSummary();
    return;
  }
  
  await testUploadProfilePicture();
  await testUploadJobPhoto();
  await testUploadWithoutFile();
  await testUploadWithoutUserId();
  
  printSummary();
}

/**
 * Print test summary
 */
function printSummary() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${colors.cyan}📊 Test Summary${colors.reset}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Tests:  ${totalTests}`);
  console.log(`${colors.green}Passed:       ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed:       ${failedTests}${colors.reset}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log(`${'='.repeat(60)}\n`);
  
  if (failedTests === 0) {
    console.log(`${colors.green}🎉 All tests passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ Some tests failed${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
