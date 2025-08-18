/**
 * Database Migration: Add Pre-Footer Content Fields
 * Adds editable pre-footer content fields to stores table
 */

const db = require('./db');

async function addPreFooterFields() {
  console.log('🔄 Adding pre-footer content fields to stores table...');
  
  try {
    // Add pre-footer content fields
    await db.run(`
      ALTER TABLE stores ADD COLUMN prefooter_card1_image TEXT;
    `);
    
    await db.run(`
      ALTER TABLE stores ADD COLUMN prefooter_card1_title TEXT;
    `);
    
    await db.run(`
      ALTER TABLE stores ADD COLUMN prefooter_card1_text TEXT;
    `);
    
    await db.run(`
      ALTER TABLE stores ADD COLUMN prefooter_card2_image TEXT;
    `);
    
    await db.run(`
      ALTER TABLE stores ADD COLUMN prefooter_card2_title TEXT;
    `);
    
    await db.run(`
      ALTER TABLE stores ADD COLUMN prefooter_card2_text TEXT;
    `);
    
    await db.run(`
      ALTER TABLE stores ADD COLUMN prefooter_card3_image TEXT;
    `);
    
    await db.run(`
      ALTER TABLE stores ADD COLUMN prefooter_card3_title TEXT;
    `);
    
    await db.run(`
      ALTER TABLE stores ADD COLUMN prefooter_card3_text TEXT;
    `);
    
    await db.run(`
      ALTER TABLE stores ADD COLUMN prefooter_enabled BOOLEAN DEFAULT 0;
    `);
    
    console.log('✅ Pre-footer content fields added successfully');
    console.log('📊 Fields added:');
    console.log('   - prefooter_card1_image, prefooter_card1_title, prefooter_card1_text');
    console.log('   - prefooter_card2_image, prefooter_card2_title, prefooter_card2_text'); 
    console.log('   - prefooter_card3_image, prefooter_card3_title, prefooter_card3_text');
    console.log('   - prefooter_enabled (boolean flag)');
    
  } catch (error) {
    // Check if columns already exist
    if (error.message.includes('duplicate column name')) {
      console.log('✅ Pre-footer fields already exist');
    } else {
      console.error('❌ Error adding pre-footer fields:', error);
      throw error;
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  addPreFooterFields()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addPreFooterFields };