#!/usr/bin/env node

/**
 * Test Suite for Site Setup Form Fixes
 * 
 * This test validates the two critical fixes:
 * 1. Red border validation issue with "clipia.fi" domain
 * 2. Database schema mismatch for store settings
 */

const axios = require('axios');
const { JSDOM } = require('jsdom');

const BASE_URL = 'http://localhost:3000';

class FixValidationTest {
  constructor() {
    this.results = {
      issue1_redBorderFix: null,
      issue2_databaseSchema: null,
      formSubmissionTest: null,
      validationTest: null
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Site Setup Form Fix Validation Tests\n');
    
    try {
      await this.testIssue1_RedBorderFix();
      await this.testIssue2_DatabaseSchema();
      await this.testCompleteFormFlow();
      await this.testValidationStillWorks();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    }
  }

  async testIssue1_RedBorderFix() {
    console.log('🔍 Testing Issue #1: Red border validation fix...');
    
    try {
      // Fetch the site setup form
      const response = await axios.get(`${BASE_URL}/admin/site-setup`);
      const dom = new JSDOM(response.data);
      const document = dom.window.document;
      
      // Find the site URL input field
      const siteUrlInput = document.getElementById('siteUrl');
      
      if (!siteUrlInput) {
        this.results.issue1_redBorderFix = 'FAIL - Site URL input field not found';
        return;
      }
      
      // Check if the input type has been changed from 'url' to 'text'
      const inputType = siteUrlInput.getAttribute('type');
      const hasRequired = siteUrlInput.hasAttribute('required');
      const hasDataRequired = siteUrlInput.hasAttribute('data-required');
      
      console.log(`  Input type: ${inputType}`);
      console.log(`  Has 'required' attribute: ${hasRequired}`);
      console.log(`  Has 'data-required' attribute: ${hasDataRequired}`);
      
      if (inputType === 'text' && !hasRequired && hasDataRequired) {
        this.results.issue1_redBorderFix = 'PASS - Input type changed to text, required attribute removed, data-required added';
      } else if (inputType === 'url') {
        this.results.issue1_redBorderFix = 'FAIL - Input type is still "url", needs to be changed to "text"';
      } else if (hasRequired) {
        this.results.issue1_redBorderFix = 'FAIL - Required attribute still present, should be removed';
      } else {
        this.results.issue1_redBorderFix = 'PARTIAL - Some fixes applied but not complete';
      }
      
    } catch (error) {
      this.results.issue1_redBorderFix = `FAIL - Error testing: ${error.message}`;
    }
    
    console.log(`  Result: ${this.results.issue1_redBorderFix}\n`);
  }

  async testIssue2_DatabaseSchema() {
    console.log('🔍 Testing Issue #2: Database schema mismatch...');
    
    try {
      // Test form submission with store settings data
      const testStoreData = {
        step: 'create-store',
        storeName: 'Test Store for Schema Check',
        domain: 'test-schema-' + Date.now() + '.com',
        country: 'US',
        language: 'en',
        currency: 'USD',
        metaTitle: 'Test Store Meta Title',
        metaDescription: 'Test store meta description',
        // These are the fields that were causing the database mismatch
        shippingInfo: 'Free shipping on orders over $50',
        shippingTime: '3-5 business days',
        returnPolicy: '30-day return policy',
        returnPeriod: '30 days',
        supportEmail: 'support@teststore.com',
        supportPhone: '+1-555-123-4567',
        businessAddress: '123 Test St, Test City, TC 12345',
        gdprCompliant: 'on',
        cookieConsent: 'on',
        selectedPages: ['home', 'products', 'about', 'contact']
      };

      // Attempt to create a store with all the fields
      const response = await axios.post(`${BASE_URL}/admin/site-setup`, testStoreData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept redirects as success
        }
      });

      if (response.status === 302 && response.headers.location.includes('success=true')) {
        this.results.issue2_databaseSchema = 'PASS - Store created successfully with all store settings';
      } else {
        this.results.issue2_databaseSchema = 'FAIL - Store creation did not redirect to success page';
      }

    } catch (error) {
      if (error.response && error.response.status === 302) {
        // Check if redirect indicates success
        if (error.response.headers.location && error.response.headers.location.includes('success=true')) {
          this.results.issue2_databaseSchema = 'PASS - Store created successfully with all store settings';
        } else {
          this.results.issue2_databaseSchema = 'FAIL - Redirect occurred but not to success page';
        }
      } else {
        this.results.issue2_databaseSchema = `FAIL - Error during store creation: ${error.message}`;
      }
    }
    
