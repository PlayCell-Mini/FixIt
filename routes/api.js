// API Routes for FixIt Service Marketplace
const express = require('express');
const router = express.Router();

// Import server exports
const server = require('../server');

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Get AWS configuration (without credentials)
router.get('/config', (req, res) => {
  res.json({
    region: process.env.AWS_REGION,
    s3Bucket: process.env.S3_BUCKET,
    cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID,
    cognitoClientId: process.env.COGNITO_CLIENT_ID
  });
});

module.exports = router;
