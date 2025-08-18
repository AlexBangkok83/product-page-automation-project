const database = require('../database/db');
const { PageTemplate } = require('../models/PageTemplate');
const { seedPageTemplates } = require('../database/seed-page-templates');

async function initializePageTemplates() {
    try {
        console.log('🚀 Initializing page templates system...');
        
        // Initialize database connection
        if (!database.db) {
            await database.initialize();
        }
        
        // Create the page template tables
        console.log('📊 Creating database tables...');
        await PageTemplate.createTables();
        console.log('✅ Database tables created/updated');
        
        // Seed the data
        await seedPageTemplates();
        
        console.log('🎉 Page templates system initialized successfully!');
        
    } catch (error) {
        console.error('❌ Error initializing page templates:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initializePageTemplates()
        .then(() => {
            console.log('✅ Initialization complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Initialization failed:', error);
            process.exit(1);
        });
}

module.exports = { initializePageTemplates };