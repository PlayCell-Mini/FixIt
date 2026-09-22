# Quick Start: AWS Migration

## 🚀 What's Been Done

### ✅ Completed
1. **AWS Configuration File** (`awsConfig.js`) - Ready to use
2. **Owner Dashboard** (`owner-dashboard.html`) - Fully migrated
3. **Migration Guide** (`AWS_MIGRATION_GUIDE.md`) - Complete documentation
4. **Environment Template** (`.env.example`) - Configuration template

### 🔄 In Progress
- Provider Dashboard (SDK updated, needs function migration)
- Login page (needs Cognito integration)
- Signup page (needs Cognito integration)

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Get AWS Credentials

```bash
# Create IAM user (or use existing)
aws iam create-user --user-name fixit-app

# Create access key
aws iam create-access-key --user-name fixit-app

# Save output:
# AccessKeyId: AKIA...
# SecretAccessKey: ...
```

### Step 2: Create .env File

```bash
cp .env.example .env
```

Edit `.env`:
```
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...your-key...
AWS_SECRET_ACCESS_KEY=...your-secret...
AWS_S3_BUCKET=fixit-profile-images
COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-client-id
```

### Step 3: Update awsConfig.js

Open `awsConfig.js` and update:

```javascript
const COGNITO_CONFIG = {
  userPoolId: 'ap-south-1_XXXXXXXXX', // Your actual User Pool ID
  clientId: 'your-actual-client-id',   // Your actual App Client ID
  region: 'ap-south-1'
};
```

### Step 4: Initialize in HTML

In each HTML file, after loading `awsConfig.js`:

```html
<script>
  // Option 1: From environment (production)
  fetch('/api/aws-config')
    .then(r => r.json())
    .then(config => {
      awsService.initialize(config.accessKey, config.secretKey);
    });

  // Option 2: Hardcoded (development only - NOT for production!)
  awsService.initialize(
    'YOUR_ACCESS_KEY_ID',
    'YOUR_SECRET_ACCESS_KEY'
  );
</script>
```

---

## 🔨 Complete Provider Dashboard Migration

Open `provider-dashboard.html` and apply these changes:

### 1. Update Real-Time Listener

**Find:**
```javascript
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  db.collection('providers').doc(user.uid).onSnapshot((doc) => {
    // ...
  });
});
```

**Replace with:**
```javascript
const currentUser = aws.getCurrentUser();
if (currentUser) {
  setInterval(async () => {
    try {
      const userData = await aws.getUserProfile(currentUser.userId, 'provider');
      if (userData && userData.profileURL) {
        const img = document.getElementById('sidebarAvatarProvider');
        if (img && img.src !== userData.profileURL) {
          img.src = userData.profileURL;
        }
      }
    } catch (error) {
      console.error('Error polling profile:', error);
    }
  }, 30000);
}
```

### 2. Update checkAuthState()

**Find:**
```javascript
async checkAuthState() {
  auth.onAuthStateChanged(async (user) => {
    // ...
  });
}
```

**Replace with:**
```javascript
async checkAuthState() {
  const currentUser = aws.getCurrentUser();
  
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }
  
  try {
    const userData = await aws.getUserProfile(currentUser.userId, 'user');
    
    if (!userData || userData.role !== 'provider') {
      alert('Access denied!');
      aws.signOut();
      window.location.href = "login.html";
      return;
    }
    
    this.loadUserProfile(currentUser);
  } catch (error) {
    console.error('Error checking auth:', error);
    window.location.href = "login.html";
  }
}
```

### 3. Update loadUserProfile()

**Find:**
```javascript
async loadUserProfile(user) {
  const profile = await db.collection('providers').doc(user.uid).get();
  // ...
}
```

**Replace with:**
```javascript
async loadUserProfile(user) {
  try {
    const profile = await aws.getUserProfile(user.userId, 'provider');
    
    if (profile && profile.profileURL) {
      const sidebarImg = document.getElementById('sidebarAvatarProvider');
      if (sidebarImg) {
        sidebarImg.src = profile.profileURL;
        console.log('Profile picture loaded:', profile.profileURL);
      }
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}
```

### 4. Update Profile Save

**Find:**
```javascript
await db.collection('providers').doc(user.uid).set(updateData, { merge: true });
```

**Replace with:**
```javascript
// Upload image if provided
if (file) {
  const imageURL = await aws.uploadProfilePicture(file, currentUser.userId);
  updateData.profileURL = imageURL;
}

// Save to DynamoDB
await aws.updateUserProfile(currentUser.userId, updateData, 'provider');
```

### 5. Update loadHireRequests()

**Find:**
```javascript
const requestsSnapshot = await db.collection('jobs')
  .where('providerId', '==', user.uid)
  .where('status', '==', 'pending')
  .get();
```

**Replace with:**
```javascript
const requests = await aws.queryItems('FixIt-Jobs', {
  IndexName: 'providerIndex',
  KeyConditionExpression: 'providerId = :providerId',
  FilterExpression: '#status = :pending',
  ExpressionAttributeNames: { '#status': 'status' },
  ExpressionAttributeValues: {
    ':providerId': currentUser.userId,
    ':pending': 'pending'
  }
});

this.requests = requests.map(job => ({ id: job.jobId, ...job }));
```

---

## 🔐 Complete Login Migration

Open `login.html`:

### Replace Firebase Login

**Find:**
```javascript
const userCredential = await auth.signInWithEmailAndPassword(email, password);
const user = userCredential.user;

const docRef = await db.collection('users').doc(user.uid).get();
const role = docRef.exists ? docRef.data().role : 'unknown';
```

