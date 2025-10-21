# Cognito Identity Pool - Quick Reference

## 🚀 Quick Start (5 Minutes)

### 1. AWS Setup
```bash
# Create User Pool → Get User Pool ID
# Create Identity Pool → Get Identity Pool ID
# Link them together
# Configure IAM role
```

### 2. Update .env
```env
COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
COGNITO_CLIENT_ID=your_client_id_here
COGNITO_IDENTITY_POOL_ID=ap-south-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 3. Start Server
```bash
npm start
```

---

## 📡 API Endpoints

### Signup
```bash
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "role": "seeker"
}
```

### Login (Get Temporary Credentials)
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

# Response includes:
{
  "awsCredentials": {
    "accessKeyId": "ASIATEMP...",
    "secretAccessKey": "...",
    "sessionToken": "...",
    "expiration": "2025-10-21T13:00:00Z"
  }
}
```

### Refresh Credentials
```bash
POST /api/auth/refresh
{
  "idToken": "eyJraWQ..."
}
```

### Verify Email
```bash
POST /api/auth/verify
{
  "email": "user@example.com",
  "code": "123456"
}
```

---

## 💻 Frontend Usage

### Login
```javascript
const auth = await aws.signIn('user@example.com', 'Pass123!');
// AWS SDK now initialized with temporary credentials!
```

### Use S3
```javascript
const file = document.getElementById('fileInput').files[0];
const url = await aws.uploadProfilePicture(file, userId);
// Uses temporary credentials automatically
```

### Use DynamoDB
```javascript
const profile = await aws.getUserProfile(userId, 'user');
await aws.updateUserProfile(userId, { name: 'New Name' }, 'user');
// Uses temporary credentials automatically
```

### Check Credentials
```javascript
// Are they expiring soon?
aws.areCredentialsExpiringSoon() // true/false

// Time until expiration
aws.getTimeUntilExpiration() // milliseconds

// Manual refresh
await aws.refreshCredentials()
```

---

## 🔑 IAM Policy Template

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": [
        "arn:aws:s3:::BUCKET/profilePhotos/${cognito-identity.amazonaws.com:sub}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:REGION:*:table/TABLE",
      "Condition": {
        "ForAllValues:StringEquals": {
          "dynamodb:LeadingKeys": ["${cognito-identity.amazonaws.com:sub}"]
        }
      }
    }
  ]
}
```

---

## 🐛 Common Issues

### "IdentityPoolId is required"
→ Add to `.env`: `COGNITO_IDENTITY_POOL_ID=...`

### "NotAuthorizedException"
→ Check User Pool ID, Client ID, enable USER_PASSWORD_AUTH

### "Access Denied" on S3/DynamoDB
→ Check IAM role policy, verify `${cognito-identity.amazonaws.com:sub}` variable

### Credentials not refreshing
→ Check ID token in localStorage, verify `/api/auth/refresh` works

---

## ✅ Deployment Checklist

- [ ] User Pool created with custom attributes
- [ ] App Client created (USER_PASSWORD_AUTH enabled)
- [ ] Identity Pool created and linked to User Pool
- [ ] IAM role configured with scoped permissions
- [ ] `.env` updated with all IDs
- [ ] Backend deployed with auth routes
- [ ] Frontend updated to use auth API
- [ ] Test login flow end-to-end
- [ ] Verify temporary credentials work
- [ ] Test auto-refresh
- [ ] Verify IAM scoping (users can't access others' data)

---

## 📚 Full Documentation

See [`COGNITO_IDENTITY_POOL_COMPLETE.md`](COGNITO_IDENTITY_POOL_COMPLETE.md) for:
- Detailed AWS setup guide
- Complete API documentation
- Security best practices
- Troubleshooting guide
- Testing examples

---

**Ready to launch with secure, temporary credentials!** 🚀
