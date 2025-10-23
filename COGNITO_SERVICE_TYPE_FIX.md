# Cognito Custom Attributes Configuration Report

## Key Findings

### ✅ Working Configuration
- The `custom:role` attribute is properly configured and working correctly
- Basic user signup with `custom:role` succeeds with status 201

### ❌ Issue Identified
- The `custom:serviceType` attribute is not working despite being added to Cognito
- All signup attempts with `custom:serviceType` fail with: "Type for attribute {custom:serviceType} could not be determined"

## Diagnostic Results

### Test 1: Basic Signup with Role Only
- **Status**: SUCCESS (201)
- **Attributes Sent**: `name`, `custom:role`
- **Conclusion**: Custom attributes are working when properly configured

### Test 2: Signup with Role and ServiceType
- **Status**: FAILED (400)
- **Error**: "Type for attribute {custom:serviceType} could not be determined"
- **Attributes Sent**: `name`, `custom:role`, `custom:serviceType`
- **Conclusion**: Issue is specifically with `custom:serviceType` attribute

### Test 3: Attribute Name Variations
- **Status**: ALL FAILED
- **Tested Names**: 
  - `custom:serviceType`
  - `custom:servicetype`
  - `custom:service_type`
  - `custom:ServiceType`
  - `custom:service-type`
- **Conclusion**: Issue is not with attribute name spelling or case

## Root Cause Analysis

The error "Type for attribute {custom:serviceType} could not be determined" indicates that while the attribute exists in the Cognito User Pool, there's an issue with its schema definition.

## Required Cognito Configuration Fix

Based on AWS Cognito documentation, when adding custom attributes, you must ensure:

1. **Attribute Data Type**: The `custom:serviceType` attribute must be explicitly defined as a **String** type
2. **Write Permissions**: The attribute must have write permissions enabled for the app client
3. **Schema Consistency**: The attribute must be consistently defined in the user pool schema

## Verification Steps

To fix this issue, please verify the following in the AWS Cognito Console:

1. Navigate to your User Pool
2. Go to "Attributes" → "Custom attributes"
3. Find `custom:serviceType` and verify:
   - **Attribute name**: Exactly `serviceType` (without the `custom:` prefix)
   - **Data type**: Set to **String**
   - **Mutable**: Set to **Yes**
4. Go to "App integration" → "App client settings"
5. Ensure the app client has write permissions for custom attributes

## Code Status

The Node.js application code is correctly:
- Constructing the UserAttributes array
- Using the correct attribute name format (`custom:serviceType`)
- Sending properly formatted data to Cognito
- Excluding prohibited attributes
- Implementing proper validation

No further code changes are needed.