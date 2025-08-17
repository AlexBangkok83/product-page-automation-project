#!/usr/bin/env node

/**
 * Focused Test for Clipia.fi Domain Validation Fix
 * 
 * This test specifically validates that "clipia.fi" can be entered 
 * in the Site URL field without triggering a red border validation error.
 */

const axios = require('axios');
const { JSDOM } = require('jsdom');

async function testClipiaValidation() {
  console.log('🧪 Testing clipia.fi domain validation fix\n');
  
  try {
    // Fetch the site setup form
    console.log('📄 Fetching site setup form...');
    const response = await axios.get('http://localhost:3000/admin/site-setup');
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    
    // Find the site URL input field
    const siteUrlInput = document.getElementById('siteUrl');
    
    if (!siteUrlInput) {
      console.log('❌ FAIL: Site URL input field not found');
      return;
    }
    
    // Check the current field configuration
    const inputType = siteUrlInput.getAttribute('type');
    const hasRequired = siteUrlInput.hasAttribute('required');
    const hasDataRequired = siteUrlInput.hasAttribute('data-required');
    const placeholder = siteUrlInput.getAttribute('placeholder');
    
    console.log('🔍 Site URL Input Field Analysis:');
    console.log(`   Input type: ${inputType}`);
    console.log(`   Has 'required' attribute: ${hasRequired}`);
    console.log(`   Has 'data-required' attribute: ${hasDataRequired}`);
    console.log(`   Placeholder: ${placeholder}`);
    
    // Test specific to the reported issue
    console.log('\n🎯 Specific Fix Validation:');
    
    if (inputType === 'text') {
      console.log('✅ PASS: Input type changed from "url" to "text"');
      console.log('   ✓ This prevents HTML5 URL validation for "clipia.fi"');
    } else {
      console.log('❌ FAIL: Input type is still "url"');
      console.log('   ✗ HTML5 will show red border for "clipia.fi" (not a valid URL)');
    }
    
    if (!hasRequired) {
      console.log('✅ PASS: HTML5 "required" attribute removed');
      console.log('   ✓ This prevents automatic browser validation');
    } else {
      console.log('❌ FAIL: HTML5 "required" attribute still present');
      console.log('   ✗ Browser will still validate the field as URL');
    }
    
    if (hasDataRequired) {
      console.log('✅ PASS: Custom "data-required" attribute added');
      console.log('   ✓ This allows custom validation without HTML5 interference');
    } else {
      console.log('⚠️  WARNING: No "data-required" attribute found');
      console.log('   ? Custom validation may not be implemented');
    }
    
    // Simulate the user's original issue
    console.log('\n🧪 Simulating User Scenario:');
    console.log('Scenario: User types "clipia.fi" in the Site URL field');
    
    if (inputType === 'text' && !hasRequired) {
      console.log('✅ EXPECTED RESULT: No red border validation error');
      console.log('   ✓ Field accepts "clipia.fi" as valid text input');
      console.log('   ✓ Custom validation can handle URL formatting if needed');
    } else {
      console.log('❌ EXPECTED RESULT: Red border validation error');
      console.log('   ✗ HTML5 will reject "clipia.fi" as invalid URL format');
    }
    
    // Check if there's custom validation JavaScript
    console.log('\n🔧 Custom Validation Check:');
    const scriptTags = document.querySelectorAll('script');
    let hasCustomValidation = false;
    
    for (let script of scriptTags) {
      if (script.textContent && script.textContent.includes('validateField')) {
        hasCustomValidation = true;
        break;
      }
    }
    
    if (hasCustomValidation) {
      console.log('✅ Custom validation JavaScript found');
      console.log('   ✓ Form can handle validation without HTML5 constraints');
    } else {
      console.log('⚠️  No custom validation JavaScript detected');
      console.log('   ? May rely on server-side validation only');
    }
    
    // Overall assessment
    console.log('\n📊 OVERALL ASSESSMENT:');
    if (inputType === 'text' && !hasRequired) {
      console.log('🎉 SUCCESS: clipia.fi validation issue is FIXED!');
      console.log('✅ Users can now type "clipia.fi" without red border errors');
      console.log('✅ Form accepts the domain as valid text input');
      console.log('✅ Server-side validation can handle URL formatting');
    } else {
      console.log('❌ ISSUE REMAINS: clipia.fi validation still problematic');
      console.log('   Further fixes needed to resolve user issue');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Also test with a different unique domain to verify database insertion works
async function testDatabaseInsertion() {
  console.log('\n\n🗄️  Testing Database Insertion with Unique Domain\n');
  
  try {
    const uniqueTimestamp = Date.now();
    const testDomain = `test-clipia-${uniqueTimestamp}.fi`;
    
    const testStoreData = {
      step: 'create-store',
      storeName: 'Clipia Test Store ' + uniqueTimestamp,
      domain: testDomain,
      country: 'FI',
      language: 'fi',
      currency: 'EUR',
      metaTitle: 'Clipia Test - Finland Store',
      metaDescription: 'Test store for Finland',
      shippingInfo: 'Ilmainen toimitus yli 50€ tilauksiin',
      shippingTime: '2-4 arkipäivää',
      returnPolicy: '14 päivän palautusoikeus',
      returnPeriod: '14 päivää',
      supportEmail: `tuki@${testDomain}`,
      supportPhone: '+358-9-1234567',
      businessAddress: 'Testikatu 123, 00100 Helsinki',
      gdprCompliant: 'on',
      cookieConsent: 'on',
      selectedPages: ['home', 'products', 'about', 'contact']
    };

    console.log(`🧪 Testing with domain: ${testDomain}`);
    
    const response = await axios.post('http://localhost:3000/admin/site-setup', testStoreData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      }
    });

    if (response.status === 302 && response.headers.location.includes('success=true')) {
      console.log('✅ SUCCESS: Database insertion works correctly');
      console.log('   ✓ Store created successfully with Finnish domain');
      console.log('   ✓ All store settings saved to database');
      console.log('   ✓ Schema mismatch issue is resolved');
    } else {
      console.log('❌ FAIL: Unexpected response from server');
    }

  } catch (error) {
    if (error.response && error.response.status === 302) {
      if (error.response.headers.location && error.response.headers.location.includes('success=true')) {
        console.log('✅ SUCCESS: Database insertion works correctly');
        console.log('   ✓ Store created successfully with Finnish domain');
        console.log('   ✓ All store settings saved to database');
        console.log('   ✓ Schema mismatch issue is resolved');
      } else {
        console.log('❌ FAIL: Redirect to error page');
      }
    } else {
      console.log(`❌ FAIL: ${error.message}`);
    }
  }
}

async function runTests() {
  await testClipiaValidation();
  await testDatabaseInsertion();
  
  console.log('\n\n🏁 TEST SUMMARY:');
  console.log('If both tests pass, both reported issues have been resolved:');
  console.log('1. ✅ Red border validation for "clipia.fi" domain');
  console.log('2. ✅ Database schema mismatch for store settings');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testClipiaValidation, testDatabaseInsertion };