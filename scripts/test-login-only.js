/**
 * Test login with existing credentials
 */
require('dotenv').config();

// Use the email from previous signup test
const testEmail = 'aaaaaaaaaaaaaaaaaaaaa@test.com'; // 30 characters
const testPassword = 'Test@123'; // 8 characters

console.log('🧪 Testing login with:');
console.log(`  Email: ${testEmail} (${testEmail.length} characters)`);
console.log(`  Password: ${testPassword} (${testPassword.length} characters)`);
console.log('');

async function testLogin() {
  console.log('🔐 ========== TEST LOGIN ==========');
  console.log('📤 Sending login request...');
  
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    const data = await response.json();
    
    console.log(`\n📊 HTTP Status: ${response.status}`);
    console.log('\n📦 Response Body:');
    console.log(JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ Login successful!');
      console.log('👤 User data:', data.user);
      console.log('🎫 Tokens received:', {
        idToken: data.tokens?.idToken ? '✓' : '✗',
        accessToken: data.tokens?.accessToken ? '✓' : '✗',
        refreshToken: data.tokens?.refreshToken ? '✓' : '✗'
      });
      console.log('🔐 AWS Credentials:', data.awsCredentials ? '✓' : '✗');
      return true;
    } else {
      console.log('\n❌ Login failed!');
      console.log('📋 Error details:');
      console.log('   - Message:', data.message);
      console.log('   - Code:', data.code);
      console.log('   - Error:', data.error);
      return false;
    }
  } catch (error) {
    console.error('\n❌ Login error:', error.message);
    return false;
  }
}

testLogin().then(success => {
  process.exit(success ? 0 : 1);
});
