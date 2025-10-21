// AWS Service Helper Module
// Provides clean interfaces for AWS operations

const AWS = require('aws-sdk');

class AWSServices {
  constructor(dynamoDB, s3, cognito) {
    this.dynamoDB = dynamoDB;
    this.s3 = s3;
    this.cognito = cognito;
    this.tables = {
      users: process.env.DYNAMODB_USERS_TABLE || 'FixIt-Users',
      providers: process.env.DYNAMODB_PROVIDERS_TABLE || 'FixIt-Providers',
      jobs: process.env.DYNAMODB_JOBS_TABLE || 'FixIt-Jobs'
    };
    this.s3Bucket = process.env.S3_BUCKET || 'fixit-profile-images';
  }

  // ==================== DYNAMODB OPERATIONS ====================

  async getUser(userId, userType = 'user') {
    const tableName = userType === 'provider' ? this.tables.providers : this.tables.users;
    
    const params = {
      TableName: tableName,
      Key: { userId }
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
    const tableName = userType === 'provider' ? this.tables.providers : this.tables.users;
    
    const params = {
      TableName: tableName,
      Item: {
        userId,
        ...userData,
        updatedAt: new Date().toISOString()
      }
    };

    try {
      await this.dynamoDB.put(params).promise();
      return { success: true };
    } catch (error) {
      console.error('DynamoDB Put Error:', error);
      throw error;
    }
  }

  async updateUser(userId, updates, userType = 'user') {
    const tableName = userType === 'provider' ? this.tables.providers : this.tables.users;
    
    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((key, index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = updates[key];
    });

    const params = {
      TableName: tableName,
      Key: { userId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
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
}

module.exports = AWSServices;
