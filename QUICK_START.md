# FixIt Service Marketplace - Quick Start Guide 🚀

## Overview
FixIt is a modern service marketplace web application connecting service owners with providers (plumbers, electricians, carpenters, etc.). Built with Node.js/Express backend and AWS cloud services.

---

## ✨ Recent Updates (2025-10-21)

### 🎉 New Features Added
1. **S3 File Upload API** - Backend-mediated file uploads to AWS S3
2. **Modern API Client** - Clean frontend API integration layer
3. **Complete AWS Migration** - All Firebase dependencies removed
4. **Enhanced Security** - Server-side credential management

---

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- AWS Account with configured:
  - IAM User with programmatic access
  - S3 Bucket
  - DynamoDB Tables
  - Cognito User Pool (optional)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

This installs:
- `express` - Web server framework
- `aws-sdk` - AWS services integration
- `dotenv` - Environment variable management
- `multer` - File upload handling

### 2. Configure Environment

Create/update `.env` file with your AWS credentials:

```env
# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# S3 Bucket
S3_BUCKET=fixit-profile-images

# DynamoDB Tables
DYNAMODB_USERS_TABLE=FixIt-Users
DYNAMODB_PROVIDERS_TABLE=FixIt-Providers
DYNAMODB_JOBS_TABLE=FixIt-Jobs
DYNAMODB_MARKETPLACE_USERS_TABLE=MarketplaceUsers

# Cognito (optional - for authentication)
COGNITO_USER_POOL_ID=your_user_pool_id
COGNITO_CLIENT_ID=your_client_id

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. Verify Environment
```bash
npm run verify
```

### 4. Start Server
```bash
npm start
```

Server will start on `http://localhost:3000`

---

## 🧪 Testing

### Run All Tests
```bash
# Test marketplace APIs (hire, services)
npm run test:api

# Test file upload API
npm run test:upload
```

### Manual Testing

#### Test Health Check
```bash
curl http://localhost:3000/health
```

#### Test File Upload
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@path/to/image.jpg" \
  -F "userId=test_user_123" \
  -F "fileType=profile"
```

#### Test Service Request Creation
```bash
curl -X POST http://localhost:3000/api/hire \
  -H "Content-Type: application/json" \
  -d '{
    "workerId": "worker_123",
    "customerId": "customer_456",
    "serviceType": "Plumber",
    "description": "Fix leaking sink"
  }'
```

#### Test Get Service Providers
```bash
curl http://localhost:3000/api/services
curl "http://localhost:3000/api/services?serviceType=Plumber"
```

---

## 📁 Project Structure

```
FixIt/
├── routes/
│   ├── api.js              # API route structure
│   ├── marketplace.js      # Marketplace CRUD endpoints
│   └── upload.js           # File upload endpoint
├── services/
│   └── aws.js              # AWS service helper
├── scripts/
│   ├── verify-env.js       # Environment verification
│   ├── test-api.js         # API test suite
│   └── test-upload.js      # Upload test suite
├── apiClient.js            # Frontend API client
├── awsConfig.js            # Browser AWS SDK config
├── server.js               # Main Express server
├── package.json            # Dependencies
├── .env                    # Environment variables (gitignored)
├── .gitignore              # Git ignore rules
├── index.html              # Landing page
├── login.html              # Login page
├── signup.html             # Signup page
├── owner-dashboard.html    # Service owner dashboard
├── provider-dashboard.html # Service provider dashboard
└── style.css               # Global styles
```

---

## 🔌 API Endpoints

### Marketplace APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/hire` | Create service request |
| GET | `/api/services` | Get service providers |
| GET | `/api/services?serviceType=X` | Filter providers by type |

### File Upload API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload file to S3 |

**Upload Parameters:**
- `file` (multipart): Image file (PNG/JPG, max 5MB)
- `userId` (string): User ID
- `fileType` (string): 'profile' or 'job'

---

## 🎨 Frontend Usage

### Using apiClient.js

The modern API client provides clean methods for all backend operations:

```javascript
// Include in HTML
<script src="apiClient.js"></script>

// Create service request
const response = await apiClient.createServiceRequest({
  workerId: 'worker_123',
  customerId: 'customer_456',
  serviceType: 'Plumber',
  description: 'Fix sink'
});

// Get service providers
const providers = await apiClient.getServiceProviders('Plumber');

// Upload profile picture
const file = document.getElementById('fileInput').files[0];
const result = await apiClient.uploadProfilePicture(file, 'user_123');
console.log('Uploaded:', result.fileUrl);

// Upload job photo
const jobResult = await apiClient.uploadJobPhoto(file, 'worker_456');
```

