const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');

const placeholderValues = new Set([
  'https://your-project.supabase.co',
  'your-anon-key',
  'your-publishable-key',
  'your-service-role-key',
  'your-secret-key',
  'example',
  'changeme'
]);

function supabaseIsConfigured() {
  return ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
    .every((name) => {
      const value = String(process.env[name] || '').trim().toLowerCase();
      return value && !placeholderValues.has(value);
    });
}

function validateSignupBody(body) {
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  const fullName = String(body?.fullName || '').trim();
  const role = String(body?.role || '').trim();
  const address = String(body?.address || '').trim();
  const serviceType = String(body?.serviceType || body?.servicetype || '').trim();

  if (!email || !password || !fullName || !role || !address) {
    return { error: 'Email, password, full name, role, and address are required.' };
  }

  if (!['owner', 'provider'].includes(role)) {
    return { error: 'Role must be either "owner" or "provider".' };
  }

  if (role === 'provider' && !serviceType) {
    return { error: 'Service type is required for providers.' };
  }

  return { email, password, fullName, role, address, serviceType };
}

router.post('/signup', async (req, res) => {
  try {
    if (!supabaseIsConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'SUPABASE_NOT_CONFIGURED',
        message: 'Supabase is not configured. Add the real project URL and keys in Vercel environment variables.'
      });
    }

    const validated = validateSignupBody(req.body);
    if (validated.error) {
      return res.status(400).json({ success: false, code: 'MISSING_FIELDS', message: validated.error });
    }

    const { email, password, fullName, role, address, serviceType } = validated;
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          address,
          service_type: role === 'provider' ? serviceType : null
        }
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        code: error.name || 'SUPABASE_SIGNUP_ERROR',
        message: error.message || 'Supabase signup failed.'
      });
    }

    if (data.user) {
      const profilePayload = {
        id: data.user.id,
        email,
        full_name: fullName,
        role,
        address,
        service_type: role === 'provider' ? serviceType : null,
        created_at: new Date().toISOString()
      };

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        console.warn('Supabase profile insert warning:', profileError.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      requiresConfirmation: !data.user?.email_confirmed_at,
      data: {
        userId: data.user?.id || null,
        email,
        userConfirmed: !!data.user?.email_confirmed_at
      }
    });
  } catch (error) {
    console.error('SUPABASE SIGNUP ERROR:', error);
    return res.status(500).json({
      success: false,
      code: 'SIGNUP_FAILED',
      message: error.message || 'Failed to register user.'
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Email and password are required.'
      });
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({
        success: false,
        code: error.name || 'SUPABASE_LOGIN_ERROR',
        message: error.message || 'Invalid email or password.'
      });
    }

    const user = data.user;
    const session = data.session;
    const metadata = user?.user_metadata || {};

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      tokens: {
        idToken: session?.access_token || '',
        accessToken: session?.access_token || '',
        refreshToken: session?.refresh_token || ''
      },
      user: {
        userId: user?.id,
        email: user?.email,
        role: metadata.role || 'owner',
        serviceType: metadata.service_type || null,
        name: metadata.full_name || ''
      },
      awsCredentials: null,
      identityId: null
    });
  } catch (error) {
    console.error('SUPABASE LOGIN ERROR:', error);
    return res.status(500).json({
      success: false,
      code: 'LOGIN_FAILED',
      message: error.message || 'Failed to login.'
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken || req.body?.refresh_token || null;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing token',
        message: 'Refresh token is required.'
      });
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session) {
      throw error || new Error('Failed to refresh session');
    }

    return res.status(200).json({
      success: true,
      message: 'Session refreshed successfully.',
      tokens: {
        idToken: data.session.access_token,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      }
    });
  } catch (error) {
    console.error('SUPABASE REFRESH ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error?.code || 'RefreshError',
      message: 'Failed to refresh session.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Missing fields',
        message: 'Email and verification code are required.'
      });
    }

    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      email,
      token: code,
      type: 'signup'
    });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.',
      data
    });
  } catch (error) {
    console.error('SUPABASE VERIFY ERROR:', error);
    return res.status(400).json({
      success: false,
      error: error?.code || 'VerificationError',
      message: error.message || 'Failed to verify email.'
    });
  }
});

router.post('/resend-confirmation', async (req, res) => {
  try {
    if (!supabaseIsConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'SUPABASE_NOT_CONFIGURED',
        message: 'Supabase is not configured. Add the real project URL and keys in Vercel environment variables.'
      });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Missing email',
        message: 'Email is required.'
      });
    }

    const { error } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email
    });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code resent successfully. Please check your email.'
    });
  } catch (error) {
    console.error('SUPABASE RESEND ERROR:', error);
    return res.status(400).json({
      success: false,
      error: error?.code || 'ResendError',
      message: error.message || 'Failed to resend verification code.'
    });
  }
});

router.post('/confirm', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const verificationCode = String(req.body?.verificationCode || '').trim();

    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        error: 'Missing fields',
        message: 'Email and verification code are required.'
      });
    }

    const { error } = await supabaseAdmin.auth.verifyOtp({
      email,
      token: verificationCode,
      type: 'signup'
    });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.'
    });
  } catch (error) {
    console.error('SUPABASE CONFIRM ERROR:', error);
    return res.status(400).json({
      success: false,
      code: error?.code || 'ConfirmationError',
      error: error?.code || 'ConfirmationError',
      message: error.message || 'Failed to confirm email.'
    });
  }
});

module.exports = router;
