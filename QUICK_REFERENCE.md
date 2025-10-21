# FixIt - Quick Reference Card

## 🚀 Getting Started (30 seconds)

```bash
# 1. Install
npm install

# 2. Configure .env (add your AWS credentials)
# 3. Start
npm start

# 4. Test
npm run test:api
npm run test:upload
```

---

## 📡 API Endpoints

### Marketplace
```bash
# Create service request
POST /api/hire
Body: { workerId, customerId, serviceType, description }

# Get providers
GET /api/services?serviceType=Plumber
```

### Upload
```bash
# Upload file
POST /api/upload
FormData: file, userId, fileType
```

### Health
```bash
GET /health
```

---

## 💻 Frontend Usage

```javascript
// Include apiClient
<script src="apiClient.js"></script>

// Create service request
await apiClient.createServiceRequest({...});

// Get providers
await apiClient.getServiceProviders('Plumber');

// Upload profile picture
await apiClient.uploadProfilePicture(file, userId);

// Upload job photo  
await apiClient.uploadJobPhoto(file, userId);
```

---

## 🧪 Testing

```bash
# Test marketplace APIs
npm run test:api

# Test upload API
npm run test:upload

# Verify environment
npm run verify
```

---

## 📁 Key Files

```
routes/upload.js          # Upload endpoint
apiClient.js              # Frontend API client
server.js                 # Main server
awsConfig.js              # AWS SDK config
.env                      # Configuration
```

---

## 🔒 Environment Variables

```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET=fixit-profile-images
DYNAMODB_MARKETPLACE_USERS_TABLE=MarketplaceUsers
PORT=3000
NODE_ENV=development
```

---

## 🐛 Troubleshooting

```bash
# Server won't start
npm run verify

# Upload fails
# → Check S3 bucket exists
# → Verify AWS credentials
# → Check file size < 5MB

# CORS errors
# → Ensure server running
# → Check BASE_URL
```

---

## 📚 Documentation

- **QUICK_START.md** - Full getting started guide
- **API_DOCUMENTATION.md** - Complete API reference
- **S3_UPLOAD_INTEGRATION_COMPLETE.md** - Upload implementation
- **IMPLEMENTATION_SUMMARY.md** - What was built

---

## ✅ Quick Checklist

Setup:
- [ ] Run `npm install`
- [ ] Configure `.env` with AWS credentials
- [ ] Create S3 bucket
- [ ] Create DynamoDB tables
- [ ] Run `npm run verify`
- [ ] Start server with `npm start`

Testing:
- [ ] Test health: `curl http://localhost:3000/health`
- [ ] Run marketplace tests: `npm run test:api`
- [ ] Run upload tests: `npm run test:upload`
- [ ] Test frontend dashboards

---

**Happy coding! 🚀**
