#!/usr/bin/env node

// Environment Setup Verification Script
require('dotenv').config();

const requiredVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET',
  'DYNAMODB_USERS_TABLE',
  'DYNAMODB_PROVIDERS_TABLE',
  'DYNAMODB_JOBS_TABLE',
  'COGNITO_USER_POOL_ID',
  'COGNITO_CLIENT_ID',
  'COGNITO_IDENTITY_POOL_ID'
];

console.log('\n🔍 Checking environment configuration...\n');

let allValid = true;
const results = [];

const placeholderValues = new Set([
  'your_access_key_here',
  'your_secret_key_here',
  'your_user_pool_id_here',
  'your_client_id_here',
  'your_identity_pool_id_here',
  'your_bucket_name_here',
  'example',
  'changeme'
]);

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const isSet = !!value && !placeholderValues.has(String(value).trim().toLowerCase());

  if (isSet) {
    results.push(`✅ ${varName}`);
  } else {
    results.push(`❌ ${varName} - NOT SET or using placeholder`);
    allValid = false;
  }
});

results.forEach(r => console.log(r));

console.log('\n' + '='.repeat(50));

if (allValid) {
  console.log('✅ All environment variables are configured!');
  console.log('You can now run: npm start');
} else {
  console.log('❌ Please configure missing variables in .env file');
  console.log('See .env for required values');
}

console.log('='.repeat(50) + '\n');

process.exit(allValid ? 0 : 1);
