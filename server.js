require('dotenv').config();
const express = require('express');
const AWS = require('aws-sdk');
const path = require('path');
const AWSServices = require('./services/aws');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Load and validate environment variables
const requiredEnvVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'COGNITO_IDENTITY_POOL_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please configure your .env file');
  process.exit(1);
}

// Initialize AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Initialize AWS Services
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const cognito = new AWS.CognitoIdentityServiceProvider();
const cognitoIdentity = new AWS.CognitoIdentity();

// Initialize AWS service helper
const awsServices = new AWSServices(dynamoDB, s3, cognito);

console.log('✅ AWS SDK initialized successfully');
console.log('📍 Region:', process.env.AWS_REGION);
console.log('🗄️  DynamoDB DocumentClient ready');
console.log('📦 S3 Client ready');
console.log('🔐 Cognito User Pool Client ready');
console.log('🎫 Cognito Identity Pool Client ready');

// Export AWS clients and services for use in routes
module.exports.dynamoDB = dynamoDB;
module.exports.s3 = s3;
module.exports.cognito = cognito;
module.exports.cognitoIdentity = cognitoIdentity;
module.exports.awsServices = awsServices;

// API Routes
const apiRoutes = require('./routes/api');
const marketplaceRoutes = require('./routes/marketplace');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');

app.use('/api', apiRoutes);
app.use('/api', marketplaceRoutes);
app.use('/api', uploadRoutes);
app.use('/api/auth', authRoutes);

// Serve index.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      dynamoDB: 'connected',
      s3: 'connected',
      cognito: 'connected'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 FixIt Service Marketplace Server');
  console.log('='.repeat(50));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50) + '\n');
});
