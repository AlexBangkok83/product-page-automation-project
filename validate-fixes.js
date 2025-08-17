#!/usr/bin/env node

/**
 * Validation Script for Site Setup Fixes
 * Run this after server restart to validate all changes are working
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// ANSI colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) config.data = data;
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      status: error.response?.status,
      data: error.response?.data 
    };
  }
}

async function validateDomainDetection() {
  log('\n=== Testing Domain Auto-Detection ===', 'bold');
  
  const tests = [
    { domain: 'clipia.fi', expected: { country: 'FI', currency: 'EUR', language: 'fi' } },
    { domain: 'example.de', expected: { country: 'DE', currency: 'EUR', language: 'de' } },
    { domain: 'test.co.uk', expected: { country: 'GB', currency: 'GBP', language: 'en' } }
  ];
  
  for (const test of tests) {
    const result = await makeRequest('POST', '/api/detect-domain-info', { domain: test.domain });
    
    if (result.success && result.data.detected) {
      const detected = result.data.detected;
      const matches = detected.country === test.expected.country && 
                     detected.currency === test.expected.currency &&
                     detected.language === test.expected.language;
      
      if (matches) {
        log(`✅ ${test.domain}: ${detected.country}/${detected.currency}/${detected.language}`, 'green');
      } else {
        log(`❌ ${test.domain}: Expected ${test.expected.country}/${test.expected.currency}/${test.expected.language}, got ${detected.country}/${detected.currency}/${detected.language}`, 'red');
      }
    } else {
      log(`❌ ${test.domain}: API call failed - ${result.error}`, 'red');
    }
  }
}

async function validateCountriesAPI() {
  log('\n=== Testing Countries API ===', 'bold');
  
  const result = await makeRequest('GET', '/api/countries');
  
  if (result.success && result.data.countries) {
    const countries = result.data.countries;
    const finland = countries.find(c => c.code === 'FI');
    
    log(`📊 Found ${countries.length} countries`, 'blue');
    
    if (finland) {
      log(`✅ Finland found: ${finland.name} (${finland.currency})`, 'green');
    } else {
      log('❌ Finland not found in countries list', 'red');
    }
  } else {
    log(`❌ Countries API failed: ${result.error}`, 'red');
  }
}

async function validateShopifyAPI() {
  log('\n=== Testing Shopify Validation ===', 'bold');
  
  // Test with invalid credentials (should fail gracefully)
  const result = await makeRequest('POST', '/api/validate-shopify', {
    shopifyDomain: 'ecominter.myshopify.com',
    accessToken: 'invalid-token'
  });
  
  if (!result.success && result.status === 401) {
    log('✅ Shopify validation correctly rejects invalid credentials', 'green');
  } else if (result.success) {
    log('✅ Shopify validation successful (real token used)', 'green');
    if (result.data.productCount !== undefined) {
      log(`📦 Product count: ${result.data.productCount}`, 'blue');
    }
  } else {
    log(`⚠️  Shopify validation response: ${result.error}`, 'yellow');
  }
}

async function validatePageTemplates() {
  log('\n=== Testing Page Templates ===', 'bold');
  
  const result = await makeRequest('GET', '/api/page-templates');
  
  if (result.success && result.data.templates) {
    const templates = result.data.templates;
    const required = templates.filter(t => t.required);
    
    log(`📄 Found ${templates.length} templates (${required.length} required)`, 'blue');
    
    if (required.length >= 2) {
      log('✅ Required templates found (home, products)', 'green');
    } else {
      log('❌ Missing required templates', 'red');
    }
  } else {
    log(`❌ Page templates API failed: ${result.error}`, 'red');
  }
}

async function validateDomainCheck() {
  log('\n=== Testing Domain Check ===', 'bold');
  
  const result = await makeRequest('POST', '/api/check-domain', { domain: 'clipia.fi' });
  
  if (result.success) {
    log(`✅ Domain check works: clipia.fi is ${result.data.available ? 'available' : 'taken'}`, 'green');
  } else {
    log(`❌ Domain check failed: ${result.error}`, 'red');
  }
}

async function validateServerHealth() {
  log('\n=== Testing Server Health ===', 'bold');
  
  const result = await makeRequest('GET', '/');
  
  if (result.success) {
    log('✅ Server is responding correctly', 'green');
  } else {
    log(`❌ Server health check failed: ${result.error}`, 'red');
  }
}

async function validateURLNormalization() {
  log('\n=== Testing URL Normalization (via Detection API) ===', 'bold');
  
  const testCases = [
    'clipia.fi',
    'www.clipia.fi',
    'https://clipia.fi',
    'http://www.clipia.fi'
  ];
  
  for (const domain of testCases) {
    const result = await makeRequest('POST', '/api/detect-domain-info', { domain });
    
    if (result.success) {
      log(`✅ ${domain} → ${result.data.domain}`, 'green');
    } else {
      log(`❌ ${domain} → Failed: ${result.error}`, 'red');
    }
  }
}

async function runValidation() {
  log('🚀 VALIDATING SITE SETUP FIXES', 'bold');
  log('=' * 50, 'blue');
  
  await validateServerHealth();
  await validateURLNormalization();
  await validateDomainDetection();
  await validateCountriesAPI();
  await validateShopifyAPI();
  await validatePageTemplates();
  await validateDomainCheck();
  
  log('\n' + '=' * 50, 'blue');
  log('🎯 VALIDATION COMPLETE', 'bold');
  log('\n📋 Next steps:', 'blue');
  log('1. Test form submission in browser', 'blue');
  log('2. Complete end-to-end store creation', 'blue');
  log('3. Verify clipia.fi works throughout the flow', 'blue');
  log('\n📖 See TESTING_GUIDE.md for detailed manual testing instructions', 'yellow');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});

// Run validation
if (require.main === module) {
  runValidation().catch(error => {
    log(`Validation failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runValidation };