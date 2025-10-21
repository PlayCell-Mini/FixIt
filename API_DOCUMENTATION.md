# Marketplace API Documentation

## Base URL
```
http://localhost:3000/api
```

---

## Endpoints

### 1. Create Service Request (Hire)

**POST** `/api/hire`

Creates a new service request in the MarketplaceUsers DynamoDB table.

#### Request Body
```json
{
  "workerId": "worker_123",
  "customerId": "customer_456",
  "serviceType": "Plumber",
  "description": "Fix leaking kitchen sink"
}
```

#### Required Fields
- `workerId` (string): ID of the service provider
- `customerId` (string): ID of the customer requesting service
- `serviceType` (string): Type of service (Plumber, Electrician, Carpenter, Painter, Welder)
- `description` (string): Description of the work needed

#### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Service request created successfully",
  "data": {
    "requestId": "req_1234567890_abc123def",
    "workerId": "worker_123",
    "customerId": "customer_456",
    "serviceType": "Plumber",
    "description": "Fix leaking kitchen sink",
    "status": "pending",
    "createdAt": "2025-01-21T10:30:00.000Z",
    "updatedAt": "2025-01-21T10:30:00.000Z"
  }
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "error": "Missing required fields",
  "message": "workerId, customerId, serviceType, and description are required"
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to create service request",
  "details": "Error details (only in development mode)"
}
```

#### cURL Example
```bash
curl -X POST http://localhost:3000/api/hire \
  -H "Content-Type: application/json" \
  -d '{
    "workerId": "worker_123",
    "customerId": "customer_456",
    "serviceType": "Plumber",
    "description": "Fix leaking kitchen sink"
  }'
```

---

### 2. Get Service Providers

**GET** `/api/services`

Fetches a list of all available service providers from the MarketplaceUsers DynamoDB table.

#### Query Parameters (Optional)
- `serviceType` (string): Filter by service type (e.g., `Plumber`, `Electrician`)

#### Success Response (200 OK)
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "requestId": "req_1234567890_abc123def",
      "workerId": "worker_123",
      "customerId": "customer_456",
      "serviceType": "Plumber",
      "description": "Fix leaking kitchen sink",
      "status": "pending",
      "createdAt": "2025-01-21T10:30:00.000Z",
      "updatedAt": "2025-01-21T10:30:00.000Z"
    },
    {
      "requestId": "req_0987654321_xyz789ghi",
      "workerId": "worker_789",
      "customerId": "customer_012",
      "serviceType": "Electrician",
      "description": "Install ceiling fan",
      "status": "pending",
      "createdAt": "2025-01-21T11:00:00.000Z",
      "updatedAt": "2025-01-21T11:00:00.000Z"
    }
  ],
  "filter": null
}
```

#### Success Response with Filter (200 OK)
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "requestId": "req_1234567890_abc123def",
      "workerId": "worker_123",
      "customerId": "customer_456",
      "serviceType": "Plumber",
      "description": "Fix leaking kitchen sink",
      "status": "pending",
      "createdAt": "2025-01-21T10:30:00.000Z",
      "updatedAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "filter": "Plumber"
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to fetch service providers",
  "details": "Error details (only in development mode)"
}
```

#### cURL Examples

**Get all service providers:**
```bash
curl http://localhost:3000/api/services
```

**Filter by service type:**
```bash
curl "http://localhost:3000/api/services?serviceType=Plumber"
```

---

## Testing with JavaScript (Fetch API)

### Create Service Request
```javascript
fetch('http://localhost:3000/api/hire', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workerId: 'worker_123',
    customerId: 'customer_456',
    serviceType: 'Plumber',
    description: 'Fix leaking kitchen sink'
  })
})
  .then(response => response.json())
  .then(data => console.log('Service request created:', data))
  .catch(error => console.error('Error:', error));
```

### Get Service Providers
```javascript
fetch('http://localhost:3000/api/services')
  .then(response => response.json())
  .then(data => console.log('Service providers:', data))
  .catch(error => console.error('Error:', error));
```

### Get Filtered Service Providers
```javascript
fetch('http://localhost:3000/api/services?serviceType=Plumber')
  .then(response => response.json())
  .then(data => console.log('Plumbers:', data))
  .catch(error => console.error('Error:', error));
```

---

## Valid Service Types

- Plumber
- Electrician
- Carpenter
- Painter
- Welder

---

## Error Handling

All endpoints implement robust error handling:

### Server-Side
- ✅ Try/catch blocks around all DynamoDB operations
- ✅ Detailed error logging with `console.error()`
- ✅ Appropriate HTTP status codes
- ✅ Development mode error details

### Client-Side
- ✅ Validation errors return 400 Bad Request
- ✅ Server errors return 500 Internal Server Error
- ✅ Success responses return 200/201 with data

### Error Log Example
```
❌ Error creating service request: ValidationException: One or more parameter values were invalid
```

---

## DynamoDB Table Structure

### MarketplaceUsers Table

#### Item Schema
```javascript
{
  requestId: "req_1234567890_abc123def",  // Primary Key (generated)
  workerId: "worker_123",                  // Service provider ID
  customerId: "customer_456",              // Customer ID
  serviceType: "Plumber",                  // Service category
  description: "Fix leaking kitchen sink", // Work description
  status: "pending",                       // Request status
  createdAt: "2025-01-21T10:30:00.000Z",  // ISO timestamp
  updatedAt: "2025-01-21T10:30:00.000Z"   // ISO timestamp
}
```

---

## Testing Checklist

- [ ] POST /api/hire with valid data
- [ ] POST /api/hire with missing fields
- [ ] POST /api/hire with invalid service type
- [ ] GET /api/services (all)
- [ ] GET /api/services?serviceType=Plumber
- [ ] Verify error handling (500 errors)
- [ ] Check DynamoDB table for created items
- [ ] Verify console logs on server

---

## Next Steps

Potential enhancements:
1. Add authentication middleware
2. Implement pagination for large datasets
3. Add more filters (status, date range, etc.)
4. Create UPDATE and DELETE endpoints
5. Add request validation middleware
6. Implement rate limiting
