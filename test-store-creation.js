const Store = require('./models/Store');
const db = require('./database/db');

async function testStoreCreation() {
  try {
    console.log('🧪 Testing store creation and file generation...');
    
    // Initialize database
    await db.initialize();
    console.log('✅ Database initialized');
    
    // Test store data
    const testStoreData = {
      name: 'Test Demo Store',
      domain: 'testdemo.com',
      country: 'US',
      language: 'en',
      currency: 'USD',
      meta_title: 'Test Demo Store - Quality Products',
      meta_description: 'A demo store for testing the domain routing system',
      primary_color: '#2563eb',
      secondary_color: '#f1f5f9',
      support_email: 'support@testdemo.com',
      selected_pages: 'home,products,about,contact'
    };
    
    console.log('📝 Creating test store...');
    const store = await Store.create(testStoreData);
    
    console.log('✅ Store created:', {
      id: store.id,
      name: store.name,
      domain: store.domain,
      deployment_status: store.deployment_status,
      files_exist: store.storeFilesExist()
    });
    
    // Get pages
    const pages = await store.getPages();
    console.log('📄 Pages created:', pages.map(p => ({ type: p.page_type, title: p.title })));
    
    // Check if files were generated
    const storePath = store.getStorePath();
    console.log('📁 Store path:', storePath);
    console.log('📁 Files exist:', store.storeFilesExist());
    
    // List generated files
    const fs = require('fs');
    if (fs.existsSync(storePath)) {
      const files = fs.readdirSync(storePath);
      console.log('📋 Generated files:', files);
    }
    
    console.log('🎉 Test completed successfully!');
    
    return store;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

async function testStoreAccess(domain) {
  try {
    console.log(`🌐 Testing store access for domain: ${domain}`);
    
    // Initialize database if not already connected
    await db.initialize();
    
    const store = await Store.findByDomain(domain);
    if (!store) {
      console.log('❌ Store not found for domain');
      return;
    }
    
    console.log('✅ Store found:', {
      name: store.name,
      domain: store.domain,
      status: store.status,
      deployment_status: store.deployment_status,
      files_exist: store.storeFilesExist()
    });
    
    const pages = await store.getPages();
    console.log('📄 Available pages:', pages.map(p => ({ 
      type: p.page_type, 
      slug: p.slug || '/', 
      title: p.title 
    })));
    
  } catch (error) {
    console.error('❌ Store access test failed:', error);
  }
}

async function cleanupTestStore(domain) {
  try {
    console.log(`🗑️ Cleaning up test store: ${domain}`);
    
    // Initialize database if not already connected
    await db.initialize();
    
    const store = await Store.findByDomain(domain);
    if (store) {
      await store.delete();
      console.log('✅ Test store deleted');
    } else {
      console.log('ℹ️ Test store not found (may have been deleted already)');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Handle command line arguments
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'create':
        await testStoreCreation();
        break;
        
      case 'test':
        const domain = args[1] || 'testdemo.com';
        await testStoreAccess(domain);
        break;
        
      case 'cleanup':
        const cleanupDomain = args[1] || 'testdemo.com';
        await cleanupTestStore(cleanupDomain);
        break;
        
      case 'full':
        console.log('🧪 Running full test suite...');
        const store = await testStoreCreation();
        await testStoreAccess(store.domain);
        
        console.log('⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await cleanupTestStore(store.domain);
        console.log('🎉 Full test completed!');
        break;
        
      default:
        console.log(`
Usage: node test-store-creation.js <command> [options]

Commands:
  create              Create a test store
  test <domain>       Test store access (default: testdemo.com)
  cleanup <domain>    Delete test store (default: testdemo.com)
  full               Run full test suite (create, test, cleanup)

Examples:
  node test-store-creation.js create
  node test-store-creation.js test mystore.com
  node test-store-creation.js cleanup testdemo.com
  node test-store-creation.js full
        `);
    }
    
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  } finally {
    await db.close();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  testStoreCreation,
  testStoreAccess,
  cleanupTestStore
};