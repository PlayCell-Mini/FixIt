require('dotenv').config({ path: '.env.local' });
const express = require('express');
const path = require('path');
const { supabase, supabaseAdmin } = require('./supabaseClient');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

const supabaseRequiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const placeholderValues = new Set([
  'https://your-project.supabase.co',
  'your-anon-key',
  'your-service-role-key',
  'example',
  'changeme'
]);

const isConfigured = (value) => !!value && !placeholderValues.has(String(value).trim().toLowerCase());
const supabaseIsConfigured = supabaseRequiredEnvVars.every((varName) => isConfigured(process.env[varName]));

if (!supabaseIsConfigured) {
  console.warn('⚠️ Supabase environment variables are not fully configured. Add them to .env to enable Supabase auth/data features.');
} else {
  console.log('✅ Supabase configuration detected.');
}

module.exports = {
  supabase,
  supabaseAdmin,
  supabaseIsConfigured
};

// API Routes
const authRoutes = require('./routes/auth');
const marketplaceRoutes = require('./routes/marketplace');
const uploadRoutes = require('./routes/upload');
const profileRoutes = require('./routes/profile');

app.use('/api/auth', authRoutes);
app.use('/api', marketplaceRoutes);
app.use('/api', uploadRoutes);
app.use('/api', profileRoutes);

// Serve index.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      supabase: supabaseIsConfigured ? 'connected' : 'not-configured'
    }
  });
});

// 404 handler for API routes - return JSON instead of HTML
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `API endpoint ${req.originalUrl} not found`,
    availableEndpoints: [
      '/api/auth/signup',
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/auth/verify',
      '/api/hire',
      '/api/services',
      '/api/upload',
      '/api/profile/details',
      '/api/profile/update',
      '/health'
    ]
  });
});

// Global error handler - ensure all errors return JSON for API routes
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  
  // For API routes, always return JSON
  if (req.path.startsWith('/api')) {
    // CRITICAL: Unconditional return of 500 status JSON response to prevent HTML error pages
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error during data processing.',
      code: 'API_REQUEST_FAILED',
      error: err.name || 'ServerError',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
  
  // For non-API routes, you can serve error pages
  res.status(err.status || 500).send('Server Error');
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 FixIt Service Marketplace Server');
  console.log('='.repeat(50));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50) + '\n');
});
