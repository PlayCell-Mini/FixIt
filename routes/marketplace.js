const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');

router.post('/hire', async (req, res) => {
  try {
    const { workerId, customerId, serviceType, description } = req.body;

    if (!workerId || !customerId || !serviceType || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'workerId, customerId, serviceType, and description are required'
      });
    }

    const payload = {
      worker_id: workerId,
      customer_id: customerId,
      service_type: serviceType,
      description,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data
    });
  } catch (error) {
    console.error('❌ Error creating service request:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create service request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/services', async (req, res) => {
  try {
    const { serviceType } = req.query;

    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'provider');

    if (serviceType) {
      query = query.eq('service_type', serviceType);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      count: Array.isArray(data) ? data.length : 0,
      data: data || [],
      filter: serviceType || null
    });
  } catch (error) {
    console.error('❌ Error fetching service providers:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch service providers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
