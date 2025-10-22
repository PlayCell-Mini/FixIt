// Signup Button Handler
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

    const data = await response.json();

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

    const data = await response.json();

    if (response.ok && data.success) {
      // Success - save tokens to localStorage
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('idToken', data.tokens.idToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('userData', JSON.stringify(data.user));

      // Display tokens and user info
      outputElement.innerHTML = `
        <div style='color: green;'>
          <h3>✅ Login Successful!</h3>
          <p><strong>User:</strong> ${data.user.email}</p>
          <p><strong>Role:</strong> ${data.user.role}</p>
          <hr>
          <p><strong>Access Token:</strong></p>
          <code style='display: block; background: #f0f0f0; padding: 10px; word-break: break-all; font-size: 12px;'>
            ${data.tokens.accessToken.substring(0, 50)}...
          </code>
          <p><strong>ID Token:</strong></p>
          <code style='display: block; background: #f0f0f0; padding: 10px; word-break: break-all; font-size: 12px;'>
            ${data.tokens.idToken.substring(0, 50)}...
          </code>
          <p style='margin-top: 15px;'><em>Tokens saved to localStorage</em></p>
          <p><em>AWS Credentials received and ready for use</em></p>
        </div>
      `;
      console.log('Login successful:', data);
      console.log('AWS Credentials:', data.awsCredentials);
    } else {
      // Check if user is not confirmed (UserNotConfirmedException)
      if (data.error === 'UserNotConfirmedException' || data.message.includes('verify your email')) {
        // Display verification form
        displayVerificationForm(email, outputElement);
      } else {
        // Other error response from server
        outputElement.innerHTML = `<p style='color: red;'>❌ Error: ${data.message || 'Login failed'}</p>`;
        console.error('Login error:', data);
      }
    }
  } catch (error) {
    // Network or other error
    outputElement.innerHTML = `<p style='color: red;'>❌ Error: ${error.message}</p>`;
    console.error('Login error:', error);
  }
});

// Function to display verification form
function displayVerificationForm(email, outputElement) {
  outputElement.innerHTML = `
    <div style='background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px;'>
      <h3 style='color: #856404; margin-top: 0;'>📧 Email Verification Required</h3>
      <p style='color: #856404;'>Please check your email for the verification code.</p>
      <div style='margin: 20px 0;'>
        <label for='verification-code-input' style='display: block; margin-bottom: 8px; font-weight: 600; color: #333;'>
          Verification Code:
        </label>
        <input 
          type='text' 
          id='verification-code-input' 
          placeholder='Enter 6-digit code' 
          style='width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px;'
          maxlength='6'
        />
      </div>
      <button 
        id='confirm-btn' 
        style='background: #28a745; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: 600; width: 100%;'
      >
        Verify Email
      </button>
      <p style='margin-top: 15px; font-size: 14px; color: #666;'>
        <em>Email: ${email}</em>
      </p>
    </div>
  `;

  // Add event listener for confirm button
  setTimeout(() => {
    const confirmBtn = document.getElementById('confirm-btn');
    const verificationCodeInput = document.getElementById('verification-code-input');
    
    if (confirmBtn && verificationCodeInput) {
      confirmBtn.addEventListener('click', async () => {
        await handleEmailConfirmation(email, verificationCodeInput, outputElement);
      });

      // Allow Enter key to submit
      verificationCodeInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          await handleEmailConfirmation(email, verificationCodeInput, outputElement);
        }
      });
    }
  }, 100);
}

// Function to handle email confirmation
async function handleEmailConfirmation(email, verificationCodeInput, outputElement) {
  const verificationCode = verificationCodeInput.value.trim();

  // Validation
  if (!verificationCode) {
    outputElement.innerHTML = `<p style='color: red;'>❌ Please enter the verification code</p>`;
    setTimeout(() => displayVerificationForm(email, outputElement), 2000);
    return;
  }

  if (verificationCode.length !== 6) {
    outputElement.innerHTML = `<p style='color: red;'>❌ Verification code must be 6 digits</p>`;
    setTimeout(() => displayVerificationForm(email, outputElement), 2000);
    return;
  }

  try {
    // Show loading state
    outputElement.innerHTML = "<p>Verifying...</p>";

    // Make POST request to confirm endpoint
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

    const data = await response.json();

    if (response.ok && data.success) {
      // Success - show success message
      outputElement.innerHTML = `
        <div style='background: #d4edda; border: 1px solid #28a745; padding: 20px; border-radius: 8px;'>
          <h3 style='color: #155724; margin-top: 0;'>✅ Email Verified Successfully!</h3>
          <p style='color: #155724;'>Your email has been confirmed.</p>
          <p style='color: #155724; font-weight: 600;'>You can now log in with your credentials.</p>
          <button 
            onclick="location.reload()" 
            style='background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: 600; margin-top: 15px; width: 100%;'
          >
            Go to Login
          </button>
        </div>
      `;
      console.log('Email verified successfully:', data);
    } else {
      // Error response from server
      outputElement.innerHTML = `
        <div style='background: #f8d7da; border: 1px solid #dc3545; padding: 20px; border-radius: 8px;'>
          <h3 style='color: #721c24; margin-top: 0;'>❌ Verification Failed</h3>
          <p style='color: #721c24;'>${data.message || 'Failed to verify email'}</p>
          <button 
            id='retry-verification-btn' 
            style='background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: 600; margin-top: 15px; width: 100%;'
          >
            Try Again
          </button>
        </div>
      `;
      console.error('Verification error:', data);

      // Add retry button handler
      setTimeout(() => {
        const retryBtn = document.getElementById('retry-verification-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            displayVerificationForm(email, outputElement);
          });
        }
      }, 100);
    }
  } catch (error) {
    // Network or other error
    outputElement.innerHTML = `
      <div style='background: #f8d7da; border: 1px solid #dc3545; padding: 20px; border-radius: 8px;'>
        <h3 style='color: #721c24; margin-top: 0;'>❌ Error</h3>
        <p style='color: #721c24;'>${error.message}</p>
        <button 
          id='retry-verification-btn' 
          style='background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: 600; margin-top: 15px; width: 100%;'
        >
          Try Again
        </button>
      </div>
    `;
    console.error('Verification error:', error);

    // Add retry button handler
    setTimeout(() => {
      const retryBtn = document.getElementById('retry-verification-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          displayVerificationForm(email, outputElement);
        });
      }
    }, 100);
  }
}
