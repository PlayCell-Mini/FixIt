// AWS Configuration for FixIt Application
// Browser-compatible version using AWS SDK v3

// AWS Configuration
const AWS_CONFIG = {
  region: 'ap-south-1', // Your AWS region
  credentials: {
    accessKeyId: '', // Will be set from environment or config
    secretAccessKey: '' // Will be set from environment or config
  }
};

// S3 Configuration
const S3_CONFIG = {
  bucket: 'fixit-profile-images', // Your S3 bucket name
  region: 'ap-south-1'
};

// DynamoDB Configuration
const DYNAMODB_CONFIG = {
  tables: {
    users: 'FixIt-Users',
    providers: 'FixIt-Providers',
    jobs: 'FixIt-Jobs'
  }
};

// Cognito Configuration (for authentication)
const COGNITO_CONFIG = {
  userPoolId: 'ap-south-1_XXXXXXXXX', // Replace with your User Pool ID
  clientId: 'your-client-id-here', // Replace with your App Client ID
  region: 'ap-south-1'
};

// AWS Service Wrapper Class
class AWSService {
  constructor() {
    this.initialized = false;
    this.currentUser = null;
    this.config = {
      s3: S3_CONFIG,
      dynamoDB: DYNAMODB_CONFIG,
      cognito: COGNITO_CONFIG,
      region: AWS_CONFIG.region
    };
  }

  // Initialize AWS SDK (call this after loading AWS SDK scripts)
  async initialize(accessKeyId, secretAccessKey) {
    try {
      // Set credentials
      AWS.config.update({
        region: AWS_CONFIG.region,
        credentials: new AWS.Credentials({
          accessKeyId: accessKeyId || AWS_CONFIG.credentials.accessKeyId,
          secretAccessKey: secretAccessKey || AWS_CONFIG.credentials.secretAccessKey
        })
      });

      // Initialize service clients
      this.s3 = new AWS.S3({
        region: S3_CONFIG.region,
        params: { Bucket: S3_CONFIG.bucket }
      });

      this.dynamoDB = new AWS.DynamoDB.DocumentClient({
        region: AWS_CONFIG.region
      });

      this.cognito = new AWS.CognitoIdentityServiceProvider({
        region: COGNITO_CONFIG.region
      });

      this.initialized = true;
      console.log('✅ AWS Services initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ AWS Initialization Error:', error);
      throw new Error(`Failed to initialize AWS: ${error.message}`);
    }
  }

