# Site Setup System Testing Guide

## Overview
This guide provides comprehensive testing instructions for validating all recent changes to the Site Setup system. The changes include URL validation, normalization, Shopify integration, domain auto-detection, and form validation improvements.

## Prerequisites
- Server running on http://localhost:3000
- Access to browser developer tools
- Test Shopify credentials (ecominter.myshopify.com)

## Testing Categories

### 1. URL Validation and Normalization Testing

#### Test Cases:
1. **Basic Domain Input (clipia.fi)**
   - Navigate to: http://localhost:3000/admin/site-setup
   - Enter "clipia.fi" in Site URL field
   - **Expected**: Field should accept input without red validation border
   - **On blur**: Should auto-normalize to "https://clipia.fi"

2. **Domain with www (www.clipia.fi)**
   - Enter "www.clipia.fi" in Site URL field
   - **Expected**: Should normalize to "https://clipia.fi" on blur

3. **Domain with protocol (http://clipia.fi)**
   - Enter "http://clipia.fi" in Site URL field
   - **Expected**: Should normalize to "https://clipia.fi" on blur

4. **Full URL (https://www.clipia.fi)**
   - Enter "https://www.clipia.fi" in Site URL field
   - **Expected**: Should normalize to "https://clipia.fi" on blur

#### Validation Points:
- ✅ No red validation borders while typing
- ✅ Auto-normalization occurs on field blur
- ✅ Final URL format is always "https://domain.tld"
- ✅ www. prefix is removed

### 2. Domain Auto-Detection Testing

#### Test the API directly:
```bash
# Test clipia.fi detection
curl -X POST http://localhost:3000/api/detect-domain-info \
  -H "Content-Type: application/json" \
  -d '{"domain": "clipia.fi"}'

# Expected Response:
{
  "success": true,
  "domain": "clipia.fi",
  "detected": {
    "country": "FI",
    "currency": "EUR", 
    "language": "fi"
  },
  "confidence": "high"
}
```

#### Browser Testing:
1. Enter "clipia.fi" in Site URL field
2. Wait 1-2 seconds after typing
3. **Expected**: Auto-detection results should appear showing:
   - Country: FI
   - Currency: EUR
   - Language: fi

#### Test Multiple Domains:
- **clipia.fi** → FI/EUR/fi
- **example.de** → DE/EUR/de
- **test.co.uk** → GB/GBP/en
- **example.com** → US/USD/en

### 3. Support Email Auto-Population Testing

1. Enter domain in Site URL field (e.g., "clipia.fi")
2. Check if Support Email field auto-populates with "info@clipia.fi"
3. **Expected**: Email field should be automatically filled
4. **Note**: Should not overwrite if user has already entered an email

### 4. Form Submission Testing

#### Test with clipia.fi domain:
1. **Step 1 - Basic Info:**
   - Site URL: "clipia.fi"
   - Brand Name: "Test Store"
   - Verify auto-detection works
   - Click "Continue"

2. **Step 2 - Shopify Connection:**
   - Domain: "ecominter.myshopify.com" (pre-filled)
   - Token: Enter test token or use "Test Connection"
   - **Expected**: Should show real product count (not random numbers)
   - Click "Continue"

3. **Step 3 - Page Selection:**
   - Required pages (Home, Products) should be pre-selected
   - Select additional pages as needed
   - Click "Continue"

4. **Step 4 - Global Settings:**
   - Fill in shipping and return policies
   - Enable/disable features as needed
   - Click "Launch Store!"

#### Validation Points:
- ✅ No "Valid domain is required" errors
- ✅ Form progresses through all steps
- ✅ Hidden fields (step, country, language, currency) are populated
- ✅ Store creation completes successfully

### 5. Shopify Integration Testing

#### Real Credentials Test:
```bash
curl -X POST http://localhost:3000/api/validate-shopify \
  -H "Content-Type: application/json" \
  -d '{
    "shopifyDomain": "ecominter.myshopify.com",
    "accessToken": "YOUR_REAL_TOKEN"
  }'
```

#### Browser Testing:
1. Go to Step 2 of Site Setup
2. Enter Shopify credentials
3. Click "Test Connection"
4. **Expected**: 
   - Shows actual product count (not random)
   - No fake "demo mode" responses
   - Proper error handling for invalid credentials

### 6. Form Field Type Changes Testing

1. Inspect Site URL field in browser developer tools
2. **Expected**: Should be `<input type="text">` not `<input type="url">`
3. **Reason**: Prevents premature browser validation while typing

### 7. Error Handling Testing

#### Test Invalid Inputs:
1. **Empty domain**: Should show validation error
2. **Invalid domain**: Should show validation error
3. **Invalid Shopify credentials**: Should show proper error message
4. **Missing required fields**: Should show field-specific errors

#### Test Domain Conflicts:
1. Try to create store with existing domain
2. **Expected**: Should show domain conflict error
3. Should redirect back to form with error message

### 8. End-to-End Store Creation

#### Complete Flow Test:
1. Start at http://localhost:3000/admin/site-setup
2. Use domain: "clipia.fi"
3. Complete all 4 steps
4. **Expected**: 
   - Store created successfully
   - No validation errors
   - Redirected to success page
   - Store accessible in admin dashboard

### 9. API Endpoint Testing

#### Test All Endpoints:
```bash
# Countries API
curl http://localhost:3000/api/countries

# Page Templates
curl http://localhost:3000/api/page-templates  

# Domain Check
curl -X POST http://localhost:3000/api/check-domain \
  -H "Content-Type: application/json" \
  -d '{"domain": "clipia.fi"}'

# Domain Detection
curl -X POST http://localhost:3000/api/detect-domain-info \
  -H "Content-Type: application/json" \
  -d '{"domain": "clipia.fi"}'
```

### 10. Frontend JavaScript Testing

#### Browser Console Tests:
```javascript
// Test URL normalization function
normalizeURL('clipia.fi')           // Should return 'https://clipia.fi'
normalizeURL('www.clipia.fi')       // Should return 'https://clipia.fi'
normalizeURL('http://clipia.fi')    // Should return 'https://clipia.fi'

// Test validation function
isValidURL('clipia.fi')             // Should return true
isValidURL('invalid')               // Should return false

// Test detection data
getDetectionData('fi')              // Should return {country: 'FI', currency: 'EUR', language: 'fi'}
```

## Key Changes Validated

### ✅ Fixed Issues:
1. **URL Validation**: No red borders while typing
2. **URL Normalization**: "clipia.fi" → "https://clipia.fi"
3. **Domain Detection**: .fi domains correctly detected as Finland/EUR
4. **Form Validation**: Hidden fields properly set
5. **Shopify Integration**: Real product counts, no demo mode
6. **Support Email**: Auto-populated as "info@domain.com"
7. **Field Types**: URL inputs changed to text inputs

### ✅ New Features:
1. **Auto-detection API**: `/api/detect-domain-info`
2. **Enhanced validation**: Better error handling
3. **Improved UX**: Smoother form interactions
4. **Finland support**: Added to country mappings

## Testing Checklist

- [ ] URL normalization works for all formats
- [ ] Domain auto-detection shows correct country/currency
- [ ] Support email auto-populates correctly
- [ ] Form submits without validation errors
- [ ] Shopify connection shows real product counts
- [ ] All 4 form steps work properly
- [ ] Store creation completes successfully
- [ ] No "Valid domain is required" errors
- [ ] clipia.fi domain works end-to-end
- [ ] All API endpoints respond correctly

## Troubleshooting

### Common Issues:
1. **Server not updated**: Restart the server to pick up code changes
2. **Cache issues**: Clear browser cache and hard refresh
3. **API errors**: Check server logs for detailed error messages
4. **Form validation**: Ensure all required fields are filled

### Debug Commands:
```bash
# Check server status
curl http://localhost:3000/

# Test specific domain
curl -X POST http://localhost:3000/api/detect-domain-info \
  -H "Content-Type: application/json" \
  -d '{"domain": "clipia.fi"}' | jq

# Check logs
tail -f server.log  # if logging to file
```

## Success Criteria

All tests should pass with:
- ✅ URL normalization working smoothly
- ✅ Real Shopify data displaying correctly  
- ✅ Auto-detection populating form fields
- ✅ Store creation completing successfully
- ✅ No validation errors blocking form submission
- ✅ clipia.fi domain working end-to-end

## Notes for Developers

- Server restart required after code changes
- Test with multiple domain TLDs to verify mappings
- Check both frontend and backend validation
- Verify database updates are working
- Test error scenarios as well as success paths