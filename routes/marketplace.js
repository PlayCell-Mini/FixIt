// Marketplace API Routes
const express = require('express');
const router = express.Router();

// Get AWS services from server
const awsServices = require('../server').awsServices;

/**
 * POST /api/hire
 * Create a new service request in MarketplaceUsers DynamoDB table
 * 
 * Request Body:
 * {
 *   workerId: string,
 *   customerId: string,
 *   serviceType: string,
 *   description: string
 * }
 */
router.post('/hire', async (req, res) => {
  try {
    const { workerId, customerId, serviceType, description } = req.body;

    // Validation
    if (!workerId || !customerId || !serviceType || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'workerId, customerId, serviceType, and description are required'
      });
    }

    // Validate serviceType
    const validServiceTypes = ['Plumber', 'Electrician', 'Carpenter', 'Painter', 'Welder'];
    if (!validServiceTypes.includes(serviceType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service type',
        message: `Service type must be one of: ${validServiceTypes.join(', ')}`
      });
    }

    console.log('📋 Creating service request:', { workerId, customerId, serviceType });

    // Create service request in DynamoDB
    const serviceRequest = await awsServices.createServiceRequest({
      workerId,
      customerId,
      serviceType,
      description
    });

    console.log('✅ Service request created:', serviceRequest.requestId);

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: serviceRequest
    });

  } catch (error) {
    console.error('❌ Error creating service request:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create service request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/services
 * Fetch all available service providers from MarketplaceUsers DynamoDB table
 * 
 * Query Parameters (optional):
 * - serviceType: Filter by service type (e.g., Plumber, Electrician)
 * 
 * Response:
 * {
 *   success: true,
 *   count: number,
 *   data: Array<ServiceProvider>
 * }
 */
router.get('/services', async (req, res) => {
  try {
    const { serviceType } = req.query;

    console.log('📋 Fetching service providers...', serviceType ? `Filter: ${serviceType}` : '');

    // Get all service providers from DynamoDB
    let serviceProviders = await awsServices.getAllServiceProviders();

    // Apply client-side filter if serviceType is provided
    if (serviceType) {
      serviceProviders = serviceProviders.filter(
        provider => provider.serviceType === serviceType
      );
      console.log(`🔍 Filtered to ${serviceProviders.length} ${serviceType}(s)`);
    }

    console.log(`✅ Found ${serviceProviders.length} service provider(s)`);

    res.status(200).json({
      success: true,
      count: serviceProviders.length,
      data: serviceProviders,
      filter: serviceType || null
    });

  } catch (error) {
    console.error('❌ Error fetching service providers:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch service providers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
