#!/usr/bin/env node

// Test script for Shopify connection issue diagnosis
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testShopifyAPI() {
    console.log('🔍 Testing Shopify Connection API...\n');
    
    // Test data - using default values that should fail
    const testData = {
        shopifyDomain: 'ecominter.myshopify.com',
        accessToken: 'fake-token-12345'
    };
    
    console.log('📊 Test Data:');
    console.log(`Domain: ${testData.shopifyDomain}`);
    console.log(`Token: ${testData.accessToken.substr(0, 10)}...`);
    console.log('');
    
    try {
        console.log('🚀 Making API request to /api/validate-shopify...');
        
        const response = await fetch(`${BASE_URL}/api/validate-shopify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
        console.log(`📋 Response Headers:`, Object.fromEntries(response.headers));
        
        const responseText = await response.text();
        console.log(`📄 Raw Response: ${responseText}`);
        
        try {
            const data = JSON.parse(responseText);
            console.log(`📊 Parsed Response:`, JSON.stringify(data, null, 2));
            
            if (data.success) {
                console.log('✅ API returned success - this is unexpected for fake credentials');
            } else {
                console.log(`❌ API returned error as expected: ${data.error}`);
            }
        } catch (parseError) {
            console.log('❌ Failed to parse response as JSON:', parseError.message);
        }
        
    } catch (error) {
        console.error('💥 Network/Request Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function testFrontendAPI() {
    console.log('\n🌐 Testing frontend page load...');
    
    try {
        const response = await fetch(`${BASE_URL}/admin/site-setup`);
        console.log(`📥 Site Setup Page Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const html = await response.text();
            
            // Check for key elements
            const hasValidateButton = html.includes('validateShopify') || html.includes('Test Connection');
            const hasShopifyStatus = html.includes('shopifyStatus');
            const hasShopifyDomainInput = html.includes('shopifyDomain');
            const hasShopifyTokenInput = html.includes('shopifyToken');
            
            console.log('🔍 HTML Element Check:');
            console.log(`  ✓ Validate Button: ${hasValidateButton ? '✅ Found' : '❌ Missing'}`);
            console.log(`  ✓ Status Div: ${hasShopifyStatus ? '✅ Found' : '❌ Missing'}`);
            console.log(`  ✓ Domain Input: ${hasShopifyDomainInput ? '✅ Found' : '❌ Missing'}`);
            console.log(`  ✓ Token Input: ${hasShopifyTokenInput ? '✅ Found' : '❌ Missing'}`);
            
            // Check for JavaScript functions
            const hasValidateFunction = html.includes('validateShopifyConnection');
            const hasShowSuccessFunction = html.includes('showShopifySuccess');
            const hasShowErrorFunction = html.includes('showShopifyError');
            
            console.log('🔍 JavaScript Function Check:');
            console.log(`  ✓ Validate Function: ${hasValidateFunction ? '✅ Found' : '❌ Missing'}`);
            console.log(`  ✓ Show Success Function: ${hasShowSuccessFunction ? '✅ Found' : '❌ Missing'}`);
            console.log(`  ✓ Show Error Function: ${hasShowErrorFunction ? '✅ Found' : '❌ Missing'}`);
            
            // Extract default values
            const domainMatch = html.match(/value="([^"]*ecominter[^"]*)"/);
            const defaultDomain = domainMatch ? domainMatch[1] : 'NOT FOUND';
            console.log(`  ✓ Default Domain: ${defaultDomain}`);
            
        } else {
            console.log('❌ Failed to load site setup page');
        }
        
    } catch (error) {
        console.error('💥 Frontend Test Error:', error.message);
    }
}

async function main() {
    console.log('🧪 SHOPIFY CONNECTION DIAGNOSTIC TEST');
    console.log('=====================================\n');
    
    await testFrontendAPI();
    await testShopifyAPI();
    
    console.log('\n✅ Test completed. Check the output above for issues.');
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testShopifyAPI, testFrontendAPI };