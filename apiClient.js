// Frontend API Client for FixIt Backend
// Clean, modern API client using fetch API

class APIClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL || window.location.origin;
  }

  /**
   * Generic request handler
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise<any>} - Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      ...options,
      headers: {
        ...options.headers
      }
    };

    // Add auth token if available
    const token = localStorage.getItem('idToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      console.log(`📡 API Request: ${options.method || 'GET'} ${endpoint}`);
      
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      console.log(`✅ API Response:`, data);
      return data;
      
    } catch (error) {
      console.error(`❌ API Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {object} params - Query parameters
   * @returns {Promise<any>}
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET'
    });
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @returns {Promise<any>}
   */
  async post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @returns {Promise<any>}
   */
  async put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<any>}
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  /**
   * Upload file
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @returns {Promise<any>}
   */
  async upload(endpoint, formData) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      method: 'POST',
      body: formData
      // Don't set Content-Type header, browser will set it with boundary
    };

    // Add auth token if available
    const token = localStorage.getItem('idToken');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }

    try {
      console.log(`📤 Upload Request: ${endpoint}`);
      
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Upload failed');
      }

      console.log(`✅ Upload Response:`, data);
      return data;
      
    } catch (error) {
      console.error(`❌ Upload Error (${endpoint}):`, error);
      throw error;
    }
  }

  // ==================== MARKETPLACE APIs ====================

  /**
   * Create service request (hire a provider)
   * @param {object} requestData - { workerId, customerId, serviceType, description }
   * @returns {Promise<any>}
   */
  async createServiceRequest(requestData) {
    return this.post('/api/hire', requestData);
  }

  /**
   * Get all service providers
   * @param {string} serviceType - Optional filter by service type
   * @returns {Promise<any>}
   */
  async getServiceProviders(serviceType = null) {
    const params = serviceType ? { serviceType } : {};
    return this.get('/api/services', params);
  }

  // ==================== FILE UPLOAD APIs ====================

  /**
   * Upload profile picture
   * @param {File} file - Image file
   * @param {string} userId - User ID
   * @returns {Promise<any>} - { fileUrl, key }
   */
  async uploadProfilePicture(file, userId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('fileType', 'profile');
    
    return this.upload('/api/upload', formData);
  }

  /**
   * Upload job photo
   * @param {File} file - Image file
   * @param {string} userId - User ID
   * @returns {Promise<any>} - { fileUrl, key }
   */
  async uploadJobPhoto(file, userId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('fileType', 'job');
    
    return this.upload('/api/upload', formData);
  }

  // ==================== HEALTH CHECK ====================

  /**
   * Health check endpoint
   * @returns {Promise<any>}
   */
  async healthCheck() {
    return this.get('/health');
  }
}

// Create and export singleton instance
const apiClient = new APIClient();

// Make available globally for browser
if (typeof window !== 'undefined') {
  window.APIClient = APIClient;
  window.apiClient = apiClient;
}
