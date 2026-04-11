/**
 * Diagnostic test for login issues
 * Checks all possible causes of "Incorrect email or password" error
 */
require('dotenv').config();

const AWS = require('aws-sdk');

// Test credentials - REPLACE WITH YOUR ACTUAL CREDENTIALS
const testEmail = 'aaaaaaaaaaaaaaaaaaaaa@test.com'; // Your 30-char test email
const testPassword = 'Test@123'; // Your 8-char test password

console.log('🔍 LOGIN DIAGNOSTIC TEST');
console.log('='.repeat(60));
console.log('');

// Initialize Cognito
const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

async function diagnoseLogin() {
  console.log('📋 Test Configuration:');
  console.log(`  Email: ${testEmail}`);
  console.log(`  Password: ${testPassword}`);
  console.log(`  Region: ${process.env.AWS_REGION}`);
  console.log(`  Client ID: ${process.env.COGNITO_CLIENT_ID}`);
  console.log('');

  // STEP 1: Check if user exists in Cognito
  console.log('📝 STEP 1: Checking if user exists in Cognito...');
  try {
    const adminGetUserParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: testEmail.toLowerCase()
    };

    const user = await cognito.adminGetUser(adminGetUserParams).promise();
    
    console.log('✅ User found in Cognito!');
    console.log('   User attributes:');
    user.UserAttributes.forEach(attr => {
      console.log(`     - ${attr.Name}: ${attr.Value}`);
    });
    
    // Check user status
    const userStatus = user.UserStatus;
    console.log(`\n   User Status: ${userStatus}`);
    
    if (userStatus === 'UNCONFIRMED') {
      console.log('\n❌ PROBLEM FOUND: User email is not confirmed!');
      console.log('   This is why login is failing with "Incorrect email or password"');
      console.log('   Solution: Verify the email using the 6-digit code sent to your email');
      console.log('');
      console.log('   To verify, run:');
      console.log(`   curl -X POST http://localhost:3001/api/auth/confirm \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d '{"email":"${testEmail}","verificationCode":"YOUR_6_DIGIT_CODE"}'`);
      return false;
    }
    
  } catch (error) {
    if (error.code === 'UserNotFoundException') {
      console.log('❌ User NOT found in Cognito!');
      console.log('   Possible reasons:');
      console.log('   1. Signup failed or was not completed');
      console.log('   2. Using wrong email address');
      console.log('   3. Email was changed after signup');
      return false;
    }
    console.log('⚠️ Error checking user:', error.message);
  }

  console.log('');

  // STEP 2: Try login with USER_PASSWORD_AUTH
  console.log('🔐 STEP 2: Attempting login with USER_PASSWORD_AUTH...');
  try {
    const authParams = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: testEmail.toLowerCase(),
        PASSWORD: testPassword
      }
    };

    console.log('   Auth params:', {
      ClientId: authParams.ClientId,
      USERNAME: authParams.AuthParameters.USERNAME,
      PASSWORD: '***' + authParams.AuthParameters.PASSWORD.slice(-3)
    });

    const authResult = await cognito.initiateAuth(authParams).promise();
    
    console.log('✅ Login successful!');
    console.log('   Tokens received:');
    console.log('   - IdToken:', authResult.AuthenticationResult.IdToken ? '✓' : '✗');
    console.log('   - AccessToken:', authResult.AuthenticationResult.AccessToken ? '✓' : '✗');
    console.log('   - RefreshToken:', authResult.AuthenticationResult.RefreshToken ? '✓' : '✗');
    return true;
    
  } catch (error) {
    console.log('❌ Login failed!');
    console.log('   Error code:', error.code);
    console.log('   Error message:', error.message);
    
    if (error.code === 'NotAuthorizedException') {
      console.log('\n🔴 ROOT CAUSE IDENTIFIED:');
      console.log('   Cognito rejected the credentials. Possible reasons:');
      console.log('   1. Password is incorrect (check case sensitivity)');
      console.log('   2. User email is not confirmed (check user status above)');
      console.log('   3. User account is disabled');
      console.log('   4. Using wrong email format (should be lowercase)');
    } else if (error.code === 'UserNotConfirmedException') {
      console.log('\n🟡 ROOT CAUSE IDENTIFIED:');
      console.log('   User exists but email is not confirmed.');
      console.log('   Please verify your email first.');
    }
    return false;
  }
}

// Run diagnostic
diagnoseLogin().then(success => {
  console.log('');
  console.log('='.repeat(60));
  console.log('📊 DIAGNOSTIC RESULT:');
  console.log('='.repeat(60));
  if (success) {
    console.log('✅ Login is working correctly!');
    console.log('   If you still see errors, check:');
    console.log('   1. Frontend is sending correct payload');
    console.log('   2. Network requests are reaching the backend');
    console.log('   3. Browser console for JavaScript errors');
  } else {
    console.log('❌ Login is NOT working');
    console.log('   Follow the suggestions above to fix the issue');
  }
  console.log('='.repeat(60));
  
  process.exit(success ? 0 : 1);
});
