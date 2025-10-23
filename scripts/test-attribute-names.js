#!/usr/bin/env node

// Custom Attribute Name Test Script
// Run this to test different variations of the custom:serviceType attribute name

const AWS = require('aws-sdk');

// Load environment variables
require('dotenv').config();

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const cognito = new AWS.CognitoIdentityServiceProvider();

async function testAttributeNames() {
  console.log('Testing different custom attribute name variations...\n');
  
  // Different variations to test
  const variations = [
    'custom:servicetype',
    'custom:servicetype',
    'custom:service_type',
    'custom:ServiceType',
    'custom:service-type'
  ];
  
  // Test data
  const testEmail = 'attribute_test_' + Date.now() + '@example.com';
  const testPassword = 'Test123!@#';
  const testFullName = 'Attribute Test User';
  
  for (const attributeName of variations) {
    console.log(`🧪 Testing attribute name: ${attributeName}`);
    
    try {
      const signUpParams = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: testEmail.replace('@', `_${attributeName.replace(':', '_')}@`),
        Password: testPassword,
        UserAttributes: [
          {
            Name: 'name',
            Value: testFullName
          },
          {
            Name: 'custom:role',
            Value: 'provider'
          },
          {
            Name: attributeName,
            Value: 'Plumber'
          }
        ]
      };
      
      console.log(`   Sending request with attribute: ${attributeName}`);
      
      // Try to sign up with this attribute name
      const result = await cognito.signUp(signUpParams).promise();
      console.log(`   ✅ SUCCESS: ${attributeName} worked!`);
      console.log(`   User ID: ${result.UserSub}\n`);
      
      // If successful, we found the correct attribute name
      console.log(`🎉 Found correct attribute name: ${attributeName}`);
      return attributeName;
      
    } catch (error) {
      console.log(`   ❌ FAILED: ${attributeName} - ${error.code || error.message}`);
      
      // If it's not a naming issue, log more details
      if (error.code !== 'InvalidParameterException') {
        console.log(`   Error details: ${error.message}`);
      }
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('❌ None of the attribute name variations worked.');
  console.log('   The issue might be with the attribute configuration in Cognito.');
  return null;
}

// Run the test
testAttributeNames()
  .then(correctName => {
    if (correctName) {
      console.log(`\n✅ The correct attribute name is: ${correctName}`);
    } else {
      console.log('\n❌ Unable to determine the correct attribute name.');
      console.log('   Please check your Cognito User Pool configuration.');
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  });