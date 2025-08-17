#!/usr/bin/env node

// Final comprehensive test for the Shopify connection flow
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testCompleteFlow() {
    console.log('🎯 FINAL SHOPIFY CONNECTION FLOW TEST');
    console.log('=====================================\n');
    
    // Test cases with different scenarios
    const testCases = [
        {
            name: 'Invalid Token (Expected Error)',
            domain: 'ecominter.myshopify.com',
            token: 'fake-token-for-testing',
            expectedError: true
        },
        {
            name: 'Invalid Domain Format',
            domain: 'invalid-domain',
            token: 'fake-token',
            expectedError: true
        },
        {
            name: 'Empty Credentials',
            domain: '',
            token: '',
            expectedError: true
        },
        {
            name: 'Valid Domain, Invalid Token',
            domain: 'demo-store.myshopify.com',
            token: 'shpat_invalid123',
            expectedError: true
        }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`\n📋 Test ${i + 1}: ${testCase.name}`);
        console.log(`   Domain: "${testCase.domain}"`);
        console.log(`   Token: "${testCase.token.substr(0, 10)}${testCase.token.length > 10 ? '...' : ''}"`);
        
        try {
            const response = await fetch(`${BASE_URL}/api/validate-shopify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shopifyDomain: testCase.domain,
                    accessToken: testCase.token
                })
            });
            
            const data = await response.json();
            
            console.log(`   📥 Status: ${response.status} ${response.statusText}`);
            console.log(`   📊 Response: ${JSON.stringify(data, null, 6)}`);
            
            if (testCase.expectedError) {
                if (response.ok && data.success) {
                    console.log(`   ❌ FAIL: Expected error but got success`);
                } else {
                    console.log(`   ✅ PASS: Got expected error response`);
                }
            } else {
                if (response.ok && data.success) {
                    console.log(`   ✅ PASS: Got expected success response`);
                } else {
                    console.log(`   ❌ FAIL: Expected success but got error`);
                }
            }
            
        } catch (error) {
            console.log(`   💥 Network Error: ${error.message}`);
            if (testCase.expectedError) {
                console.log(`   ✅ PASS: Got expected network error`);
            } else {
                console.log(`   ❌ FAIL: Unexpected network error`);
            }
        }
    }
    
    console.log('\n📋 FRONTEND TEST INSTRUCTIONS');
    console.log('==============================');
    console.log('To test the UI feedback manually:');
    console.log('');
    console.log('1. Open: http://localhost:3000/admin/site-setup');
    console.log('2. Navigate to Step 2 (Shopify Connection)');
    console.log('3. The form should be pre-filled with:');
    console.log('   - Domain: ecominter.myshopify.com');
    console.log('   - Token: fake-token-for-testing');
    console.log('4. Click "Test Connection" button');
    console.log('5. You should see:');
    console.log('   - Button shows "Testing..." with spinner');
    console.log('   - After 1-2 seconds, error message appears below');
    console.log('   - Error message: "Invalid Shopify access token"');
    console.log('   - Red error box with X icon and helpful text');
    console.log('6. Open browser console (F12) to see debug logs');
    console.log('');
    console.log('🔍 Debug logs to look for:');
    console.log('- 🔄 Testing Shopify connection...');
    console.log('- 📥 Shopify API response: { status: 401, statusText: "Unauthorized" }');
    console.log('- 📊 Response data: { "error": "Invalid Shopify access token" }');
    console.log('- ❌ Shopify connection failed: Invalid Shopify access token');
    console.log('- ❌ showShopifyError called with: Invalid Shopify access token');
    console.log('- ✅ Found shopifyStatus div, updating content for error...');
    console.log('');
    console.log('✅ If you see all these logs and the error UI, the fix is working!');
}

// Run if called directly
if (require.main === module) {
    testCompleteFlow().catch(console.error);
}

module.exports = { testCompleteFlow };