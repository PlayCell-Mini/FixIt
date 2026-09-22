const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../supabaseClient');

async function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Object.assign(new Error('Access token required'), { status: 401 });
  }

  const accessToken = authHeader.replace('Bearer ', '').trim();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    throw Object.assign(new Error('Invalid access token'), { status: 401 });
  }

  return data.user;
}

router.post('/hire', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { workerId, providerId, serviceType, description } = req.body;
    const requestedProviderId = providerId || workerId;

    if (!requestedProviderId || !serviceType || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'providerId, serviceType, and description are required'
      });
    }

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', requestedProviderId)
      .eq('role', 'provider')
      .single();

    if (providerError || !provider) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider',
        message: 'The selected provider does not exist.'
      });
    }

    const payload = {
      provider_id: requestedProviderId,
      requester_id: user.id,
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
    return res.status(error.status || 500).json({
      success: false,
      error: error.status === 401 ? 'Unauthorized' : 'Internal server error',
      message: error.status === 401 ? 'Invalid access token' : 'Failed to create service request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/services', async (req, res) => {
  try {
    const { serviceType } = req.query;

    let query = supabaseAdmin
      .from('profiles')
      .select('id, full_name, service_type, profile_url')
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