### Using awsConfig.js

Direct AWS SDK access (for advanced operations):

```javascript
// Include in HTML
<script src="https://sdk.amazonaws.com/js/aws-sdk-2.1450.0.min.js"></script>
<script src="awsConfig.js"></script>

// Initialize AWS (only needed if using direct SDK)
await awsService.initialize(accessKeyId, secretAccessKey);

// Get user profile from DynamoDB
const profile = await awsService.getUserProfile(userId, 'provider');

// Update user profile
await awsService.updateUserProfile(userId, {
  name: 'John Doe',
  serviceType: 'Plumber'
}, 'provider');
```

---

## 🔒 Security Best Practices

### ✅ Implemented
- AWS credentials stored server-side only
- No hardcoded secrets in frontend
- Server-side file validation
- File size limits (5MB)
- File type restrictions (images only)
- Public-read ACL for public resources
- .gitignore for sensitive files

### 🚧 Recommended Enhancements
- Add JWT authentication middleware
- Implement rate limiting
- Add CORS configuration
- Enable HTTPS in production
- Implement request signing
- Add virus scanning for uploads

---

## 📊 Monitoring & Debugging

### Server Logs
The server provides detailed emoji-coded logs:

```
📋 Creating service request
✅ Service request created
❌ Error creating service request
📤 Uploading image
🔍 Filtered to 5 Plumber(s)
```

### Error Handling
- Development mode: Detailed error messages
- Production mode: Generic error messages
- All errors logged server-side
- Client receives appropriate status codes

---

## 🌐 Deployment

### Environment-Specific Configs

**Development:**
```env
NODE_ENV=development
PORT=3000
```

**Production:**
```env
NODE_ENV=production
PORT=80
# Consider using PM2 or similar process manager
```

### Deployment Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong AWS credentials
- [ ] Configure S3 bucket CORS
- [ ] Set up CloudFront CDN (optional)
- [ ] Enable S3 bucket encryption
- [ ] Configure DynamoDB backup
- [ ] Set up monitoring (CloudWatch)
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up logging aggregation

---

## 📚 Documentation

- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API reference
- **[S3_UPLOAD_INTEGRATION_COMPLETE.md](S3_UPLOAD_INTEGRATION_COMPLETE.md)** - Upload implementation details
- **[CRUD_APIS_COMPLETE.md](CRUD_APIS_COMPLETE.md)** - Marketplace API details
- **[SERVER_DEVELOPMENT_COMPLETE.md](SERVER_DEVELOPMENT_COMPLETE.md)** - Server setup guide
- **[AWS_MIGRATION_GUIDE.md](AWS_MIGRATION_GUIDE.md)** - Firebase to AWS migration

---

## 🛠 Troubleshooting

### Server won't start
```bash
# Check environment variables
npm run verify

# Check for port conflicts
lsof -i :3000

# Install dependencies
npm install
```

### Upload fails
- Verify S3 bucket exists
- Check AWS credentials have S3 permissions
- Verify file is under 5MB
- Ensure file is PNG/JPG format
- Check S3 bucket region matches AWS_REGION

### DynamoDB errors
- Verify tables exist in AWS console
- Check table names match .env configuration
- Ensure IAM user has DynamoDB permissions
- Check AWS region is correct

### CORS errors (frontend)
- Ensure server is running
- Check BASE_URL in apiClient.js
- Verify CORS headers in Express (if added)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

---

## 📝 License

ISC

---

## 🎯 Next Steps

### Immediate
1. Configure AWS credentials
2. Create S3 bucket
3. Set up DynamoDB tables
4. Test all endpoints
5. Deploy to production

### Future Enhancements
1. Add real-time notifications (WebSocket/AppSync)
2. Implement payment integration
3. Add rating/review system
4. Create admin dashboard
5. Add advanced search filters
6. Implement chat feature
7. Add geolocation services
8. Create mobile app

---

## 📞 Support

For issues or questions:
1. Check documentation files
2. Review error logs
3. Test with `npm run test:api` and `npm run test:upload`
4. Verify environment configuration

---

**Ready to build amazing marketplace experiences!** 🚀✨
