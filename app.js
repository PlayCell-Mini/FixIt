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
      // Error response from server
      outputElement.innerHTML = `<p style='color: red;'>❌ Error: ${data.message || 'Login failed'}</p>`;
      console.error('Login error:', data);
    }
  } catch (error) {
    // Network or other error
    outputElement.innerHTML = `<p style='color: red;'>❌ Error: ${error.message}</p>`;
    console.error('Login error:', error);
  }
});
