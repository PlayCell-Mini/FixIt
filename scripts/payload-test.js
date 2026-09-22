#!/usr/bin/env node

// Signup Payload Test Script
// Run this to test what payload is being sent from the frontend

const http = require('http');
const url = require('url');

// Create a simple server to capture the payload
const server = http.createServer((req, res) => {
  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    console.log('\n=== Signup Request Received ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', req.headers);
    
    try {
      const payload = JSON.parse(body);
      console.log('Payload:', JSON.stringify(payload, null, 2));
      
      // Send a mock response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Mock response',
        data: { userId: 'test-user-id' }
      }));
    } catch (error) {
      console.log('Raw body:', body);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid JSON' }));
    }
    
    console.log('===============================\n');
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`);
  console.log('Use this to test what payload is being sent from the frontend');
  console.log('Press Ctrl+C to stop');
});