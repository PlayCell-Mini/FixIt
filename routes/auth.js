// Authentication API Routes
const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');

// Lazy initialize AWS services
let cognito, cognitoIdentity;

function initializeAWSServices() {
  if (!cognito) {
    cognito = new AWS.CognitoIdentityServiceProvider({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
  }
  
  if (!cognitoIdentity) {
    cognitoIdentity = new AWS.CognitoIdentity({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
  }
}

/**
 * Helper function to send detailed 400 response for missing fields
 */
function sendMissingFieldsError(res, fields) {
  const missing = Object.keys(fields).filter(key => fields[key]);
  
  if (missing.length > 0) {
    console.log('❌ Missing fields detected:', missing);
    return res.status(400).json({
      success: false,
      code: 'MISSING_FIELDS',
      error: 'Missing required fields',
      message: `The following fields are required: ${missing.join(', ')}`
    });
  }
  return null;
}

/**
 * POST /api/auth/signup
 * Register a new user with Cognito User Pool and save to DynamoDB
 * * Request Body:
 * {
 * email: string,
 * password: string,
 * fullName: string,
 * role: 'owner' | 'provider',
 * serviceType?: string (required if role is provider)
 * address: string
 * }
 */
router.post('/signup', async (req, res) => {
  try {
    // Initialize AWS services
    initializeAWSServices();
    
    // CRITICAL: Log the raw request body for diagnostic purposes
    console.log('📥 Raw signup request body:', JSON.stringify(req.body, null, 2));
    
    // CRITICAL FIX: Robust Data Extraction - Ensure all fields are correctly retrieved and trimmed
    // This uses direct req.body access for maximum compatibility with Express middleware.
    const email = (req.body.email && typeof req.body.email === 'string') ? req.body.email.trim().toLowerCase() : null;
    const password = req.body.password || null;
    const fullName = (req.body.fullName && typeof req.body.fullName === 'string') ? req.body.fullName.trim() : null;
    const role = (req.body.role && typeof req.body.role === 'string') ? req.body.role.trim() : null;
    const address = (req.body.address && typeof req.body.address === 'string') ? req.body.address.trim() : null;
    // Capture serviceType (checking for both 'serviceType' and 'servicetype')
    const serviceType = req.body.serviceType || req.body.servicetype || null; 
    
    // CRITICAL: Log extracted values for diagnostic purposes
    console.log('📥 Extracted values - email:', email, 'role:', role, 'serviceType:', serviceType, 'address:', address, 'password set:', !!password);
    
    // Explicit validation to ensure all required fields are present
    const missingFields = {
        fullName: !fullName,
        email: !email,
        password: !password,
        role: !role,
        address: !address
    };

    // Validation - Ensure all mandatory fields are present
    const missingError = sendMissingFieldsError(res, missingFields);
    if (missingError) return missingError;


    if (!email.match(/^[^\s@]+@[^\^\s@]+\.[^\s@]+$/)) {
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

    if (!['owner', 'provider'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        message: 'Role must be either "owner" or "provider"'
      });
    }

    // CRITICAL CHECK: Ensure serviceType is present if user is a provider
    let providerServiceType = null;
    if (role === 'provider') {
      // Handle case where frontend uses serviceType
      providerServiceType = serviceType; // Already extracted and set to null if empty
      
      if (!providerServiceType || typeof providerServiceType !== 'string' || providerServiceType.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Missing service type',
          message: 'Service type is required for providers'
        });
      }
      
      providerServiceType = providerServiceType.trim();
      console.log('🔧 Provider serviceType resolved to:', providerServiceType);
    }

    console.log('📝 Signing up user:', email, 'Role:', role, 'ServiceType:', providerServiceType);

    // Sign up with Cognito User Pool - include only allowed standard and custom attributes
    const userAttributes = [];

    // Add standard attributes (name and address)
    if (fullName && fullName.trim() !== '') {
      userAttributes.push({ Name: 'name', Value: fullName.trim() });
    }
    if (address && address.trim() !== '') {
      userAttributes.push({ Name: 'address', Value: address.trim() });
    }
    
    // CRITICAL: Add custom attributes with FINAL conditional logic
    // Rule a: custom:role is always set to the user's role (provider or owner)
    if (role && role.trim() !== '') {
      const trimmedRole = role.trim();
      userAttributes.push({
        Name: 'custom:role',
        Value: trimmedRole
      });
      console.log('🔧 Adding custom:role attribute with value:', trimmedRole);
    } else {
      // This should never happen due to earlier validation, but let's be safe
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        message: 'Role is required and cannot be empty (Cognito Payload validation)'
      });
    }

    // Rule b: custom:servicetype is only included if the user is a provider AND the value is non-empty
    if (role === 'provider' && providerServiceType) {
      if (providerServiceType !== '') {
        userAttributes.push({
          Name: 'custom:servicetype',
          Value: providerServiceType
        });
        console.log('🔧 Adding custom:servicetype attribute with value:', providerServiceType);
      }
    }

    // Filter out any attributes with empty values and prohibited attributes
    const prohibitedAttributes = ['sub', 'email_verified', 'phone_number_verified'];
    const filteredUserAttributes = userAttributes.filter(attr => 
      attr.Value !== null && 
      attr.Value !== undefined && 
      attr.Value.toString().trim() !== '' &&
      !prohibitedAttributes.includes(attr.Name)
    );

    // CRITICAL: Log the filtered attributes
    console.log('🔍 Filtered UserAttributes:', JSON.stringify(filteredUserAttributes, null, 2));

    const signUpParams = {
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: filteredUserAttributes
    };

    // Display the data to be sent to AWS
    console.log('🔐 Cognito SignUp Params:', JSON.stringify(signUpParams, null, 2));
    
    // CRITICAL: Ensure data integrity before calling Cognito
    if (!signUpParams.ClientId) {
      throw new Error('COGNITO_CLIENT_ID is not configured in environment variables');
    }
    
    if (!signUpParams.Username) {
      throw new Error('Email (Username) is required for signup');
    }
    
    if (!signUpParams.Password) {
      throw new Error('Password is required for signup');
    }

    const signUpResult = await cognito.signUp(signUpParams).promise();

    // DIAGNOSTIC: Log the entire signUpResult to see what we're getting
    console.log('🔍 Cognito SignUp Result:', JSON.stringify(signUpResult, null, 2));

    // CRITICAL: Extract the unique user ID from the Cognito response
    const userId = signUpResult.UserSub;
    
    // DIAGNOSTIC: Log the extracted userId
    console.log('🔑 Extracted userId from Cognito:', userId);

    // CRITICAL CHECK: Ensure userId is valid and not empty
    if (!userId || userId.trim() === '') {
      throw new Error('Invalid userId: Cognito signup returned empty or missing UserSub');
    }

    console.log('✅ User signed up successfully with Cognito:', userId);

    // Save user data to DynamoDB with proper PK/SK structure
    const userData = {
      UserID: userId,  // CRITICAL FIX: DynamoDB requires UserID (uppercase) as per table schema
      userId: userId,
      email: email,
      fullName: fullName,
      address: address,
      role: role,
      createdAt: new Date().toISOString()
    };

    // CRITICAL: Add serviceType for providers
    if (role === 'provider' && providerServiceType) {
      userData.serviceType = providerServiceType;
      console.log('🔧 Adding serviceType for provider:', providerServiceType);
    }

    // CRITICAL SYNTAX FIX FOR 500 ERROR
    // Get DynamoDB client directly
    initializeAWSServices();
    const dynamoDB = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
    
    // Get table name from environment variables
    const tableName = process.env.DYNAMODB_USERS_TABLE || 'FixIt';
    console.log('💾 Saving user data to DynamoDB table:', tableName, 'with userId:', userId, 'role:', role);
    
    // Create proper PK/SK structure for single table design
    const pk = role === 'provider' ? `PROVIDER#${userId}` : `USER#${userId}`;
    
    // Prepare item for DynamoDB with correct JavaScript object syntax
    const item = {
      PK: pk,
      SK: 'PROFILE#INFO',
      UserID: userId,  // CRITICAL FIX: Include UserID (uppercase) - required by DynamoDB schema
      userId: userId,
      userType: role,
      ...userData,
      updatedAt: new Date().toISOString()
    };
    
    // Direct DynamoDB put operation with correct syntax
    const dbParams = {
      TableName: tableName,
      Item: item
    };
    
    try {
      console.log('🔄 Attempting direct DynamoDB put operation...', JSON.stringify(dbParams, null, 2));
      await dynamoDB.put(dbParams).promise();
      console.log('✅ User data saved to DynamoDB successfully via direct put');
    } catch (dynamoError) {
      console.error('❌ DynamoDB Save Error:', dynamoError);
      console.warn('⚠️ CRITICAL: Cognito user created but DynamoDB save failed. User can still verify and login.');
      // Don't throw - Cognito signup succeeded, we should still return success to frontend
      // The user can verify their email and login even if DynamoDB record is missing
    }

    // Determine if user needs confirmation
    const needsConfirmation = signUpResult.UserConfirmed === false;

    // CRITICAL: Ensure server returns 201 Created status upon successful registration
    res.status(201).json({
      success: true,
      message: needsConfirmation 
        ? 'User created successfully. Please check your email for the verification code.'
        : 'User registered successfully.',
      requiresConfirmation: needsConfirmation,
      data: {
        userId: userId,
        email: email,
        userConfirmed: signUpResult.UserConfirmed
      }
    });

  } catch (error) {
    console.error('SERVER CRASH ON SIGNUP:', error);
    // CRITICAL: Ensure headers are not sent twice, but respond with JSON.
    if (!res.headersSent) {
      // Handle specific Cognito errors
      if (error.code === 'InvalidParameterException' && error.message.includes('custom:')) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_CUSTOM_ATTRIBUTES',
          message: 'Custom attributes are not properly configured in Cognito User Pool. Please contact administrator.',
          details: error.message
        });
      }
      
      // Handle specific provider validation errors
      if (error.code === 'InvalidParameterException' && error.message.includes('serviceType')) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_SERVICE_TYPE',
          message: 'Service type validation failed. Please check the service type value.',
          details: error.message
        });
      }
      
      // Handle general InvalidParameterException
      if (error.code === 'InvalidParameterException') {
        return res.status(400).json({
          success: false,
          code: 'INVALID_PARAMETER',
          message: error.message || 'Invalid parameter provided. Please check your input.',
          details: error.message
        });
      }
      
      // Handle UsernameExistsException
      if (error.code === 'UsernameExistsException') {
        return res.status(400).json({
          success: false,
          code: 'USERNAME_EXISTS',
          message: 'An account with this email already exists.',
          details: error.message
        });
      }
      
      // Handle general errors with a safe fallback
      return res.status(500).json({
        success: false,
        code: 'SIGNUP_FAILED',
        message: 'Failed to register user. Please try again.',
        details: error.code || error.message || 'Unknown error occurred'
      });
    }
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return temporary AWS credentials via Identity Pool
 * * Request Body:
 * {
 * email: string,
 * password: string
 * }
 * * Response:
 * {
 * success: true,
 * tokens: { idToken, accessToken, refreshToken },
 * user: { userId, email, role },
 * awsCredentials: {
 * accessKeyId: string,
 * secretAccessKey: string,
 * sessionToken: string,
 * expiration: Date
 * }
 * }
 */
