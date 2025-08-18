const Store = require('./models/Store');

/**
 * Regenerate all existing stores with the new footer system
 */
async function regenerateStoresWithFooter() {
  console.log('🔄 Regenerating all stores with new footer system...');
  
  try {
    // Get all stores
    const stores = await Store.findAll();
    console.log(`📊 Found ${stores.length} stores to update`);
    
    if (stores.length === 0) {
      console.log('ℹ️  No stores found. Create a store first to see the footer in action.');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const store of stores) {
      try {
        console.log(`🏪 Regenerating store: ${store.name} (${store.domain})`);
        
        // Set status to deploying
        await store.update({ deployment_status: 'deploying' });
        
        // Regenerate store files with new footer
        await store.regenerateStoreFiles();
        
        console.log(`✅ Successfully regenerated: ${store.name}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Failed to regenerate ${store.name}:`, error.message);
        errorCount++;
        
        // Update status to failed
        try {
          await store.update({ deployment_status: 'failed' });
        } catch (updateError) {
          console.error(`Failed to update status for ${store.name}:`, updateError.message);
        }
      }
    }
    
    console.log('\n📈 Regeneration Summary:');
    console.log(`✅ Success: ${successCount} stores`);
    console.log(`❌ Errors: ${errorCount} stores`);
    console.log(`📊 Total: ${stores.length} stores`);
    
    if (successCount > 0) {
      console.log('\n🎉 Footer system has been applied to all successfully regenerated stores!');
      console.log('📁 Check the /stores directory to see the updated files.');
      console.log('🌐 Visit the store URLs to see the new professional footer in action.');
    }
    
  } catch (error) {
    console.error('❌ Error during store regeneration:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the regeneration
if (require.main === module) {
  regenerateStoresWithFooter()
    .then(() => {
      console.log('\n✨ Regeneration process completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Regeneration process failed:', error);
      process.exit(1);
    });
}

module.exports = { regenerateStoresWithFooter };