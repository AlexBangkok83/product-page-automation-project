// Test if templates route works
const db = require('./database/db');

async function testTemplatesRoute() {
    try {
        const companyId = 1;
        
        const templates = await db.all(
            'SELECT id, name, description, elements, created_at, updated_at FROM product_page_templates WHERE company_id = ? ORDER BY created_at DESC',
            [companyId]
        );
        
        console.log('Templates found:', templates);
        console.log('Count:', templates.length);
    } catch (error) {
        console.error('Error:', error);
    }
}

testTemplatesRoute();