  // Check if AWS is initialized
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Call initialize() first.');
    }
  }

  // ==================== S3 OPERATIONS ====================

  /**
   * Upload file to S3
   * @param {File} file - File object to upload
   * @param {string} key - S3 object key (path)
   * @returns {Promise<string>} - S3 object URL
   */
  async uploadToS3(file, key) {
    this.ensureInitialized();
    
    try {
      console.log(`📤 Uploading to S3: ${key}`);
      
      const params = {
        Bucket: S3_CONFIG.bucket,
        Key: key,
        Body: file,
        ContentType: file.type,
        ACL: 'public-read' // Make images publicly accessible
      };

      const result = await this.s3.upload(params).promise();
      console.log('✅ Upload successful:', result.Location);
      
      return result.Location; // Returns public URL
    } catch (error) {
      console.error('❌ S3 Upload Error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Get signed URL for private S3 objects
   * @param {string} key - S3 object key
   * @param {number} expiresIn - URL expiration in seconds (default 1 hour)
   * @returns {Promise<string>} - Signed URL
   */
  async getSignedUrl(key, expiresIn = 3600) {
    this.ensureInitialized();
    
    try {
      const params = {
        Bucket: S3_CONFIG.bucket,
        Key: key,
        Expires: expiresIn
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      console.error('❌ Get Signed URL Error:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Upload profile picture to S3
   * @param {File} file - Image file
   * @param {string} userId - User ID
   * @returns {Promise<string>} - Image URL
   */
  async uploadProfilePicture(file, userId) {
    const key = `profilePhotos/${userId}/profile.jpg`;
    return await this.uploadToS3(file, key);
  }

  // ==================== DYNAMODB OPERATIONS ====================

  /**
   * Get item from DynamoDB
   * @param {string} tableName - Table name
   * @param {string} userId - User ID (primary key)
   * @returns {Promise<object>} - Item data
   */
  async getItem(tableName, userId) {
    this.ensureInitialized();
    
    try {
      const params = {
        TableName: tableName,
        Key: { userId }
      };

      const result = await this.dynamoDB.get(params).promise();
      return result.Item || null;
    } catch (error) {
      console.error('❌ DynamoDB Get Error:', error);
      throw new Error(`Failed to get item: ${error.message}`);
    }
  }

  /**
   * Put item to DynamoDB (create or replace)
   * @param {string} tableName - Table name
   * @param {object} item - Item object (must include userId)
   * @returns {Promise<void>}
   */
  async putItem(tableName, item) {
    this.ensureInitialized();
    
    try {
      const params = {
        TableName: tableName,
        Item: item
      };

      await this.dynamoDB.put(params).promise();
      console.log('✅ DynamoDB Put successful');
    } catch (error) {
      console.error('❌ DynamoDB Put Error:', error);
      throw new Error(`Failed to put item: ${error.message}`);
    }
  }

  /**
   * Update item in DynamoDB
   * @param {string} tableName - Table name
   * @param {string} userId - User ID
   * @param {object} updates - Update object
   * @returns {Promise<object>} - Updated item
   */
  async updateItem(tableName, userId, updates) {
    this.ensureInitialized();
    
    try {
      // Build update expression dynamically
      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      Object.keys(updates).forEach((field, index) => {
        const placeholder = `#field${index}`;
        const valuePlaceholder = `:value${index}`;
        updateExpressions.push(`${placeholder} = ${valuePlaceholder}`);
        expressionAttributeNames[placeholder] = field;
        expressionAttributeValues[valuePlaceholder] = updates[field];
      });

      const params = {
        TableName: tableName,
        Key: { userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const result = await this.dynamoDB.update(params).promise();
      console.log('✅ DynamoDB Update successful');
      return result.Attributes;
    } catch (error) {
      console.error('❌ DynamoDB Update Error:', error);
      throw new Error(`Failed to update item: ${error.message}`);
    }
  }

  /**
   * Query items from DynamoDB
   * @param {string} tableName - Table name
   * @param {object} queryParams - Query parameters
   * @returns {Promise<Array>} - Array of items
   */
  async queryItems(tableName, queryParams) {
    this.ensureInitialized();
    
    try {
      const params = {
        TableName: tableName,
        ...queryParams
      };

      const result = await this.dynamoDB.query(params).promise();
      return result.Items || [];
    } catch (error) {
      console.error('❌ DynamoDB Query Error:', error);
      throw new Error(`Failed to query items: ${error.message}`);
    }
  }

  /**
   * Scan table (use sparingly - expensive operation)
   * @param {string} tableName - Table name
   * @param {object} scanParams - Scan parameters
   * @returns {Promise<Array>} - Array of items
   */
  async scanTable(tableName, scanParams = {}) {
    this.ensureInitialized();
    
    try {
      const params = {
        TableName: tableName,
        ...scanParams
      };

      const result = await this.dynamoDB.scan(params).promise();
      return result.Items || [];
    } catch (error) {
      console.error('❌ DynamoDB Scan Error:', error);
      throw new Error(`Failed to scan table: ${error.message}`);
    }
  }

  // ==================== USER PROFILE HELPERS ====================

  /**
   * Get user profile from DynamoDB
   * @param {string} userId - User ID
   * @param {string} userType - 'user' or 'provider'
   * @returns {Promise<object>} - User data
   */
  async getUserProfile(userId, userType = 'user') {
    const tableName = userType === 'provider' 
      ? DYNAMODB_CONFIG.tables.providers 
      : DYNAMODB_CONFIG.tables.users;
    
    return await this.getItem(tableName, userId);
  }

  /**
   * Update user profile in DynamoDB
   * @param {string} userId - User ID
   * @param {object} updates - Update object
   * @param {string} userType - 'user' or 'provider'
   * @returns {Promise<object>} - Updated user data
   */
  async updateUserProfile(userId, updates, userType = 'user') {
    const tableName = userType === 'provider' 
      ? DYNAMODB_CONFIG.tables.providers 
      : DYNAMODB_CONFIG.tables.users;
    
    // Add updatedAt timestamp
    updates.updatedAt = new Date().toISOString();
    
    return await this.updateItem(tableName, userId, updates);
  }

  /**
   * Save user profile (create or replace)
   * @param {string} userId - User ID
   * @param {object} userData - Complete user data
   * @param {string} userType - 'user' or 'provider'
   * @returns {Promise<void>}
   */
  async saveUserProfile(userId, userData, userType = 'user') {
    const tableName = userType === 'provider' 
      ? DYNAMODB_CONFIG.tables.providers 
      : DYNAMODB_CONFIG.tables.users;
    
    // Ensure userId and timestamps are set
    userData.userId = userId;
    userData.updatedAt = new Date().toISOString();
    
    if (!userData.createdAt) {
      userData.createdAt = new Date().toISOString();
    }
    
    return await this.putItem(tableName, userData);
  }

  // ==================== COGNITO AUTHENTICATION ====================

  /**
   * Sign up new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {object} attributes - Additional attributes
   * @returns {Promise<object>} - Signup result
   */
  async signUp(email, password, attributes = {}) {
    this.ensureInitialized();
    
    try {
      const params = {
        ClientId: COGNITO_CONFIG.clientId,
        Username: email,
        Password: password,
        UserAttributes: Object.keys(attributes).map(key => ({
          Name: key,
          Value: attributes[key]
        }))
      };

      const result = await this.cognito.signUp(params).promise();
      console.log('✅ Sign up successful');
      return result;
    } catch (error) {
      console.error('❌ Sign Up Error:', error);
      throw error;
    }
  }

  /**
   * Sign in user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} - Authentication result
   */
  async signIn(email, password) {
    this.ensureInitialized();
    
    try {
      const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CONFIG.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      };

      const result = await this.cognito.initiateAuth(params).promise();
      
      // Store tokens
      if (result.AuthenticationResult) {
        localStorage.setItem('accessToken', result.AuthenticationResult.AccessToken);
        localStorage.setItem('idToken', result.AuthenticationResult.IdToken);
        localStorage.setItem('refreshToken', result.AuthenticationResult.RefreshToken);
      }
      
      console.log('✅ Sign in successful');
      return result;
    } catch (error) {
      console.error('❌ Sign In Error:', error);
      throw error;
    }
  }

  /**
   * Sign out user
   */
  signOut() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
    this.currentUser = null;
    console.log('✅ Sign out successful');
  }

  /**
   * Get current user from token
   * @returns {object|null} - Decoded user data
   */
  getCurrentUser() {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) return null;

    try {
      // Decode JWT token (simple base64 decode)
      const payload = idToken.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return {
        userId: decoded.sub,
        email: decoded.email,
        ...decoded
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!localStorage.getItem('idToken');
  }
}

// Create and export singleton instance
const awsService = new AWSService();

// Make available globally for browser
if (typeof window !== 'undefined') {
  window.AWSService = AWSService;
  window.awsService = awsService;
}
