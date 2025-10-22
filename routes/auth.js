// Authentication API Routes with Cognito Identity Pool Integration
const express = require('express');
const router = express.Router();

// Get AWS services from server
let cognito, cognitoIdentity;
setTimeout(() => {
  cognito = require('../server').cognito;
  cognitoIdentity = require('../server').cognitoIdentity;
}, 100);

/**
 * POST /api/auth/signup
 * Register a new user with Cognito User Pool
 * 
 * Request Body:
 * {
 *   email: string,
 *   password: string,
 *   fullName: string,
 *   role: 'seeker' | 'provider',
 *   serviceType?: string (required if role is provider)
 * }
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName, role, serviceType, address } = req.body;

    // Validation
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'email, password, fullName, and role are required'
      });
    }

    // Validate address (required by Cognito User Pool)
    if (!address || !address.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Missing address',
        message: 'Address is required for sign-up'
      });
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password too short',
        message: 'Password must be at least 8 characters long'
      });
    }

    if (!['seeker', 'provider'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        message: 'Role must be either "seeker" or "provider"'
      });
    }

    if (role === 'provider' && !serviceType) {
      return res.status(400).json({
        success: false,
        error: 'Missing service type',
        message: 'Service type is required for providers'
      });
    }

    console.log('📝 Signing up user:', email, 'Role:', role);

    // Sign up with Cognito User Pool
    const signUpParams = {
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        },
        {
          Name: 'name',
          Value: fullName
        },
        {
          Name: 'address',
          Value: address
        },
        {
          Name: 'custom:role',
          Value: role
        }
      ]
    };

    if (serviceType) {
      signUpParams.UserAttributes.push({
        Name: 'custom:serviceType',
        Value: serviceType
      });
    }

    const signUpResult = await cognito.signUp(signUpParams).promise();

    console.log('✅ User signed up successfully:', signUpResult.UserSub);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: {
        userId: signUpResult.UserSub,
        email: email,
        userConfirmed: signUpResult.UserConfirmed
      }
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    
    let errorMessage = 'Failed to sign up user';
    let statusCode = 500;

    if (error.code === 'UsernameExistsException') {
      errorMessage = 'User with this email already exists';
      statusCode = 409;
    } else if (error.code === 'InvalidPasswordException') {
      errorMessage = 'Password does not meet requirements';
      statusCode = 400;
    } else if (error.code === 'InvalidParameterException') {
      errorMessage = error.message;
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: error.code || 'SignupError',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return temporary AWS credentials via Identity Pool
 * 
 * Request Body:
 * {
 *   email: string,
 *   password: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   tokens: { idToken, accessToken, refreshToken },
 *   user: { userId, email, role },
 *   awsCredentials: {
 *     accessKeyId: string,
 *     secretAccessKey: string,
 *     sessionToken: string,
 *     expiration: Date
 *   }
 * }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    console.log('🔐 Logging in user:', email);

    // Step 1: Authenticate with Cognito User Pool
    const authParams = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    };

    const authResult = await cognito.initiateAuth(authParams).promise();

    if (!authResult.AuthenticationResult) {
      throw new Error('Authentication failed - no tokens returned');
    }

    const { IdToken, AccessToken, RefreshToken } = authResult.AuthenticationResult;

    console.log('✅ User authenticated with Cognito User Pool');

    // Step 2: Get user attributes to extract userId and role
    const userParams = {
      AccessToken: AccessToken
    };

    const userResult = await cognito.getUser(userParams).promise();
    const userId = userResult.Username;
    
    // Extract custom attributes
    const attributes = {};
    userResult.UserAttributes.forEach(attr => {
      attributes[attr.Name] = attr.Value;
    });

    const userData = {
      userId: userId,
      email: attributes.email || email,
      name: attributes.name || '',
      role: attributes['custom:role'] || 'seeker',
      serviceType: attributes['custom:serviceType'] || null
    };

    console.log('📋 User data:', userData);

    // Step 3: Exchange ID Token for temporary AWS credentials using Identity Pool
    console.log('🎫 Getting temporary AWS credentials from Identity Pool...');

    const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID;
    const region = process.env.AWS_REGION;
    const userPoolId = process.env.COGNITO_USER_POOL_ID;

    // Get Identity ID
    const getIdParams = {
      IdentityPoolId: identityPoolId,
      Logins: {
        [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: IdToken
      }
    };

    const identityResult = await cognitoIdentity.getId(getIdParams).promise();
    const identityId = identityResult.IdentityId;

    console.log('🆔 Identity ID:', identityId);

    // Get temporary credentials
    const credentialsParams = {
      IdentityId: identityId,
      Logins: {
        [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: IdToken
      }
    };

    const credentialsResult = await cognitoIdentity.getCredentialsForIdentity(credentialsParams).promise();

    if (!credentialsResult.Credentials) {
      throw new Error('Failed to get temporary credentials from Identity Pool');
    }

    const awsCredentials = {
      accessKeyId: credentialsResult.Credentials.AccessKeyId,
      secretAccessKey: credentialsResult.Credentials.SecretKey,
      sessionToken: credentialsResult.Credentials.SessionToken,
      expiration: credentialsResult.Credentials.Expiration
    };

    console.log('✅ Temporary AWS credentials obtained');
    console.log('⏰ Credentials expire at:', awsCredentials.expiration);

    // Return complete authentication response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      tokens: {
        idToken: IdToken,
        accessToken: AccessToken,
        refreshToken: RefreshToken
      },
      user: userData,
      awsCredentials: awsCredentials,
      identityId: identityId
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    
    let errorMessage = 'Failed to login';
    let errorCode = 'LOGIN_ERROR';
    let statusCode = 500;

    // User Not Confirmed Check - Explicit handling
    if (error.code === 'UserNotConfirmedException') {
      console.log('⚠️ User not confirmed - returning USER_NOT_CONFIRMED error');
      return res.status(403).json({
        success: false,
        code: 'USER_NOT_CONFIRMED',
        error: 'UserNotConfirmedException',
        message: 'Verification is required. Check your email for the code.'
      });
    }
    
    // Other authentication errors
    if (error.code === 'NotAuthorizedException') {
      errorMessage = 'Incorrect email or password';
      errorCode = 'INVALID_CREDENTIALS';
      statusCode = 401;
    } else if (error.code === 'UserNotFoundException') {
      errorMessage = 'User not found';
      errorCode = 'USER_NOT_FOUND';
      statusCode = 404;
    } else if (error.code === 'InvalidParameterException') {
      errorMessage = error.message;
      errorCode = 'INVALID_PARAMETER';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      code: errorCode,
      error: error.code || 'LoginError',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh AWS credentials using existing ID token
 * 
 * Request Body:
 * {
 *   idToken: string
 * }
 */
