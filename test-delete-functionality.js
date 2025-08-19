/**
 * Test script to isolate and debug delete functionality
 * This will help us find exactly where the comprehensive cleanup fails
 */

const Store = require('./models/Store');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testDeleteFunctionality() {
  console.log('🧪 Testing Delete Functionality - Isolated Test');
  console.log('='.repeat(50));
  
  let testStore = null;
  
  try {
    // Step 1: Create a minimal test store
    console.log('\n📝 Step 1: Creating test store...');
    testStore = await Store.create({
      name: 'test-store-delete',
      domain: 'test-delete.example.com',
      country: 'US',
      language: 'en',
      currency: 'USD',
      selected_pages: 'home,privacy'
    });
    console.log(`✅ Test store created: ${testStore.name} (UUID: ${testStore.uuid})`);
    
    // Step 2: Create some test files manually
    console.log('\n📁 Step 2: Creating test files...');
    const testStorePath = path.join(process.cwd(), 'stores', testStore.domain);
    
    // Ensure directory exists
    if (!fs.existsSync(testStorePath)) {
      fs.mkdirSync(testStorePath, { recursive: true });
    }
    
    // Create test files
    fs.writeFileSync(path.join(testStorePath, 'index.html'), '<h1>Test Store</h1>');
    fs.writeFileSync(path.join(testStorePath, 'privacy.html'), '<h1>Privacy Policy</h1>');
    fs.writeFileSync(path.join(testStorePath, 'robots.txt'), 'User-agent: *\nDisallow:');
    
    console.log(`✅ Test files created in: ${testStorePath}`);
    console.log(`   Files: ${fs.readdirSync(testStorePath).join(', ')}`);
    
    // Step 3: Add files to Git (simulate normal workflow)
    console.log('\n📋 Step 3: Adding files to Git...');
    try {
      await execAsync(`git add stores/${testStore.domain}/`);
      await execAsync(`git commit -m "Add test store for delete testing"`);
      console.log('✅ Test files committed to Git');
    } catch (gitError) {
      console.log(`⚠️ Git commit failed: ${gitError.message}`);
    }
    
    // Step 4: Check initial state
    console.log('\n🔍 Step 4: Checking initial state...');
    const initialState = await checkSystemState(testStore);
    console.log('Initial state:', initialState);
    
    // Step 5: Test the delete method with detailed logging
    console.log('\n🗑️ Step 5: Testing comprehensive delete...');
    console.log('Calling testStore.delete()...');
    
    await testStore.delete();
    
    console.log('✅ Delete method completed without throwing');
    
    // Step 6: Check final state
    console.log('\n🔍 Step 6: Checking cleanup results...');
    const finalState = await checkSystemState(testStore);
    console.log('Final state:', finalState);
    
    // Step 7: Report results
    console.log('\n📊 CLEANUP RESULTS:');
    console.log('='.repeat(30));
    console.log(`Local files: ${initialState.filesExist} → ${finalState.filesExist} ${finalState.filesExist ? '❌ FAILED' : '✅ SUCCESS'}`);
    console.log(`Database: ${initialState.inDatabase} → ${finalState.inDatabase} ${finalState.inDatabase ? '❌ FAILED' : '✅ SUCCESS'}`);
    console.log(`Git status: ${initialState.gitClean} → ${finalState.gitClean} ${finalState.gitClean ? '✅ SUCCESS' : '❌ FAILED'}`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Try to clean up manually if test failed
    if (testStore) {
      console.log('\n🧹 Attempting manual cleanup...');
      try {
        const storePath = path.join(process.cwd(), 'stores', testStore.domain);
        if (fs.existsSync(storePath)) {
          fs.rmSync(storePath, { recursive: true, force: true });
          console.log('✅ Manually removed test files');
        }
        
        // Remove from database
        const db = require('./database/db');
        await db.run('DELETE FROM stores WHERE uuid = ?', [testStore.uuid]);
        console.log('✅ Manually removed from database');
        
      } catch (cleanupError) {
        console.error('❌ Manual cleanup failed:', cleanupError.message);
      }
    }
  }
}

async function checkSystemState(store) {
  const result = {
    filesExist: false,
    inDatabase: false,
    gitClean: true
  };
  
  try {
    // Check if files exist
    const storePath = path.join(process.cwd(), 'stores', store.domain);
    result.filesExist = fs.existsSync(storePath);
    
    // Check database
    const db = require('./database/db');
    const dbRecord = await db.get('SELECT * FROM stores WHERE uuid = ?', [store.uuid]);
    result.inDatabase = !!dbRecord;
    
    // Check Git status
    try {
      const { stdout } = await execAsync('git status --porcelain');
      result.gitClean = !stdout.includes(store.domain);
    } catch (gitError) {
      result.gitClean = false;
    }
    
  } catch (error) {
    console.error('Error checking system state:', error.message);
  }
  
  return result;
}

// Run the test
if (require.main === module) {
  testDeleteFunctionality()
    .then(() => {
      console.log('\n🏁 Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testDeleteFunctionality };