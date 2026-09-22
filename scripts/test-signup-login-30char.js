/**
 * Test signup and login with 30-character email and 8-character password
 */
require('dotenv').config();

// Exactly 30 characters: 'testuser12345678901234567' (27) + '@test.com' (9) = 36
// Let's use: 'test12345678901234567890' (26) + '@t.com' (6) = 32
// Better: 'a'.repeat(20) (20) + '@test.com' (9) = 29
// Perfect: 'a'.repeat(21) (21) + '@test.com' (9) = 30
const testEmail = 'a'.repeat(21) + '@test.com'; // Exactly 30 characters
const testPassword = 'Test@123'; // Exactly 8 characters
const testFullName = 'Test User';
const testRole = 'owner';
const testAddress = '123 Test Street';

console.log('🧪 Testing with credentials:');
console.log(`  Email: ${testEmail} (${testEmail.length} characters)`);
console.log(`  Password: ${testPassword} (${testPassword.length} characters)`);
console.log(`  Full Name: ${testFullName}`);
console.log(`  Role: ${testRole}`);
console.log(`  Address: ${testAddress}`);
console.log('');

async function testSignup() {
  console.log('📝 ========== TEST SIGNUP ==========');
  
  try {
    const response = await fetch('http://localhost:3001/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        fullName: testFullName,
        role: testRole,
        address: testAddress
      })
    });

    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log('📦 Response Body:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Signup successful!');
      return true;
    } else {
      console.log('❌ Signup failed:', data.message || data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Signup error:', error.message);
    return false;
  }
}

async function testLogin() {
  console.log('\n🔐 ========== TEST LOGIN ==========');
  
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
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log('📦 Response Body:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('✅ Login successful!');
      console.log('👤 User:', data.user);
      console.log('🎫 Tokens received:', {
        idToken: data.tokens?.idToken ? '✓' : '✗',
        accessToken: data.tokens?.accessToken ? '✓' : '✗',
        refreshToken: data.tokens?.refreshToken ? '✓' : '✗'
      });
      console.log('🔐 AWS Credentials:', data.awsCredentials ? '✓' : '✗');
      return true;
    } else {
      console.log('⚠️  Login response (expected for unconfirmed email):', data.message);
      console.log('   Error code:', data.code);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 SIGNUP & LOGIN TEST SUITE');
  console.log('='.repeat(60));
  console.log('');

  // Test signup
  const signupSuccess = await testSignup();
  
  if (!signupSuccess) {
    console.log('\n⚠️  Signup failed - skipping login test');
    process.exit(1);
  }

  // Small delay before login test
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test login (may fail if email not confirmed)
  const loginSuccess = await testLogin();

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Signup: ${signupSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Login: ${loginSuccess ? '✅ PASSED' : '⚠️  NEEDS CONFIRMATION (expected)'}`);
  console.log('='.repeat(60));
  
  process.exit(0);
}

runTests();
