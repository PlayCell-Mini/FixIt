# Firebase to AWS Migration Guide

## Overview
This guide helps you migrate the FixIt application from Firebase to AWS services.

**Migration Mapping:**
- Firebase Authentication → AWS Cognito
- Firestore Database → Amazon DynamoDB
- Firebase Storage → Amazon S3

---

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Node.js** (for local development/testing)

---

## Step 1: Set Up AWS Services

### 1.1 Create S3 Bucket for Profile Images

```bash
# Create S3 bucket
aws s3 mb s3://fixit-profile-images --region ap-south-1

# Enable public read access for profile images
aws s3api put-bucket-acl \
  --bucket fixit-profile-images \
  --acl public-read

# Configure CORS for browser uploads
aws s3api put-bucket-cors \
  --bucket fixit-profile-images \
  --cors-configuration file://s3-cors-config.json
```

**s3-cors-config.json:**
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### 1.2 Create DynamoDB Tables

**Users Table:**
```bash
aws dynamodb create-table \
  --table-name FixIt-Users \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

**Providers Table:**
```bash
aws dynamodb create-table \
  --table-name FixIt-Providers \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

**Jobs Table:**
```bash
aws dynamodb create-table \
  --table-name FixIt-Jobs \
  --attribute-definitions \
    AttributeName=jobId,AttributeType=S \
    AttributeName=ownerId,AttributeType=S \
    AttributeName=providerId,AttributeType=S \
  --key-schema \
    AttributeName=jobId,KeyType=HASH \
  --global-secondary-indexes \
    "IndexName=ownerIndex,KeySchema=[{AttributeName=ownerId,KeyType=HASH}],Projection={ProjectionType=ALL}" \
    "IndexName=providerIndex,KeySchema=[{AttributeName=providerId,KeyType=HASH}],Projection={ProjectionType=ALL}" \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

### 1.3 Set Up Cognito User Pool

```bash
# Create User Pool
aws cognito-idp create-user-pool \
  --pool-name FixIt-UserPool \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true}" \
  --auto-verified-attributes email \
  --region ap-south-1

# Note the UserPoolId from the output

# Create App Client
aws cognito-idp create-user-pool-client \
  --user-pool-id <YOUR_USER_POOL_ID> \
  --client-name FixItWebApp \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region ap-south-1

# Note the ClientId from the output
```

### 1.4 Create IAM User for Application

```bash
# Create IAM user
aws iam create-user --user-name fixit-app-user

# Create access key
aws iam create-access-key --user-name fixit-app-user

# Save AccessKeyId and SecretAccessKey securely
```

**Create IAM Policy (fixit-app-policy.json):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::fixit-profile-images/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-south-1:*:table/FixIt-Users",
        "arn:aws:dynamodb:ap-south-1:*:table/FixIt-Providers",
        "arn:aws:dynamodb:ap-south-1:*:table/FixIt-Jobs",
        "arn:aws:dynamodb:ap-south-1:*:table/FixIt-Users/index/*",
        "arn:aws:dynamodb:ap-south-1:*:table/FixIt-Providers/index/*",
        "arn:aws:dynamodb:ap-south-1:*:table/FixIt-Jobs/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:InitiateAuth",
        "cognito-idp:SignUp",
        "cognito-idp:ConfirmSignUp",
        "cognito-idp:RespondToAuthChallenge"
      ],
      "Resource": "arn:aws:cognito-idp:ap-south-1:*:userpool/*"
    }
  ]
}
```

```bash
# Attach policy
aws iam put-user-policy \
  --user-name fixit-app-user \
  --policy-name FixItAppPolicy \
  --policy-document file://fixit-app-policy.json
```

---

## Step 2: Configure Application

### 2.1 Update awsConfig.js

Replace the placeholder values in `awsConfig.js`:

```javascript
const COGNITO_CONFIG = {
  userPoolId: 'ap-south-1_XXXXXXXXX', // Your Cognito User Pool ID
  clientId: 'your-client-id-here',     // Your App Client ID
  region: 'ap-south-1'
};
```

### 2.2 Create .env file