router.post('/refresh', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing token',
        message: 'ID token is required'
      });
    }

    console.log('🔄 Refreshing AWS credentials...');

    const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID;
    const region = process.env.AWS_REGION;
    const userPoolId = process.env.COGNITO_USER_POOL_ID;

    // Get Identity ID
    const getIdParams = {
      IdentityPoolId: identityPoolId,
      Logins: {
        [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken
      }
    };

    const identityResult = await cognitoIdentity.getId(getIdParams).promise();
    const identityId = identityResult.IdentityId;

    // Get fresh credentials
    const credentialsParams = {
      IdentityId: identityId,
      Logins: {
        [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken
      }
    };

    const credentialsResult = await cognitoIdentity.getCredentialsForIdentity(credentialsParams).promise();

    if (!credentialsResult.Credentials) {
      throw new Error('Failed to refresh credentials');
    }

    const awsCredentials = {
      accessKeyId: credentialsResult.Credentials.AccessKeyId,
      secretAccessKey: credentialsResult.Credentials.SecretKey,
      sessionToken: credentialsResult.Credentials.SessionToken,
      expiration: credentialsResult.Credentials.Expiration
    };

    console.log('✅ Credentials refreshed successfully');

    res.status(200).json({
      success: true,
      message: 'Credentials refreshed',
      awsCredentials: awsCredentials,
      identityId: identityId
    });

  } catch (error) {
    console.error('❌ Refresh error:', error);

    res.status(500).json({
      success: false,
      error: error.code || 'RefreshError',
      message: 'Failed to refresh credentials',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify email confirmation code
 * 
 * Request Body:
 * {
 *   email: string,
 *   code: string
 * }
 */
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Missing fields',
        message: 'Email and verification code are required'
      });
    }

    console.log('✉️ Verifying email:', email);

    const params = {
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: code
    };

    await cognito.confirmSignUp(params).promise();

    console.log('✅ Email verified successfully');

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.'
    });

  } catch (error) {
    console.error('❌ Verification error:', error);

    let errorMessage = 'Failed to verify email';
    let statusCode = 500;

    if (error.code === 'CodeMismatchException') {
      errorMessage = 'Invalid verification code';
      statusCode = 400;
    } else if (error.code === 'ExpiredCodeException') {
      errorMessage = 'Verification code has expired';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: error.code || 'VerificationError',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/confirm
 * Confirm user signup with verification code
 * 
 * This endpoint is called by the frontend when a user needs to verify their email.
 * It uses AWS Cognito's confirmSignUp method to activate the user account.
 * 
 * Request Body:
 * {
 *   email: string,           // User's email address
 *   verificationCode: string  // 6-digit code from email
 * }
 * 
 * Success Response (200 OK):
 * {
 *   success: true,
 *   message: 'Email verified successfully. You can now login.'
 * }
 * 
 * Error Responses:
 * - 400 Bad Request (Missing fields)
 * - 400 Bad Request (Invalid code - CodeMismatchException)
 * - 400 Bad Request (Expired code - ExpiredCodeException)
 * - 400 Bad Request (Already confirmed - NotAuthorizedException)
 * - 404 Not Found (User not found - UserNotFoundException)
 */
router.post('/confirm', async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    // Validation
    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        error: 'Missing fields',
        message: 'Email and verification code are required'
      });
    }

    console.log('✉️ Confirming signup for email:', email);

    // Call Cognito confirmSignUp
    const params = {
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: verificationCode
    };

    await cognito.confirmSignUp(params).promise();

    console.log('✅ Email confirmed successfully for:', email);

    // Success response
    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.'
    });

  } catch (error) {
    console.error('❌ Confirmation error:', error);

    let errorMessage = 'Failed to confirm email';
    let errorCode = 'CONFIRMATION_ERROR';
    let statusCode = 500;

    // Specific error handling
    if (error.code === 'CodeMismatchException') {
      errorMessage = 'Invalid verification code. Please check the code and try again.';
      errorCode = 'INVALID_CODE';
      statusCode = 400;
    } else if (error.code === 'ExpiredCodeException') {
      errorMessage = 'Verification code has expired. Please request a new code.';
      errorCode = 'EXPIRED_CODE';
      statusCode = 400;
    } else if (error.code === 'NotAuthorizedException') {
      errorMessage = 'User is already confirmed.';
      errorCode = 'ALREADY_CONFIRMED';
      statusCode = 400;
    } else if (error.code === 'UserNotFoundException') {
      errorMessage = 'User not found.';
      errorCode = 'USER_NOT_FOUND';
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      code: errorCode,
      error: error.code || 'ConfirmationError',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
