#!/usr/bin/env node
/**
 * Database Operations Specialist - Legal Content Update Executor
 * This script safely updates the database with professional legal templates
 */

const path = require('path');

// Add project root to path for module resolution
const projectRoot = path.join(__dirname, '..');
process.chdir(projectRoot);

// Load the legal content update module
const { updateLegalContent } = require('../database/update-legal-content');

async function executeUpdate() {
  console.log('🔧 Database Operations Specialist: Executing legal content update...');
  console.log('📍 Working Directory:', process.cwd());
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('');
  
  try {
    // Execute the update
    const result = await updateLegalContent();
    
    console.log('');
    console.log('🎯 Database Operations Specialist: Mission accomplished!');
    console.log('✅ Legal content templates successfully integrated');
    console.log('📊 Update Summary:', result);
    console.log('');
    console.log('🔄 Next Steps:');
    console.log('  1. Restart the server to apply changes');
    console.log('  2. Test API endpoint: GET /api/page-templates');
    console.log('  3. Create new stores to see legal pages in action');
    console.log('');
    
    return result;
    
  } catch (error) {
    console.error('');
    console.error('❌ Database Operations Specialist: Update failed!');
    console.error('💥 Error Details:', error.message);
    console.error('🔍 Stack Trace:', error.stack);
    console.error('');
    console.error('🛠️  Troubleshooting:');
    console.error('  1. Check database file permissions');
    console.error('  2. Ensure server is not running during update');
    console.error('  3. Verify database schema is up to date');
    
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  executeUpdate()
    .then(() => {
      console.log('🏁 Database update completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database update failed:', error.message);
      process.exit(1);
    });
}

module.exports = { executeUpdate };