**Replace with:**
```javascript
// Sign in with Cognito
await aws.signIn(email, password);

// Get user from DynamoDB
const currentUser = aws.getCurrentUser();
const userData = await aws.getUserProfile(currentUser.userId, 'user');

const role = userData ? userData.role : 'unknown';
```

---

## 📝 Complete Signup Migration

Open `signup.html`:

### Replace Firebase Signup

**Find:**
```javascript
const userCredential = await auth.createUserWithEmailAndPassword(email, password);
const user = userCredential.user;

await db.collection('users').doc(user.uid).set({
  fullName: fullName,
  // ...
});
```

**Replace with:**
```javascript
// 1. Sign up with Cognito
const signUpResult = await aws.signUp(email, password, {
  email: email,
  name: fullName
});

const userId = signUpResult.UserSub;

// 2. Save to DynamoDB
await aws.saveUserProfile(userId, {
  fullName: fullName,
  email: email,
  role: role,
  profileURL: '',
  createdAt: new Date().toISOString()
}, role === 'provider' ? 'provider' : 'user');

// 3. Show email verification message
showSuccess('Account created! Please check your email to verify.');
```

---

## 🧪 Testing Your Migration

### Test 1: Authentication

```javascript
// In browser console:
awsService.initialize('YOUR_KEY', 'YOUR_SECRET');

// Test login
await awsService.signIn('test@example.com', 'Password123!');

// Check user
const user = awsService.getCurrentUser();
console.log('Current user:', user);
```

### Test 2: Profile Upload

```javascript
// Upload test image
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const url = await awsService.uploadProfilePicture(file, 'user123');
console.log('Uploaded to:', url);
```

### Test 3: Data Fetching

```javascript
// Get user profile
const profile = await awsService.getUserProfile('user123', 'user');
console.log('Profile:', profile);

// Update profile
await awsService.updateUserProfile('user123', {
  fullName: 'New Name'
}, 'user');
```

---

## 🏗️ Create AWS Infrastructure

### Quick Setup Script

Save as `setup-aws.sh`:

```bash
#!/bin/bash

# Variables
REGION="ap-south-1"
BUCKET="fixit-profile-images"

echo "Creating S3 bucket..."
aws s3 mb s3://$BUCKET --region $REGION

echo "Creating DynamoDB tables..."
aws dynamodb create-table \
  --table-name FixIt-Users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

aws dynamodb create-table \
  --table-name FixIt-Providers \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

aws dynamodb create-table \
  --table-name FixIt-Jobs \
  --attribute-definitions \
    AttributeName=jobId,AttributeType=S \
    AttributeName=ownerId,AttributeType=S \
    AttributeName=providerId,AttributeType=S \
  --key-schema AttributeName=jobId,KeyType=HASH \
  --global-secondary-indexes \
    '[{
      "IndexName":"ownerIndex",
      "KeySchema":[{"AttributeName":"ownerId","KeyType":"HASH"}],
      "Projection":{"ProjectionType":"ALL"}
    },{
      "IndexName":"providerIndex",
      "KeySchema":[{"AttributeName":"providerId","KeyType":"HASH"}],
      "Projection":{"ProjectionType":"ALL"}
    }]' \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

echo "Creating Cognito User Pool..."
POOL_ID=$(aws cognito-idp create-user-pool \
  --pool-name FixIt-UserPool \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true}" \
  --auto-verified-attributes email \
  --region $REGION \
  --query 'UserPool.Id' \
  --output text)

echo "User Pool ID: $POOL_ID"

echo "Creating App Client..."
CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --user-pool-id $POOL_ID \
  --client-name FixItWebApp \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region $REGION \
  --query 'UserPoolClient.ClientId' \
  --output text)

echo "Client ID: $CLIENT_ID"

echo "✅ AWS setup complete!"
echo "Update awsConfig.js with:"
echo "  userPoolId: $POOL_ID"
echo "  clientId: $CLIENT_ID"
```

Run:
```bash
chmod +x setup-aws.sh
./setup-aws.sh
```

---

## 🚨 Common Issues & Fixes

### Issue: "AWS is not defined"

**Fix:** Ensure AWS SDK is loaded before awsConfig.js:
```html
<script src="https://sdk.amazonaws.com/js/aws-sdk-2.1450.0.min.js"></script>
<script src="awsConfig.js"></script>
```

### Issue: "Access Denied" on S3 Upload

**Fix:** Check IAM permissions:
```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:PutObjectAcl"],
  "Resource": "arn:aws:s3:::fixit-profile-images/*"
}
```

### Issue: "Table does not exist"

**Fix:** Verify table names match awsConfig.js:
```javascript
const DYNAMODB_CONFIG = {
  tables: {
    users: 'FixIt-Users',      // Must match DynamoDB
    providers: 'FixIt-Providers',
    jobs: 'FixIt-Jobs'
  }
};
```

---

## 📚 Additional Resources

- [AWS SDK for JavaScript Documentation](https://docs.aws.amazon.com/sdk-for-javascript/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [S3 Developer Guide](https://docs.aws.amazon.com/s3/)
- [Cognito Developer Guide](https://docs.aws.amazon.com/cognito/)

---

## ✅ Migration Checklist

- [ ] AWS SDK added to all HTML files
- [ ] `awsConfig.js` updated with credentials
- [ ] S3 bucket created
- [ ] DynamoDB tables created
- [ ] Cognito User Pool created
- [ ] Owner dashboard migrated
- [ ] Provider dashboard migrated
- [ ] Login page migrated
- [ ] Signup page migrated
- [ ] All functions tested
- [ ] Firebase removed
- [ ] Production security implemented

---

**You're almost done! 🎉**

The AWS infrastructure is configured and owner-dashboard is fully migrated. 
Follow this guide to complete the remaining pages and test thoroughly.
