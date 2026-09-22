# Cognito Attribute Validation Fix Summary

## Issues Identified

### 1. Custom Attribute Schema Issue
The error `Type for attribute {custom:serviceType} could not be determined` indicates that the custom attributes are not properly defined in the Cognito User Pool schema.

### 2. Required Address Attribute
The error `addresses: The attribute addresses is required` indicates that the address attribute is required by the Cognito User Pool but is not being properly sent.

## Code Fixes Implemented

### 1. Excluded Prohibited Attributes
Updated the code to exclude prohibited attributes:
- `sub` (managed by Cognito)
- `email_verified` (managed by Cognito)
- `phone_number_verified` (managed by Cognito)

### 2. Added Required Address Attribute
Added the address attribute to the UserAttributes array since it's required by the Cognito User Pool.

### 3. Implemented Strict Conditional Logic
Ensured that only non-empty attributes are included in the final array.

## Current Payload Structure

The server is now sending the following attributes:

For Provider Signup:
```json
[
  {
    "Name": "name",
    "Value": "Fixed Test Electrician Provider"
  },
  {
    "Name": "address",
    "Value": "789 Fixed Electric Avenue, Test City"
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

For Owner Signup:
```json
[
  {
    "Name": "name",
    "Value": "Fixed Test Owner"
  },
  {
    "Name": "address",
    "Value": "123 Fixed Test Street, Test City"
  },
  {
    "Name": "custom:role",
    "Value": "owner"
  }
]
```

## Root Cause Analysis

The issues are still occurring due to AWS Cognito User Pool configuration problems, not code issues:

1. **Custom Attributes Not Defined**: The `custom:role` and `custom:serviceType` attributes need to be explicitly defined in the Cognito User Pool schema with their data types.

2. **Attribute Write Permissions**: These custom attributes need to have write permissions enabled for the app client.

## Required AWS Configuration

To fix these issues, the following changes need to be made in the AWS Cognito User Pool:

1. Navigate to the User Pool in AWS Console
2. Go to "Attributes" section
3. Add custom attributes:
   - `custom:role` (String)
   - `custom:serviceType` (String)
4. Ensure these attributes have write permissions for the app client
5. Verify that the `address` attribute is properly configured as required

## Code Status

The Node.js server code is correctly:
1. Constructing the UserAttributes array
2. Excluding prohibited attributes
3. Including required attributes
4. Sending properly formatted data to Cognito

No further code changes are needed. The issue is purely with the AWS Cognito configuration.