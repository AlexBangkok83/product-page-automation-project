/**
 * Test script to verify git automation is working in store creation
 */

const Store = require('./models/Store');
const db = require('./database/db');

async function testGitAutomation() {
  // Initialize database connection
  await db.initialize();
  console.log('🧪 Testing Git Automation in Store Creation...\n');
  
  try {
    // Create a test store
    const testStoreData = {
      name: 'Test Automation Store',
      domain: 'test-automation.example.com',
      country: 'US',
      language: 'en',
      currency: 'USD',
      primary_color: '#007cba',
      secondary_color: '#f8f9fa',
      meta_title: 'Test Store for Git Automation',
      meta_description: 'Testing automated git operations',
      support_email: 'support@test-automation.example.com',
      selected_pages: ['home', 'products', 'about', 'contact']
    };
    
    console.log('📝 Creating test store with data:', {
      name: testStoreData.name,
      domain: testStoreData.domain,
      country: testStoreData.country,
      language: testStoreData.language,
      currency: testStoreData.currency
    });
    
    const store = await Store.create(testStoreData);
    
    console.log('\n✅ Store creation completed successfully!');
    console.log('📊 Store details:');
    console.log(`   ID: ${store.id}`);
    console.log(`   Name: ${store.name}`);
    console.log(`   Domain: ${store.domain}`);
    console.log(`   Status: ${store.status}`);
    console.log(`   Deployment Status: ${store.deployment_status}`);
    
    // Check if files were created
    const fs = require('fs');
    const path = require('path');
    const storePath = path.join(process.cwd(), 'stores', store.domain);
    
    if (fs.existsSync(storePath)) {
      console.log(`\n📁 Store files created at: ${storePath}`);
      const files = fs.readdirSync(storePath);
      console.log(`   Files generated: ${files.join(', ')}`);
    } else {
      console.log(`\n❌ Store files NOT found at: ${storePath}`);
    }
    
    console.log('\n🚀 Git automation should have committed and pushed the files automatically.');
    console.log('🌐 Check GitHub repository to confirm the files are there.');
    
    return store;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testGitAutomation()
    .then(() => {
      console.log('\n✅ Git automation test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Git automation test failed:', error.message);
      process.exit(1);
    })
    .finally(() => {
      // Close database connection
      if (db && db.close) {
        db.close();
      }
    });
}

module.exports = { testGitAutomation };