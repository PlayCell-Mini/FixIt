// AWS Service Helper Module
// Provides clean interfaces for AWS operations

const AWS = require('aws-sdk');

class AWSServices {
  constructor(dynamoDB, s3, cognito, cognitoIdentity) {
    this.dynamoDB = dynamoDB;
    this.s3 = s3;
    this.cognito = cognito;
    this.cognitoIdentity = cognitoIdentity;
    this.tables = {
      users: process.env.DYNAMODB_USERS_TABLE || 'FixIt',
      providers: process.env.DYNAMODB_PROVIDERS_TABLE || 'FixIt',
      jobs: process.env.DYNAMODB_JOBS_TABLE || 'FixIt',
      marketplaceUsers: process.env.DYNAMODB_MARKETPLACE_USERS_TABLE || 'FixIt'
    };
    this.s3Bucket = process.env.S3_BUCKET || 'fixit-profile-images';
    
    // DIAGNOSTIC: Log AWS configuration
    console.log('🔧 AWS Services Configuration:', {
      region: process.env.AWS_REGION,
      tables: this.tables,
      s3Bucket: this.s3Bucket
    });
  }

  // ==================== DYNAMODB OPERATIONS ====================

  async getUser(userId, userType = 'user') {
    const tableName = this.tables.users;
    const pk = userType === 'provider' ? `PROVIDER#${userId}` : `USER#${userId}`;
    
    const params = {
      TableName: tableName,
      Key: { PK: pk }
    };

    try {
      const result = await this.dynamoDB.get(params).promise();
      return result.Item || null;
    } catch (error) {
      console.error('DynamoDB Get Error:', error);
      throw error;
    }
  }

  async saveUser(userId, userData, userType = 'user') {
    // CRITICAL CHECK: Ensure userId is valid
    if (!userId || userId.trim() === '') {
      throw new Error('Invalid userId: userId is required and cannot be empty');
    }

    const tableName = this.tables.users;
    // Use the correct userType mapping: 'provider' for providers, 'owner' for owners
    const pk = userType === 'provider' ? `PROVIDER#${userId}` : `USER#${userId}`;
    
    // CRITICAL CHECK: Ensure PK is valid
    if (!pk || pk.trim() === '') {
      throw new Error('Invalid PK: Partition Key cannot be empty');
    }
    
    // DIAGNOSTIC: Log the PK construction
    console.log('🔑 Constructing PK:', { userType, userId, pk });
    
    // Ensure we have proper partition key and add sort key for single-table design
    const item = {
      PK: pk,              // Partition Key
      SK: 'PROFILE#INFO',  // Sort Key - consistent for profile data
      userId: userId,      // Add userId as a separate field
      UserID: userId,      // Add UserID to satisfy DynamoDB schema requirements
      userType: userType,  // This will be 'owner' or 'provider'
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // For providers, ensure we have the right structure
    if (userType === 'provider') {
      item.providerId = userId;
    }

    const params = {
      TableName: tableName,
      Item: item
    };

    // DIAGNOSTIC: Log the exact params being sent to DynamoDB
    console.log('🔍 DynamoDB Put Params:', JSON.stringify(params, null, 2));
    
    // CRITICAL CHECK: Validate the item structure before sending to DynamoDB
    if (!params.Item.PK || params.Item.PK.trim() === '') {
      throw new Error('Invalid DynamoDB Item: PK is required and cannot be empty');
    }
    
    if (!params.TableName || params.TableName.trim() === '') {
      throw new Error('Invalid DynamoDB Params: TableName is required and cannot be empty');
    }

    try {
      console.log('🔄 Attempting DynamoDB Put Operation...');
      await this.dynamoDB.put(params).promise();
      console.log('✅ DynamoDB Put Success');
      return { success: true };
    } catch (error) {
      console.error('❌ DynamoDB Put Error:', error);
      // More detailed error logging
      console.error('❌ DynamoDB Put Error Details:', {
        code: error.code,
        message: error.message,
        tableName: params.TableName,
        itemPK: params.Item.PK,
        itemSK: params.Item.SK,
        region: process.env.AWS_REGION
      });
      // Re-throw the error with more context
      throw new Error(`DynamoDB Put Failed: ${error.code || 'UnknownError'} - ${error.message} - Table: ${params.TableName} - PK: ${params.Item.PK}`);
    }
  }

  async updateUser(userId, updates, userType = 'user') {
    const tableName = this.tables.users;
    const pk = userType === 'provider' ? `PROVIDER#${userId}` : `USER#${userId}`;
    
    // Build update expression
    const updateExpressions = ['SET updatedAt = :updatedAt'];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {
      ':updatedAt': new Date().toISOString()
    };

    Object.keys(updates).forEach((key, index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = updates[key];
    });

    const params = {
      TableName: tableName,
      Key: { PK: pk },
      UpdateExpression: updateExpressions.join(', '),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    try {
      const result = await this.dynamoDB.update(params).promise();
      return result.Attributes;
    } catch (error) {
      console.error('DynamoDB Update Error:', error);
      throw error;
    }
  }

  // ==================== S3 OPERATIONS ====================

  async uploadFile(file, key) {
    const params = {
      Bucket: this.s3Bucket,
      Key: key,
      Body: file,
      ContentType: file.mimetype || 'application/octet-stream',
      ACL: 'public-read'
    };

    try {
      const result = await this.s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      console.error('S3 Upload Error:', error);
      throw error;
    }
  }

  async uploadProfilePicture(userId, file) {
    const key = `profilePhotos/${userId}/profile.jpg`;
    return await this.uploadFile(file, key);
  }

  async getSignedUrl(key, expiresIn = 3600) {
    const params = {
      Bucket: this.s3Bucket,
      Key: key,
      Expires: expiresIn
    };

    try {
      return await this.s3.getSignedUrlPromise('getObject', params);
    } catch (error) {
      console.error('S3 Signed URL Error:', error);
      throw error;
    }
  }

  // ==================== COGNITO OPERATIONS ====================

  async signUp(email, password, attributes = {}) {
    const params = {
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: Object.keys(attributes).map(key => ({
        Name: key,
        Value: attributes[key]
      }))
    };

    try {
      return await this.cognito.signUp(params).promise();
    } catch (error) {
      console.error('Cognito Sign Up Error:', error);
      throw error;
    }
  }

  async signIn(email, password) {
    const params = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    };

    try {
      return await this.cognito.initiateAuth(params).promise();
    } catch (error) {
      console.error('Cognito Sign In Error:', error);
      throw error;
    }
  }

  // ==================== MARKETPLACE OPERATIONS ====================

  async createServiceRequest(requestData) {
    const { workerId, customerId, serviceType, description } = requestData;
    
    // Use the single table with a different PK pattern for service requests
    const item = {
      PK: `REQUEST#${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workerId,
      customerId,
      serviceType,
      description,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const params = {
      TableName: this.tables.marketplaceUsers,
      Item: item
    };

    try {
      await this.dynamoDB.put(params).promise();
      return item;
    } catch (error) {
      console.error('DynamoDB Create Service Request Error:', error);
      throw error;
    }
  }

  async getAllServiceProviders() {
    // Scan for items with PK starting with PROVIDER#
    const params = {
      TableName: this.tables.marketplaceUsers,
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': 'PROVIDER#'
      }
    };

    try {
      const result = await this.dynamoDB.scan(params).promise();
      return result.Items || [];
    } catch (error) {
      console.error('DynamoDB Get Service Providers Error:', error);
      throw error;
    }
  }
}

module.exports = AWSServices;