#!/usr/bin/env node

// Simple Cognito Test Script
// Run this to test direct Cognito API calls

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

async function testCognitoAttributes() {
  console.log('Testing Cognito attribute configuration...');
  
  // Test with a simple call to list user pool attributes
  try {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    console.log('User Pool ID:', userPoolId);
    
    const params = {
      UserPoolId: userPoolId
    };
    
    const result = await cognito.describeUserPool(params).promise();
    console.log('User Pool Schema Attributes:');
    
    if (result.UserPool && result.UserPool.SchemaAttributes) {
      result.UserPool.SchemaAttributes.forEach(attr => {
        console.log(`- ${attr.Name} (${attr.AttributeDataType})`);
      });
    }
    
    // Check specifically for our custom attributes
    const customRole = result.UserPool.SchemaAttributes.find(attr => attr.Name === 'custom:role');
    const customServiceType = result.UserPool.SchemaAttributes.find(attr => attr.Name === 'custom:servicetype');
    
    console.log('\nCustom Attribute Check:');
    console.log('custom:role:', customRole ? 'FOUND' : 'NOT FOUND');
    console.log('custom:servicetype:', customServiceType ? 'FOUND' : 'NOT FOUND');
    
    if (customRole) {
      console.log('custom:role details:', JSON.stringify(customRole, null, 2));
    }
    
    if (customServiceType) {
      console.log('custom:servicetype details:', JSON.stringify(customServiceType, null, 2));
    }
    
  } catch (error) {
    console.error('Error checking Cognito attributes:', error);
  }
}

// Run the test
testCognitoAttributes();