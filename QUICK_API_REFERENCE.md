# Quick Start Guide - Marketplace APIs

## 🚀 Start Server
```bash
npm start
```

## 🧪 Test APIs
```bash
npm run test:api
```

## 📋 Endpoints

### Create Service Request
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

### Get All Services
```bash
curl http://localhost:3000/api/services
```

### Filter Services
```bash
curl "http://localhost:3000/api/services?serviceType=Plumber"
```

## 📚 Documentation
- Full API docs: `API_DOCUMENTATION.md`
- Implementation details: `CRUD_APIS_COMPLETE.md`
