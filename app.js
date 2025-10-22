// Signup Button Handler
// ==================== GLOBAL AUTH CHECK ====================
// CRITICAL: Redirect authenticated users immediately before any other code runs
(function() {
  // Check if we're on a page that requires auth redirect
  const currentPage = window.location.pathname.split('/').pop();
  const publicPages = ['login.html', 'signup.html', 'index.html', ''];
  
  // Only run on public pages (index.html)
  if (publicPages.includes(currentPage)) {
    const accessToken = localStorage.getItem('accessToken');
    const idToken = localStorage.getItem('idToken');
    const userDataStr = localStorage.getItem('userData');
    
    if (accessToken && idToken && userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        const role = userData.role;
        
        console.log('🔐 User already authenticated! Role:', role);
        console.log('➡️ Redirecting to dashboard...');
        
        // Immediate role-based redirect using replace() to prevent back button loop
        if (role === 'owner') {
          window.location.replace('owner-dashboard.html');
        } else if (role === 'provider') {
          window.location.replace('provider-dashboard.html');
        } else {
          // Fallback for seeker or any other role
          window.location.replace('owner-dashboard.html');
        }
        
        // Stop execution
        throw new Error('Redirecting...');
      } catch (e) {
        if (e.message !== 'Redirecting...') {
          console.error('Auth check error:', e);
          localStorage.clear();
        }
      }
    }
  }
})();

// ==================== LOGIN FORM HANDLER ====================

document.getElementById("signup-btn").addEventListener("click", async () => {
  const email = document.getElementById("email-input").value.trim();
  const password = document.getElementById("password-input").value;
  const address = document.getElementById("address-input").value.trim();
  const outputElement = document.getElementById("output");

  // Validation
  if (!email || !password) {
    outputElement.innerHTML = "<p style='color: red;'>Please enter both email and password</p>";
    return;
  }

  // Validate address is provided (required by Cognito)
  if (!address) {
    outputElement.innerHTML = "<p style='color: red;'>⚠️ Please fill in the address before proceeding. Address is required for sign-up.</p>";
    return;
  }

  try {
    // Show loading state
    outputElement.innerHTML = "<p>Signing up...</p>";

    // Make POST request to signup endpoint
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password,
        fullName: email.split('@')[0], // Use email username as default name
        role: 'seeker', // Default role
        address: address // Include address attribute
      })
    });

    // New safer response reading logic
    const contentType = response.headers.get('content-type');
    let data = {};
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        // If server sends HTML/text, we catch the error here.
        const errorText = await response.text();
        throw new Error('Server sent invalid response format (HTML). Status: ' + response.status + ' - Check Server Logs.');
    }

    if (response.ok && data.success) {
      // Success - show verification message
      outputElement.innerHTML = `<p style='color: green;'>✅ Success! Check your email for verification code.</p>`;
      console.log('Signup successful:', data);
    } else {
      // Error response from server
      outputElement.innerHTML = `<p style='color: red;'>❌ Error: ${data.message || 'Signup failed'}</p>`;
      console.error('Signup error:', data);
    }
  } catch (error) {
    // Network or other error
    outputElement.innerHTML = `<p style='color: red;'>❌ Error: ${error.message}</p>`;
    console.error('Signup error:', error);
  }
});

