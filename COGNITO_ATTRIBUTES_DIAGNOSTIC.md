# Cognito Custom Attributes Diagnostic Report

## Issue Summary
The server is correctly constructing and sending the UserAttributes array to Cognito, but Cognito is unable to determine the type for the `custom:serviceType` attribute.

## Diagnostic Output
From the server logs, we can see the exact payload being sent to Cognito:

```json
Cognito Payload Attributes:  [
  {
    "Name": "email",
    "Value": "electrician_test_1761213192874@example.com"
  },
  {
    "Name": "name",
    "Value": "Test Electrician Provider"
  },
  {
    "Name": "address",
    "Value": "789 Electric Avenue, Test City"
  },
  {
    "Name": "custom:role",
    "Value": "provider"
  },
  {
    "Name": "custom:serviceType",
    "Value": "Electrician"
  }
]
```

## Error Analysis
The error message is:
```
InvalidParameterException: Attributes did not conform to the schema: Type for attribute {custom:serviceType} could not be determined
```

This indicates that while the attribute is being sent correctly, Cognito doesn't recognize the `custom:serviceType` attribute because it's not properly configured in the User Pool schema.

## Root Cause
The issue is not with the Node.js code, but with the AWS Cognito User Pool configuration. The custom attributes need to be explicitly defined in the Cognito User Pool schema with their data types.

## Required Fix
In the AWS Cognito User Pool console:
1. Navigate to the User Pool
2. Go to "Attributes" section
3. Add custom attributes:
   - `custom:role` (String)
   - `custom:serviceType` (String)
4. Ensure these attributes have write permissions for the app client

## Code Verification
The Node.js code is correctly:
1. Constructing the UserAttributes array
2. Adding standard attributes (email, name, address)
3. Adding custom attributes (custom:role, custom:serviceType)
4. Sending the payload to Cognito

No changes are needed in the code. The issue is purely with the AWS Cognito configuration.