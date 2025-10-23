// Profile API Routes
const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');

// Get AWS services from server
let dynamoDB, cognito;
setTimeout(() => {
  dynamoDB = require('../server').dynamoDB;
  cognito = require('../server').cognito;
}, 100);

// Helper function to extract user ID from access token
const getUserIdFromToken = async (accessToken) => {
  try {
    const userResult = await cognito.getUser({
      AccessToken: accessToken
    }).promise();
    
    return userResult.Username;
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

// Helper function to get user role from access token
const getUserRoleFromToken = async (accessToken) => {
  try {
    const userResult = await cognito.getUser({
      AccessToken: accessToken
    }).promise();
    
    // Extract custom attributes
    const attributes = {};
    userResult.UserAttributes.forEach(attr => {
      attributes[attr.Name] = attr.Value;
    });
    
    return attributes['custom:role'] || 'owner';
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

/**
 * GET /api/profile/details
 * Fetch user profile details from DynamoDB
 * 
 * Headers:
 * - Authorization: Bearer <access_token>
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     userId: string,
 *     email: string,
 *     fullName: string,
 *     address: string,
 *     profileURL: string (optional),
 *     role: string,
 *     // For providers only:
 *     serviceType: string (optional),
 *     experience: string (optional),
 *     dailyRate: number (optional),
 *     hourlyRate: number (optional)
 *   }
 * }
 */
router.get('/profile/details', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Access token required'
      });
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Get user ID and role from token
    const userId = await getUserIdFromToken(accessToken);
    const role = await getUserRoleFromToken(accessToken);
    
    console.log(`📋 Fetching profile for user: ${userId}, role: ${role}`);

    // Use single table with partition key approach
    const tableName = process.env.DYNAMODB_USERS_TABLE || 'FixIt';
    const pk = role === 'provider' ? `PROVIDER#${userId}` : `USER#${userId}`;

    // Get user data from DynamoDB
    const params = {
      TableName: tableName,
      Key: {
        PK: pk
      }
    };

    const result = await dynamoDB.get(params).promise();
    
    if (!result.Item) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User profile not found'
      });
    }

    console.log('✅ Profile fetched successfully');

    res.status(200).json({
      success: true,
      data: result.Item
    });

  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    
    if (error.message === 'Invalid access token') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid access token'
      });
    }
    
    // Ensure consistent JSON response even in case of errors
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/profile/update
 * Update user profile details in DynamoDB
 * 
 * Headers:
 * - Authorization: Bearer <access_token>
 * 
 * Request Body:
 * {
 *   fullName: string,
 *   address: string,
 *   profileURL: string (optional),
 *   // For providers only:
 *   serviceType: string (optional),
 *   experience: string (optional),
 *   dailyRate: number (optional),
 *   hourlyRate: number (optional)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   message: 'Profile updated successfully'
 * }
 */
router.post('/profile/update', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Access token required'
      });
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    const updateData = req.body;
    
    // Get user ID and role from token
    const userId = await getUserIdFromToken(accessToken);
    const role = await getUserRoleFromToken(accessToken);
    
    console.log(`💾 Updating profile for user: ${userId}, role: ${role}`, updateData);

    // Validate required fields
    if (!updateData.fullName || !updateData.address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'fullName and address are required'
      });
    }

    // Use single table with partition key approach
    const tableName = process.env.DYNAMODB_USERS_TABLE || 'FixIt';
    const pk = role === 'provider' ? `PROVIDER#${userId}` : `USER#${userId}`;

    // Build update expression
    const updateExpressions = ['SET updatedAt = :updatedAt'];
    const expressionAttributeNames = {
      '#updatedAt': 'updatedAt'
    };
    const expressionAttributeValues = {
      ':updatedAt': new Date().toISOString()
    };

    // Always update these fields
    const fieldsToUpdate = ['fullName', 'address', 'profileURL'];
    
    // Add provider-specific fields if role is provider
    if (role === 'provider') {
      fieldsToUpdate.push('serviceType', 'experience', 'dailyRate', 'hourlyRate');
    }

    fieldsToUpdate.forEach((field, index) => {
      if (updateData[field] !== undefined) {
        const placeholder = `#field${index}`;
        const valuePlaceholder = `:value${index}`;
        updateExpressions.push(`${placeholder} = ${valuePlaceholder}`);
        expressionAttributeNames[placeholder] = field;
        expressionAttributeValues[valuePlaceholder] = updateData[field];
      }
    });

    // Update user data in DynamoDB
    const params = {
      TableName: tableName,
      Key: {
        PK: pk
      },
      UpdateExpression: updateExpressions.join(', '),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'UPDATED_NEW'
    };

    const result = await dynamoDB.update(params).promise();
    
    console.log('✅ Profile updated successfully', result.Attributes);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    
    if (error.message === 'Invalid access token') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid access token'
      });
    }
    
    // Ensure consistent JSON response even in case of errors
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;