// Login Button Handler
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("email-input").value.trim();
  const password = document.getElementById("password-input").value;
  const outputElement = document.getElementById("output");

  // Validation
  if (!email || !password) {
    outputElement.innerHTML = "<p style='color: red;'>Please enter both email and password</p>";
    return;
  }

  try {
    // Show loading state
    outputElement.innerHTML = "<p>Logging in...</p>";

    // Make POST request to login endpoint
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    // New safer response reading logic
    const contentType = response.headers.get('content-type');
    let data = {};
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        // If server sends HTML/text, we catch the error here.
        const errorText = await response.text();
        throw new Error('Server sent invalid response format (HTML). Status: ' + response.status + ' - Check Server Logs.');
    }

    if (response.ok && data.success) {
      // Success - save tokens to localStorage
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('idToken', data.tokens.idToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('userData', JSON.stringify(data.user));
      
      // Save AWS temporary credentials for S3 and DynamoDB access
      if (data.awsCredentials) {
        localStorage.setItem('awsTempCredentials', JSON.stringify(data.awsCredentials));
        console.log('🔐 AWS temporary credentials saved to localStorage');
      }

      console.log('Login successful:', data);
      console.log('AWS Credentials:', data.awsCredentials);
      
      // FORCE IMMEDIATE REDIRECT - No UI rendering, no delays
      const role = data.user.role;
      console.log('🎯 Forcing redirect for role:', role);
      
      if (role === 'owner') {
        console.log('➡️ Redirecting to owner-dashboard.html');
        window.location.href = 'owner-dashboard.html';
      } else if (role === 'provider') {
        console.log('➡️ Redirecting to provider-dashboard.html');
        window.location.href = 'provider-dashboard.html';
      } else {
        // Fallback for any other role (seeker, etc.)
        console.log('➡️ Redirecting to owner-dashboard.html (fallback)');
        window.location.href = 'owner-dashboard.html';
      }
    } 
    // CRUCIAL LOGIC: Check specifically for USER_NOT_CONFIRMED error code
    else if (data.code === 'USER_NOT_CONFIRMED' || 
             data.error === 'UserNotConfirmedException' || 
             data.message.includes('UserNotConfirmedException') ||
             data.message.includes('Verification is required') ||
             data.message.includes('verify your email')) {
      // Dynamic UI Replacement - Replace login form with verification form
      console.log('User not confirmed - displaying verification form');
      console.log('Error details:', data);
      
      // Store password temporarily in sessionStorage for auto-login after confirmation
      sessionStorage.setItem('temp_password', password);
      
      // FORCE UI REPLACEMENT - Target auth-container or fallback to outputElement
      const authContainer = document.getElementById('auth-container');
      if (authContainer) {
        authContainer.innerHTML = displayVerificationForm(email);
        setupVerificationFormListeners(email, authContainer);
        console.log('✅ Verification form injected into auth-container');
      } else {
        // Fallback to outputElement
        outputElement.innerHTML = displayVerificationForm(email);
        setupVerificationFormListeners(email, outputElement);
        console.log('✅ Verification form injected into outputElement');
      }
    } 
    else {
      // Other error response from server
      outputElement.innerHTML = `<p style='color: red;'>❌ Error: ${data.message || 'Login failed'}</p>`;
      console.error('Login error:', data);
    }
  } catch (error) {
    // Network or other error
    outputElement.innerHTML = `<p style='color: red;'>❌ Error: ${error.message}</p>`;
    console.error('Login error:', error);
  }
});

// Dynamic HTML Function: Returns verification form HTML using template literals
function displayVerificationForm(email) {
  return `
    <div style='max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);'>
      <div style='background: white; padding: 30px; border-radius: 8px;'>
        <div style='text-align: center; margin-bottom: 25px;'>
          <div style='font-size: 48px; margin-bottom: 10px;'>📧</div>
          <h2 style='color: #333; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;'>Email Verification Required</h2>
          <p style='color: #666; margin: 0; font-size: 14px;'>We sent a 6-digit code to your email</p>
        </div>

        <!-- Hidden input for user's email -->
        <input type='hidden' id='stored-email' value='${email}' />

        <div style='background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;'>
          <p style='margin: 0; font-size: 13px; color: #666; text-align: center;'>
            <strong style='color: #333;'>Email:</strong> ${email}
          </p>
        </div>

        <div style='margin-bottom: 20px;'>
          <label for='confirm-code-input' style='display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;'>
            Verification Code
          </label>
          <input 
            type='text' 
            id='confirm-code-input' 
            placeholder='Enter 6-digit code' 
            style='width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 18px; font-family: monospace; letter-spacing: 4px; text-align: center; box-sizing: border-box; transition: border-color 0.3s;'
            maxlength='6'
            autocomplete='off'
          />
          <p style='margin: 8px 0 0 0; font-size: 12px; color: #999;'>
            ℹ️ Check your email inbox (and spam folder)
          </p>
        </div>

        <button 
          id='confirm-btn-final' 
          style='width: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);'
          onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.5)';" 
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.4))';"
        >
          ✅ Verify Email
        </button>

        <div style='margin-top: 20px; text-align: center;'>
          <button 
            onclick="location.reload()" 
            style='background: transparent; color: #667eea; border: none; cursor: pointer; font-size: 14px; text-decoration: underline; padding: 8px;'
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  `;
}