Copy `.env.example` to `.env` and fill in your AWS credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...  # From IAM user creation
AWS_SECRET_ACCESS_KEY=...  # From IAM user creation
AWS_S3_BUCKET=fixit-profile-images
COGNITO_USER_POOL_ID=ap-south-1_...
COGNITO_CLIENT_ID=...
```

### 2.3 Update HTML Files

Add AWS SDK before closing `</body>` tag in all HTML files:

```html
<!-- AWS SDK v3 for Browser -->
<script src="https://sdk.amazonaws.com/js/aws-sdk-2.1450.0.min.js"></script>
<script src="awsConfig.js"></script>
```

Initialize AWS Service:

```html
<script>
  // Initialize AWS with credentials
  awsService.initialize(
    'YOUR_ACCESS_KEY_ID',  // In production, use secure method
    'YOUR_SECRET_KEY'       // In production, use secure method
  );
</script>
```

---

## Step 3: Data Migration

### 3.1 Export Firebase Data

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Export Firestore data
firebase firestore:export ./firebase-export
```

### 3.2 Transform and Import to DynamoDB

Create migration script (`migrate-data.js`):

```javascript
const AWS = require('aws-sdk');
const fs = require('fs');

AWS.config.update({ region: 'ap-south-1' });
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Read Firebase export
const firebaseData = JSON.parse(fs.readFileSync('./firebase-export/users.json'));

// Transform and import
async function migrateUsers() {
  for (const userId in firebaseData) {
    const userData = firebaseData[userId];
    
    const item = {
      userId: userId,
      fullName: userData.fullName,
      email: userData.email,
      role: userData.role,
      profileURL: userData.profileImage || userData.profileURL || '',
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt || new Date().toISOString()
    };

    await dynamoDB.put({
      TableName: 'FixIt-Users',
      Item: item
    }).promise();

    console.log(`Migrated user: ${userId}`);
  }
}

migrateUsers().catch(console.error);
```

Run migration:
```bash
node migrate-data.js
```

---

## Step 4: Test Migration

### 4.1 Test Authentication

1. Open `login.html`
2. Try logging in with test credentials
3. Verify Cognito authentication works

### 4.2 Test Profile Picture Upload

1. Open dashboard
2. Upload profile picture
3. Verify:
   - Image appears in S3 bucket
   - URL saved in DynamoDB
   - Image displays in UI

### 4.3 Test Data Retrieval

1. Refresh dashboard
2. Verify profile data loads from DynamoDB
3. Check console for any errors

---

## Step 5: Remove Firebase

### 5.1 Delete Firebase Configuration

```bash
rm firebase-config.js
```

### 5.2 Remove Firebase SDK from HTML

Remove these lines from all HTML files:
```html
<!-- Remove these -->
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-analytics.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-storage.js"></script>
<script src="firebase-config.js"></script>
```

---

## Security Best Practices

### Production Deployment

**DO NOT hardcode AWS credentials in frontend code!**

Instead, use one of these approaches:

1. **AWS Cognito Identity Pool** (Recommended):
   - Create Cognito Identity Pool
   - Use temporary credentials
   - Map authenticated users to IAM roles

2. **Backend API**:
   - Create API Gateway + Lambda
   - Frontend calls API for S3 uploads
   - Credentials stay on backend

3. **S3 Presigned URLs**:
   - Backend generates presigned upload URLs
   - Frontend uploads directly to S3
   - No credentials exposed

### Example: Using Cognito Identity Pool

```javascript
// Configure Cognito Identity Pool
AWS.config.region = 'ap-south-1';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: 'ap-south-1:xxxxx-xxxx-xxxx-xxxx-xxxxxx'
});
```

---

## Troubleshooting

### Issue: CORS Error on S3 Upload
**Solution:** Verify S3 bucket CORS configuration

### Issue: Access Denied on DynamoDB
**Solution:** Check IAM policy permissions

### Issue: Cognito Authentication Fails
**Solution:** Verify User Pool Client allows USER_PASSWORD_AUTH flow

---

## Cost Optimization

1. **Use DynamoDB On-Demand Pricing** for unpredictable traffic
2. **Set S3 Lifecycle Policies** to delete old profile pictures
3. **Enable CloudWatch Alarms** for cost monitoring
4. **Use S3 Intelligent-Tiering** for cost savings

---

## Rollback Plan

If migration fails, you can rollback by:

1. Keep `firebase-config.js` as `firebase-config.js.backup`
2. Restore Firebase SDK scripts
3. Switch back to Firebase in code

---

## Support

For issues, check:
- AWS CloudWatch Logs
- Browser Console
- Network tab in DevTools
