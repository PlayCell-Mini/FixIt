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

  // Initialize AWS SDK (call this with temporary credentials from login)
  async initializeWithTemporaryCredentials(credentials) {
    try {
      if (!credentials || !credentials.accessKeyId || !credentials.secretAccessKey || !credentials.sessionToken) {
        throw new Error('Invalid temporary credentials provided');
      }

      console.log('⚙️ Initializing AWS SDK with temporary credentials...');
      console.log('⏰ Credentials expire at:', credentials.expiration);

      // Set temporary credentials from Cognito Identity Pool
      AWS.config.update({
        region: this.config.region,
        credentials: new AWS.Credentials({
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        })
      });

      // Initialize service clients with temporary credentials
      this.s3 = new AWS.S3({
        region: S3_CONFIG.region,
        params: { Bucket: S3_CONFIG.bucket }
      });

      this.dynamoDB = new AWS.DynamoDB.DocumentClient({
        region: this.config.region
      });

      // Store credentials expiration for refresh logic
      this.credentialsExpiration = new Date(credentials.expiration);
      this.initialized = true;

      console.log('✅ AWS Services initialized with temporary credentials');
      console.log('🔑 User has scoped access to S3 and DynamoDB');
      
      // Set up auto-refresh before expiration (5 minutes before)
      this.setupCredentialRefresh();
      
      return true;
    } catch (error) {
      console.error('❌ AWS Initialization Error:', error);
      throw new Error(`Failed to initialize AWS with temporary credentials: ${error.message}`);
    }
  }

  // Check if AWS is initialized
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('AWS Service not initialized. Please login first to get temporary credentials.');
    }

    // Check if credentials are expired
    if (this.credentialsExpiration && new Date() >= this.credentialsExpiration) {
      throw new Error('AWS credentials have expired. Please refresh your session.');
    }
  }

  /**
   * Setup automatic credential refresh
   */
  setupCredentialRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.credentialsExpiration) return;

    // Refresh 5 minutes before expiration
    const now = new Date();
    const expirationTime = new Date(this.credentialsExpiration);
    const refreshTime = new Date(expirationTime.getTime() - 5 * 60 * 1000);
    const timeUntilRefresh = refreshTime.getTime() - now.getTime();

    if (timeUntilRefresh > 0) {
      console.log(`🔄 Credentials will auto-refresh in ${Math.round(timeUntilRefresh / 60000)} minutes`);
      
      this.refreshTimer = setTimeout(async () => {
        console.log('🔄 Auto-refreshing AWS credentials...');
        await this.refreshCredentials();
      }, timeUntilRefresh);
    }
  }

  /**
   * Refresh AWS credentials
   */
  async refreshCredentials() {
    try {
      const idToken = localStorage.getItem('idToken');
      
      if (!idToken) {
        console.error('❌ No ID token found for refresh');
        this.signOut();
        window.location.href = 'login.html';
        return;
      }

      console.log('🔄 Refreshing credentials with backend API...');

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to refresh credentials');
      }

      // Re-initialize with new credentials
      await this.initializeWithTemporaryCredentials(data.awsCredentials);
      
      console.log('✅ Credentials refreshed successfully');

    } catch (error) {
      console.error('❌ Credential refresh failed:', error);
      this.signOut();
      window.location.href = 'login.html';
    }
  }

  /**
   * Get time until credentials expire
   */
  getTimeUntilExpiration() {
    if (!this.credentialsExpiration) return null;
    
    const now = new Date();
    const expiration = new Date(this.credentialsExpiration);
    return Math.max(0, expiration.getTime() - now.getTime());
  }

  /**
   * Check if credentials are about to expire (within 5 minutes)
   */
  areCredentialsExpiringSoon() {
    const timeLeft = this.getTimeUntilExpiration();
    return timeLeft !== null && timeLeft < 5 * 60 * 1000; // 5 minutes
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
   * Sign up new user (via backend API)
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {object} userData - Additional user data
   * @returns {Promise<object>} - Signup result
   */
  async signUp(email, password, userData = {}) {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          fullName: userData.fullName || '',
          role: userData.role || 'seeker',
          serviceType: userData.serviceType || null,
          address: userData.address || ''
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      console.log('✅ Sign up successful via backend API');
      return data;
    } catch (error) {
      console.error('❌ Sign Up Error:', error);
      throw error;
    }
  }

  /**
   * Sign in user and initialize with temporary credentials (via backend API)
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} - Authentication result with AWS credentials
   */
  async signIn(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      console.log('✅ Sign in successful via backend API');
      console.log('👤 User:', data.user);

      // Store tokens in localStorage
      localStorage.setItem('idToken', data.tokens.idToken);
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('identityId', data.identityId);
      
      // Store user data
      localStorage.setItem('userData', JSON.stringify(data.user));
      this.currentUser = data.user;

      // Initialize AWS SDK with temporary credentials
      await this.initializeWithTemporaryCredentials(data.awsCredentials);

      console.log('✅ AWS SDK initialized with scoped temporary credentials');
      
      return data;
    } catch (error) {
      console.error('❌ Sign In Error:', error);
      throw error;
    }
  }

  /**
   * Sign out user
   */
  signOut() {
    // Clear all stored tokens and credentials
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('identityId');
    localStorage.removeItem('userData');
    
    // Clear AWS credentials
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    this.currentUser = null;
    this.initialized = false;
    this.credentialsExpiration = null;
    
    console.log('✅ Sign out successful - all credentials cleared');
  }

  /**
   * Get current user from stored data
   * @returns {object|null} - User data
   */
  getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }

    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
      }
    }

    return null;
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