// Setup event listeners for verification form elements
function setupVerificationFormListeners(email, outputElement) {
  // Use setTimeout to ensure DOM is updated
  setTimeout(() => {
    const confirmBtn = document.getElementById('confirm-btn-final');
    const codeInput = document.getElementById('confirm-code-input');
    const storedEmail = document.getElementById('stored-email');
    
    if (confirmBtn && codeInput && storedEmail) {
      // Auto-focus on code input for better UX
      codeInput.focus();

      // Confirmation Handler: Event listener for #confirm-btn-final button
      confirmBtn.addEventListener('click', async () => {
        // Get stored email and confirmation code
        const email = storedEmail.value;
        const verificationCode = codeInput.value.trim();
        
        // Send POST request to /api/auth/confirm
        // Note: Password stored temporarily in sessionStorage for auto-login
        const tempPassword = sessionStorage.getItem('temp_password');
        await handleConfirmation(email, verificationCode, codeInput, outputElement, tempPassword);
      });

      // Enter key handler for quick submission
      codeInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          const email = storedEmail.value;
          const verificationCode = codeInput.value.trim();
          const tempPassword = sessionStorage.getItem('temp_password');
          await handleConfirmation(email, verificationCode, codeInput, outputElement, tempPassword);
        }
      });

      // Real-time validation - only allow numbers
      codeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        
        // Update border color based on input
        if (e.target.value.length === 6) {
          e.target.style.borderColor = '#28a745';
        } else if (e.target.value.length > 0) {
          e.target.style.borderColor = '#667eea';
        } else {
          e.target.style.borderColor = '#e0e0e0';
        }
      });
    }
  }, 100);
}