    console.log(`  Result: ${this.results.issue2_databaseSchema}\n`);
  }

  async testCompleteFormFlow() {
    console.log('🔍 Testing complete form flow with clipia.fi domain...');
    
    try {
      const testStoreData = {
        step: 'create-store',
        storeName: 'Clipia Finland Test Store',
        domain: 'clipia.fi',
        country: 'FI',
        language: 'fi',
        currency: 'EUR',
        metaTitle: 'Clipia Finland - Test Store',
        metaDescription: 'Test store for Clipia Finland',
        shippingInfo: 'Ilmainen toimitus yli 50€ tilauksiin',
        shippingTime: '2-4 arkipäivää',
        returnPolicy: '14 päivän palautusoikeus',
        returnPeriod: '14 päivää',
        supportEmail: 'tuki@clipia.fi',
        supportPhone: '+358-9-1234567',
        businessAddress: 'Testikatu 123, 00100 Helsinki',
        gdprCompliant: 'on',
        cookieConsent: 'on',
        selectedPages: ['home', 'products', 'about', 'contact']
      };

      const response = await axios.post(`${BASE_URL}/admin/site-setup`, testStoreData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        }
      });

      if (response.status === 302 && response.headers.location.includes('success=true')) {
        this.results.formSubmissionTest = 'PASS - Complete form flow with clipia.fi worked correctly';
      } else {
        this.results.formSubmissionTest = 'FAIL - Complete form flow did not succeed';
      }

    } catch (error) {
      if (error.response && error.response.status === 302) {
        if (error.response.headers.location && error.response.headers.location.includes('success=true')) {
          this.results.formSubmissionTest = 'PASS - Complete form flow with clipia.fi worked correctly';
        } else if (error.response.headers.location && error.response.headers.location.includes('error=domain_conflict')) {
          this.results.formSubmissionTest = 'EXPECTED - Domain conflict (clipia.fi may already exist)';
        } else {
          this.results.formSubmissionTest = 'FAIL - Unexpected redirect';
        }
      } else {
        this.results.formSubmissionTest = `FAIL - Error: ${error.message}`;
      }
    }
    
    console.log(`  Result: ${this.results.formSubmissionTest}\n`);
  }

  async testValidationStillWorks() {
    console.log('🔍 Testing that form validation still works for invalid inputs...');
    
    try {
      // Test with invalid data to ensure validation still works
      const invalidTestData = {
        step: 'create-store',
        storeName: '', // Empty name should fail
        domain: 'invalid-domain',
        country: '',
        language: '',
        currency: ''
      };

      const response = await axios.post(`${BASE_URL}/admin/site-setup`, invalidTestData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Accept all responses
        }
      });

      // Should redirect with error or return error status
      if (response.status === 302 && response.headers.location.includes('error=')) {
        this.results.validationTest = 'PASS - Form validation still catches invalid inputs';
      } else if (response.status === 400) {
        this.results.validationTest = 'PASS - Form validation still catches invalid inputs (400 status)';
      } else {
        this.results.validationTest = 'FAIL - Form validation may not be working properly';
      }

    } catch (error) {
      if (error.response && error.response.status === 302) {
        if (error.response.headers.location && error.response.headers.location.includes('error=')) {
          this.results.validationTest = 'PASS - Form validation still catches invalid inputs';
        } else {
          this.results.validationTest = 'FAIL - No validation error detected';
        }
      } else if (error.response && error.response.status === 400) {
        this.results.validationTest = 'PASS - Form validation still catches invalid inputs (400 status)';
      } else {
        this.results.validationTest = `FAIL - Unexpected error: ${error.message}`;
      }
    }
    
    console.log(`  Result: ${this.results.validationTest}\n`);
  }

  printResults() {
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(50));
    
    Object.entries(this.results).forEach(([test, result]) => {
      const status = result.startsWith('PASS') ? '✅' : 
                     result.startsWith('EXPECTED') ? '⚠️ ' : '❌';
      console.log(`${status} ${test}: ${result}`);
    });
    
    console.log('\n');
    
    // Overall assessment
    const passCount = Object.values(this.results).filter(r => r.startsWith('PASS')).length;
    const totalTests = Object.keys(this.results).length;
    
    if (passCount === totalTests) {
      console.log('🎉 ALL TESTS PASSED - Both fixes are working correctly!');
    } else if (passCount >= totalTests - 1) {
      console.log('✅ MOSTLY WORKING - Minor issues may remain');
    } else {
      console.log('⚠️  FIXES NEED ATTENTION - Some issues remain');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new FixValidationTest();
  tester.runAllTests().catch(console.error);
}

module.exports = FixValidationTest;