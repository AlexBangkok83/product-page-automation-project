const axios = require('axios');

// Test script for Company Profile functionality
const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing Company Profile API...\n');

  try {
    // Test 1: Get all company Shopify stores (should return empty array initially)
    console.log('1. Testing GET /api/company-shopify-stores');
    const response1 = await axios.get(`${BASE_URL}/api/company-shopify-stores`);
    console.log('   ✅ Response:', response1.data);
    console.log('   📊 Summary:', response1.data.summary);
    console.log('');

    // Test 2: Create a new company Shopify store
    console.log('2. Testing POST /api/company-shopify-stores');
    const testStore = {
      nickname: 'Test Store',
      shopifyDomain: 'test-store.myshopify.com',
      accessToken: 'fake-token-for-testing'
    };
    
    try {
      const response2 = await axios.post(`${BASE_URL}/api/company-shopify-stores`, testStore);
      console.log('   ✅ Store created:', response2.data);
    } catch (error) {
      console.log('   ⚠️ Expected error (invalid token):', error.response?.data || error.message);
    }
    console.log('');

    // Test 3: Test countries endpoint
    console.log('3. Testing GET /api/countries');
    const response3 = await axios.get(`${BASE_URL}/api/countries`);
    console.log('   ✅ Countries loaded:', response3.data.countries.length, 'countries');
    console.log('');

    // Test 4: Test page templates endpoint
    console.log('4. Testing GET /api/page-templates');
    const response4 = await axios.get(`${BASE_URL}/api/page-templates`);
    console.log('   ✅ Templates loaded:', response4.data.templates.length, 'templates');
    console.log('');

    console.log('🎉 API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Test web pages
async function testPages() {
  console.log('\n🌐 Testing Web Pages...\n');

  const pages = [
    '/admin',
    '/admin/company-profile',
    '/admin/site-setup'
  ];

  for (const page of pages) {
    try {
      console.log(`Testing ${page}...`);
      const response = await axios.get(`${BASE_URL}${page}`);
      
      if (response.status === 200) {
        console.log(`   ✅ ${page} loads successfully`);
        
        // Check for specific content
        if (page === '/admin/company-profile') {
          if (response.data.includes('Company Profile')) {
            console.log('   ✅ Company Profile content detected');
          }
          if (response.data.includes('Shopify Store Connections')) {
            console.log('   ✅ Shopify connections section detected');
          }
        }
        
        if (page === '/admin/site-setup') {
          if (response.data.includes('Saved Shopify Stores')) {
            console.log('   ✅ Enhanced site setup with saved stores detected');
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ ${page} failed:`, error.response?.status || error.message);
    }
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Company Profile System Tests\n');
  console.log('=' .repeat(50));
  
  await testAPI();
  await testPages();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 All tests completed!\n');
  console.log('📋 Next steps:');
  console.log('   1. Visit http://localhost:3000/admin to see the dashboard');
  console.log('   2. Click "Company Profile" to manage Shopify stores');
  console.log('   3. Create a new store via "Create New Store" to test integration');
  console.log('   4. Add real Shopify credentials to test connections');
}

// Run tests
runTests().catch(console.error);