// Confirmation Handler: Process verification code submission
async function handleConfirmation(email, verificationCode, codeInput, outputElement, password) {
  // Validation
  if (!verificationCode) {
    showInlineError(codeInput, '❌ Please enter the verification code');
    return;
  }

  if (verificationCode.length !== 6) {
    showInlineError(codeInput, '❌ Verification code must be exactly 6 digits');
    return;
  }

  if (!/^\d{6}$/.test(verificationCode)) {
    showInlineError(codeInput, '❌ Verification code must contain only numbers');
    return;
  }

  try {
    // Disable button and show loading state
    const confirmBtn = document.getElementById('confirm-btn-final');
    const originalButtonText = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.6';
    confirmBtn.style.cursor = 'not-allowed';
    confirmBtn.innerHTML = '⏳ Verifying...';

    console.log('Sending POST to /api/auth/confirm with email:', email);

    // STEP 1: Send POST request to /api/auth/confirm backend endpoint
    const response = await fetch('/api/auth/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        verificationCode: verificationCode
      })
    });

    // New safer response reading logic
    const contentType = response.headers.get('content-type');
    let data = {};
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        // If server sends HTML/text, we catch the error here.
        const errorText = await response.text();
        throw new Error('Server sent invalid response format (HTML). Status: ' + response.status + ' - Check Server Logs.');
    }

    if (response.ok && data.success) {
      console.log('✅ Email verified successfully:', data);
      
      // STEP 2: Immediate Login after successful confirmation
      if (password) {
        confirmBtn.innerHTML = '🔑 Logging in...';
        console.log('🔑 Auto-login initiated...');
        
        try {
          // Make POST request to /api/auth/login
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: email,
              password: password
            })
          });

          // New safer response reading logic for login response
          const loginContentType = loginResponse.headers.get('content-type');
          let loginData = {};
          if (loginContentType && loginContentType.includes('application/json')) {
              loginData = await loginResponse.json();
          } else {
              // If server sends HTML/text, we catch the error here.
              const errorText = await loginResponse.text();
              throw new Error('Server sent invalid response format (HTML). Status: ' + loginResponse.status + ' - Check Server Logs.');
          }

          if (loginResponse.ok && loginData.success) {
            console.log('✅ Auto-login successful!');
            console.log('👤 User data:', loginData.user);
            
            // Save tokens to localStorage
            localStorage.setItem('accessToken', loginData.tokens.accessToken);
            localStorage.setItem('idToken', loginData.tokens.idToken);
            localStorage.setItem('refreshToken', loginData.tokens.refreshToken);
            localStorage.setItem('userData', JSON.stringify(loginData.user));
            
            // Save AWS temporary credentials for S3 and DynamoDB access
            if (loginData.awsCredentials) {
              localStorage.setItem('awsTempCredentials', JSON.stringify(loginData.awsCredentials));
              console.log('🔐 AWS temporary credentials saved to localStorage');
            }
            
            // Clear temporary password from sessionStorage
            sessionStorage.removeItem('temp_password');
            
            // FORCE IMMEDIATE REDIRECT - No delays, no async code
            const role = loginData.user.role;
            console.log('🎯 Forcing redirect for role:', role);
            
            if (role === 'owner') {
              console.log('➡️ Redirecting to owner-dashboard.html');
              window.location.href = 'owner-dashboard.html';
            } else if (role === 'provider') {
              console.log('➡️ Redirecting to provider-dashboard.html');
              window.location.href = 'provider-dashboard.html';
            } else {
              // Fallback for any other role (seeker, etc.)
              console.log('➡️ Redirecting to owner-dashboard.html (fallback)');
              window.location.href = 'owner-dashboard.html';
            }
            
          } else {
            // Login failed after verification - show error
            console.error('❌ Auto-login failed:', loginData);
            throw new Error(loginData.message || 'Login failed after verification');
          }
        } catch (loginError) {
          console.error('❌ Auto-login error:', loginError);
          
          // Show success message but ask user to login manually
          outputElement.innerHTML = `
            <div style='max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%); padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);'>
              <div style='background: white; padding: 40px; border-radius: 8px; text-align: center;'>
                <div style='font-size: 72px; margin-bottom: 20px;'>✅</div>
                <h2 style='color: #2d5016; margin: 0 0 15px 0; font-size: 28px; font-weight: 700;'>Email Verified Successfully!</h2>
                <p style='color: #4a7c2c; margin: 0 0 10px 0; font-size: 16px;'>Your email has been confirmed.</p>
                <p style='color: #5a8c3c; margin: 0 0 30px 0; font-size: 18px; font-weight: 600;'>Please log in with your credentials.</p>
                <button 
                  onclick="location.reload()" 
                  style='width: 100%; background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%); color: white; padding: 16px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 18px; font-weight: 700;'
                >
                  🔑 Go to Login
                </button>
              </div>
            </div>
          `;
          sessionStorage.removeItem('temp_password');
        }
      } else {
        // No password stored - show success and redirect to login
        outputElement.innerHTML = `
          <div style='max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%); padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); animation: slideIn 0.5s ease;'>
            <div style='background: white; padding: 40px; border-radius: 8px; text-align: center;'>
              <div style='font-size: 72px; margin-bottom: 20px; animation: bounceIn 0.6s ease;'>✅</div>
              <h2 style='color: #2d5016; margin: 0 0 15px 0; font-size: 28px; font-weight: 700;'>Email Verified Successfully!</h2>
              <p style='color: #4a7c2c; margin: 0 0 10px 0; font-size: 16px;'>Your email has been confirmed.</p>
              <p style='color: #5a8c3c; margin: 0 0 30px 0; font-size: 18px; font-weight: 600;'>You can now log in with your credentials.</p>
              
              <div style='background: #f0f8e8; padding: 15px; border-radius: 6px; margin-bottom: 25px;'>
                <p style='margin: 0; font-size: 14px; color: #4a7c2c;'>
                  <strong>✓ Account Activated:</strong> ${email}
                </p>
              </div>

              <button 
                onclick="location.reload()" 
                style='width: 100%; background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%); color: white; padding: 16px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 18px; font-weight: 700; box-shadow: 0 4px 15px rgba(86, 171, 47, 0.4); transition: transform 0.2s;'
                onmouseover="this.style.transform='translateY(-2px)';" 
                onmouseout="this.style.transform='translateY(0)';"
              >
                🔑 Go to Login
              </button>
            </div>
          </div>

          <style>
            @keyframes slideIn {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes bounceIn {
              0% { transform: scale(0); }
              50% { transform: scale(1.2); }
              100% { transform: scale(1); }
            }
          </style>
        `;
      }
    } else {
      // Error response from server - show inline error
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
      confirmBtn.innerHTML = originalButtonText;
      
      showInlineError(codeInput, `❌ ${data.message || 'Failed to verify email'}`);
      console.error('❌ Verification error:', data);
    }
  } catch (error) {
    // Network or other error
    const confirmBtn = document.getElementById('confirm-btn-final');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
      confirmBtn.innerHTML = '✅ Verify Email';
    }
    
    showInlineError(codeInput, `❌ ${error.message}`);
    console.error('❌ Verification error:', error);
  }
}

// Helper function to show inline error messages
function showInlineError(inputElement, message) {
  // Remove existing error message
  const existingError = document.getElementById('inline-error-message');
  if (existingError) {
    existingError.remove();
  }

  // Create error message element
  const errorDiv = document.createElement('div');
  errorDiv.id = 'inline-error-message';
  errorDiv.style.cssText = `
    background: #f8d7da;
    color: #721c24;
    padding: 10px 15px;
    border-radius: 6px;
    margin-top: 10px;
    font-size: 14px;
    border: 1px solid #f5c6cb;
    animation: shake 0.5s ease;
  `;
  errorDiv.textContent = message;

  // Add shake animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }
  `;
  document.head.appendChild(style);

  // Insert error after input
  inputElement.parentNode.appendChild(errorDiv);
  
  // Highlight input with error
  inputElement.style.borderColor = '#dc3545';
  inputElement.focus();
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => errorDiv.remove(), 300);
    }
    inputElement.style.borderColor = '#e0e0e0';
  }, 5000);
}
