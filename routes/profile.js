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

router.get('/profile/details', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'User profile not found'
        });
      }
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      error: status === 401 ? 'Unauthorized' : 'Internal server error',
      message: status === 401 ? 'Invalid access token' : 'Failed to fetch profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post('/profile/update', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const payload = req.body || {};

    const fullName = payload.fullName || payload.full_name || null;
    const address = payload.address || null;
    const profileUrl = payload.profileURL || payload.profile_url || null;
    const serviceType = payload.serviceType || payload.service_type || null;

    if (!fullName || !address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'fullName and address are required'
      });
    }

    const updatePayload = {
      full_name: fullName,
      address,
      profile_url: profileUrl,
      service_type: serviceType,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data
    });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      error: status === 401 ? 'Unauthorized' : 'Internal server error',
      message: status === 401 ? 'Invalid access token' : 'Failed to update profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
