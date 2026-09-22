// API Routes for FixIt Service Marketplace
const express = require('express');
const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Expose non-secret Supabase configuration status only.
router.get('/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || null,
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'profile-pictures'
  });
});

module.exports = router;
