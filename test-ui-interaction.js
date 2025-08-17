#!/usr/bin/env node

// Browser-like test to simulate the UI interaction
const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testUIInteraction() {
    console.log('🌐 SHOPIFY UI INTERACTION TEST');
    console.log('===============================\n');
    
    try {
        // Fetch the actual HTML page
        console.log('📥 Fetching site setup page...');
        const response = await fetch(`${BASE_URL}/admin/site-setup`);
        const html = await response.text();
        
        // Create DOM environment
        const dom = new JSDOM(html, {
            url: BASE_URL,
            runScripts: "dangerously",
            resources: "usable",
            pretendToBeVisual: true
        });
        
        const { window } = dom;
        const { document } = window;
        
        // Make fetch available in the DOM
        window.fetch = fetch;
        
        console.log('🔍 Checking DOM elements...');
        
        // Check for required elements
        const validateBtn = document.getElementById('validateShopify');
        const statusDiv = document.getElementById('shopifyStatus');
        const domainInput = document.getElementById('shopifyDomain');
        const tokenInput = document.getElementById('shopifyToken');
        
        console.log(`  ✓ Validate Button: ${validateBtn ? '✅ Found' : '❌ Missing'}`);
        console.log(`  ✓ Status Div: ${statusDiv ? '✅ Found' : '❌ Missing'}`);
        console.log(`  ✓ Domain Input: ${domainInput ? '✅ Found' : '❌ Missing'}`);
        console.log(`  ✓ Token Input: ${tokenInput ? '✅ Found' : '❌ Missing'}`);
        
        if (!validateBtn || !statusDiv || !domainInput || !tokenInput) {
            console.log('❌ Missing required DOM elements');
            return;
        }
        
        // Check default values
        console.log(`  ✓ Default Domain Value: "${domainInput.value}"`);
        console.log(`  ✓ Default Token Value: "${tokenInput.value}"`);
        
        // Check initial status div state
        const isHidden = statusDiv.classList.contains('d-none');
        console.log(`  ✓ Status Div Initially Hidden: ${isHidden ? '✅ Yes' : '❌ No'}`);
        
        console.log('\n🎯 Simulating button click...');
        
        // Wait for DOMContentLoaded and wizard initialization
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                setTimeout(resolve, 100); // Give time for wizard initialization
            }
        });
        
        // Check if wizard is available
        const wizardAvailable = window.wizard !== undefined;
        console.log(`  ✓ Wizard Object Available: ${wizardAvailable ? '✅ Yes' : '❌ No'}`);
        
        if (wizardAvailable && window.wizard.validateShopifyConnection) {
            console.log('🚀 Calling validateShopifyConnection directly...');
            
            // Mock console.log to capture debug messages
            const originalLog = console.log;
            const debugMessages = [];
            console.log = (...args) => {
                debugMessages.push(args.join(' '));
                originalLog(...args);
            };
            
            try {
                await window.wizard.validateShopifyConnection();
                
                console.log('\n📊 Debug Messages Captured:');
                debugMessages.forEach((msg, i) => {
                    console.log(`  ${i + 1}. ${msg}`);
                });
                
                // Check status div after call
                const isStillHidden = statusDiv.classList.contains('d-none');
                const statusContent = statusDiv.innerHTML;
                
                console.log(`\n📋 Status Div After Call:`);
                console.log(`  ✓ Still Hidden: ${isStillHidden ? '❌ Yes (should be visible)' : '✅ No'}`);
                console.log(`  ✓ Content Length: ${statusContent.length} characters`);
                console.log(`  ✓ Contains Error Alert: ${statusContent.includes('alert-danger') ? '✅ Yes' : '❌ No'}`);
                console.log(`  ✓ Contains Error Icon: ${statusContent.includes('bi-x-circle-fill') ? '✅ Yes' : '❌ No'}`);
                
                if (!isStillHidden && statusContent.length > 0) {
                    console.log('✅ SUCCESS: Status div is visible and contains content!');
                } else {
                    console.log('❌ ISSUE: Status div is still hidden or empty');
                }
                
            } catch (error) {
                console.error('💥 Error during validation:', error);
            } finally {
                console.log = originalLog; // Restore original console.log
            }
        } else {
            console.log('❌ Cannot test wizard interaction - wizard not available');
        }
        
    } catch (error) {
        console.error('💥 Test Error:', error);
    }
}

// Run the test
if (require.main === module) {
    testUIInteraction().catch(console.error);
}

module.exports = { testUIInteraction };