router.post('/login', async (req, res) => {
  try {
    // Initialize AWS services
    initializeAWSServices();
    
    const { email, password } = req.body;

    // STEP 1: Debug logs before request
    console.log('Login attempt:', { email, password });
    console.log('🔐 ========== COGNITO LOGIN ATTEMPT ==========');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password ? '***' + password.slice(-3) : 'NOT PROVIDED');
    console.log('📏 Email length:', email ? email.length : 0);
    console.log('📏 Password length:', password ? password.length : 0);

    // STEP 2: Validate environment variables
    if (!process.env.COGNITO_CLIENT_ID) {
      console.error('❌ COGNITO_CLIENT_ID not configured in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - COGNITO_CLIENT_ID not set'
      });
    }

    if (!process.env.AWS_REGION) {
      console.error('❌ AWS_REGION not configured in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - AWS_REGION not set'
      });
    }

    console.log('✅ Environment variables verified:');
    console.log('   - COGNITO_CLIENT_ID:', process.env.COGNITO_CLIENT_ID);
    console.log('   - AWS_REGION:', process.env.AWS_REGION);

    // STEP 3: Validate required fields
    if (!email || !password) {
      console.log('❌ Validation failed: Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }

    // CRITICAL FIX: Normalize email to lowercase (Cognito is case-sensitive)
    const normalizedEmail = email.toLowerCase().trim();
    console.log('📧 Normalized email (USERNAME):', normalizedEmail);

    // STEP 4: Prepare Cognito auth parameters
    const authParams = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: normalizedEmail,
        PASSWORD: password
      }
    };

    console.log('🔧 Cognito Auth Parameters:');
    console.log('   - AuthFlow:', authParams.AuthFlow);
    console.log('   - ClientId:', authParams.ClientId);
    console.log('   - USERNAME:', authParams.AuthParameters.USERNAME);
    console.log('   - PASSWORD:', authParams.AuthParameters.PASSWORD ? '***' + authParams.AuthParameters.PASSWORD.slice(-3) : 'NOT SET');

    // STEP 5: Call Cognito initiateAuth
    console.log('🔍 Calling cognito.initiateAuth()...');
    const authResult = await cognito.initiateAuth(authParams).promise();

    console.log('✅ Cognito authentication successful');
    console.log('🎫 AuthenticationResult keys:', Object.keys(authResult.AuthenticationResult));

    // STEP 6: Extract tokens
    const { IdToken, AccessToken, RefreshToken } = authResult.AuthenticationResult;

    console.log('✅ Tokens extracted:');
    console.log('   - AccessToken:', AccessToken ? AccessToken.substring(0, 50) + '...' : 'MISSING');
    console.log('   - IdToken:', IdToken ? IdToken.substring(0, 50) + '...' : 'MISSING');
    console.log('   - RefreshToken:', RefreshToken ? RefreshToken.substring(0, 50) + '...' : 'MISSING');

    // STEP 7: Get user attributes from Cognito
    console.log('📋 Fetching user attributes from Cognito...');
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
      role: attributes['custom:role'] || 'owner',
      serviceType: attributes['custom:servicetype'] || null
    };

    console.log('📋 User data retrieved:', userData);

    // STEP 8: Get temporary AWS credentials via Identity Pool (OPTIONAL)
    let awsCredentials = null;
    let identityId = null;

    try {
      console.log('🎫 Attempting to get temporary AWS credentials from Identity Pool...');

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
      identityId = identityResult.IdentityId;

      // Get temporary credentials
      const credentialsParams = {
        IdentityId: identityId,
        Logins: {
          [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: IdToken
        }
      };

      const credentialsResult = await cognitoIdentity.getCredentialsForIdentity(credentialsParams).promise();

      if (!credentialsResult.Credentials) {
        console.warn('⚠️ Identity Pool returned no credentials');
      } else {
        awsCredentials = {
          accessKeyId: credentialsResult.Credentials.AccessKeyId,
          secretAccessKey: credentialsResult.Credentials.SecretKey,
          sessionToken: credentialsResult.Credentials.SessionToken,
          expiration: credentialsResult.Credentials.Expiration
        };

        console.log('✅ Temporary AWS credentials obtained');
        console.log('⏰ Credentials expire at:', awsCredentials.expiration);
      }
    } catch (identityError) {
      // Identity Pool errors are NON-CRITICAL - login still succeeds with just tokens
      console.warn('⚠️ Identity Pool error (non-critical):', identityError.code, '-', identityError.message);
      console.warn('⚠️ Login will proceed without AWS credentials');
      console.warn('💡 To fix this, configure your Identity Pool to trust User Pool:', process.env.COGNITO_USER_POOL_ID);
    }

    // STEP 9: Return success response with AuthenticationResult
    console.log('✅ ========== LOGIN SUCCESSFUL ==========');
    res.status(200).json({
      success: true,
      message: 'Login successful',
      AuthenticationResult: {
        IdToken: IdToken,
        AccessToken: AccessToken,
        RefreshToken: RefreshToken
      },
      tokens: {
        idToken: IdToken,
        accessToken: AccessToken,
        refreshToken: RefreshToken
      },
      user: userData,
      awsCredentials: awsCredentials, // May be null if Identity Pool not configured
      identityId: identityId // May be null if Identity Pool not configured
    });

  } catch (error) {
    console.error('COGNITO LOGIN ERROR:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    // Extract email from request for error logging
    const requestEmail = req.body?.email || 'unknown';
    
    // Handle specific Cognito errors
    if (error.code === 'UserNotFoundException') {
      console.log('⚠️ User not found:', requestEmail);
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (error.code === 'NotAuthorizedException') {
      console.log('⚠️ Incorrect email or password for:', requestEmail);
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password'
      });
    }
    
    if (error.code === 'UserNotConfirmedException') {
      console.log('⚠️ User not verified:', requestEmail);
      return res.status(403).json({
        success: false,
        message: 'User not verified'
      });
    }
    
    if (error.code === 'InvalidParameterException') {
      console.log('⚠️ Invalid parameter:', error.message);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Generic server error
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to login'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh AWS credentials using existing ID token
 * * Request Body:
 * {
 * idToken: string
 * }
 */
router.post('/refresh', async (req, res) => {
  try {
    // Initialize AWS services
    initializeAWSServices();
    
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
        [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: IdToken
      }
    };

    const identityResult = await cognitoIdentity.getId(getIdParams).promise();
    const identityId = identityResult.IdentityId;

    // Get fresh credentials
    const credentialsParams = {
      IdentityId: identityId,
      Logins: {
        [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: IdToken
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
 * * Request Body:
 * {
 * email: string,
 * code: string
 * }
 */
router.post('/verify', async (req, res) => {
  try {
    // Initialize AWS services
    initializeAWSServices();
    
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
 * POST /api/auth/resend-confirmation
 * Resend verification code to user's email
 * 
 * Request Body:
 * {
 *   email: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   message: 'Verification code resent successfully'
 * }
 */
router.post('/resend-confirmation', async (req, res) => {
  try {
    // Initialize AWS services
    initializeAWSServices();
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Missing email',
        message: 'Email is required'
      });
    }

    console.log('📤 Resending verification code to:', email);

    const params = {
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email
    };

    await cognito.resendConfirmationCode(params).promise();

    console.log('✅ Verification code resent successfully to:', email);

    res.status(200).json({
      success: true,
      message: 'Verification code resent successfully. Please check your email.'
    });

  } catch (error) {
    console.error('❌ Resend confirmation error:', error);

    let errorMessage = 'Failed to resend verification code';
    let errorCode = 'RESEND_ERROR';
    let statusCode = 500;

    // Handle specific Cognito errors
    if (error.code === 'UserNotFoundException') {
      errorMessage = 'No user found with this email address.';
      statusCode = 404;
    } else if (error.code === 'InvalidParameterException') {
      errorMessage = 'Invalid email address format.';
      statusCode = 400;
    } else if (error.code === 'TooManyRequestsException') {
      errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
      statusCode = 429;
    } else if (error.code === 'NotAuthorizedException') {
      errorMessage = 'User is already confirmed. You can log in.';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      code: errorCode,
      error: error.code || 'ResendError',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/confirm
 * Confirm user signup with verification code
 * * This endpoint is called by the frontend when a user needs to verify their email.
 * It uses AWS Cognito's confirmSignUp method to activate the user account.
 * * Request Body:
 * {
 * email: string,           // User's email address
 * verificationCode: string  // 6-digit code from email
 * }
 * * Success Response (200 OK):
 * {
 * success: true,
 * message: 'Email verified successfully. You can now login.'
 * }
 * * Error Responses:
 * - 400 Bad Request (Missing fields)
 * - 400 Bad Request (Invalid code - CodeMismatchException)
 * - 400 Bad Request (Expired code - ExpiredCodeException)
 * - 400 Bad Request (Already confirmed - NotAuthorizedException)
 * - 404 Not Found (User not found - UserNotFoundException)
 */
router.post('/confirm', async (req, res) => {
  try {
    // Initialize AWS services
    initializeAWSServices();
    
    const { email, verificationCode } = req.body;

    console.log('✉️ ========== EMAIL CONFIRMATION ==========');
    console.log('📧 Email:', email);
    console.log('🔢 Verification Code:', verificationCode);

    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        error: 'Missing fields',
        message: 'Email and verification code are required'
      });
    }

    // Normalize email to lowercase (must match signup)
    const normalizedEmail = email.toLowerCase().trim();
    console.log('📧 Normalized email:', normalizedEmail);

    console.log('🔍 Calling Cognito confirmSignUp...');
    
    // Call Cognito confirmSignUp
    const params = {
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: normalizedEmail,
      ConfirmationCode: verificationCode
    };

    console.log('🔧 Confirm params:', { ClientId: params.ClientId, Username: params.Username });

    await cognito.confirmSignUp(params).promise();

    console.log('✅ Email confirmed successfully for:', normalizedEmail);
    console.log('🎉 User status is now: CONFIRMED');

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
      statusCode = 400;
    } else if (error.code === 'ExpiredCodeException') {
      errorMessage = 'Verification code has expired. Please request a new code.';
      statusCode = 400;
    } else if (error.code === 'NotAuthorizedException') {
      errorMessage = 'User is already confirmed.';
      statusCode = 400;
    } else if (error.code === 'UserNotFoundException') {
      errorMessage = 'User not found.';
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
