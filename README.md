# FixIt - Service Marketplace WebApp

A clean, minimal service marketplace platform powered by AWS.

## 🏗️ Architecture

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js + Express
- **Cloud**: AWS (S3, DynamoDB, Cognito)

## 📦 Installation

```bash
# Install dependencies
npm install

# Configure environment
# Edit .env with your AWS credentials

# Run server
npm start
```

Server runs on `http://localhost:3000`

## 🔧 Configuration

Edit `.env` file with your AWS credentials:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION (default: ap-south-1)

## 📁 Project Structure

```
FixIt/
├── index.html              # Landing page
├── login.html              # Login page
├── signup.html             # Signup page
├── owner-dashboard.html    # Service owner dashboard
├── provider-dashboard.html # Service provider dashboard
├── style.css               # Styles
├── awsConfig.js           # AWS SDK configuration
├── server.js              # Express server
├── package.json           # Dependencies
└── .env                   # Environment variables
```

## 🚀 Features

- User authentication (AWS Cognito)
- Profile management with image upload (S3)
- Service marketplace (DynamoDB)
- Clean, responsive UI

## ⚠️ Security

- Never commit `.env` file
- Use environment variables for credentials
- Consider using AWS Cognito Identity Pool for production

## 📚 Documentation

- AWS SDK: https://docs.aws.amazon.com/sdk-for-javascript/
- Express: https://expressjs.com/

---

**Status**: Refactored & Clean ✅
