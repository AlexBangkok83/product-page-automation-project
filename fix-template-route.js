// Script to add the template route directly
const fs = require('fs');
const path = require('path');

const routeToAdd = `
// Get all templates (for dropdowns/lists)
router.get('/admin-v2/templates', async (req, res) => {
  try {
    const db = require('../database/db');
    const companyId = 1; // For now, single company
    
    const templates = await db.all(
      'SELECT id, name, description, elements, created_at, updated_at FROM product_page_templates WHERE company_id = ? ORDER BY created_at DESC',
      [companyId]
    );
    
    res.json({
      success: true,
      templates: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

`;

// Read the current routes file
const routesFile = path.join(__dirname, 'routes', 'index.js');
let content = fs.readFileSync(routesFile, 'utf8');

// Find the Template Builder Integration Routes comment
const insertPoint = content.indexOf('// Template Builder Integration Routes');
if (insertPoint !== -1) {
  // Find the end of the comment line
  const lineEnd = content.indexOf('\n', insertPoint);
  
  // Insert the new route right after the comment
  content = content.slice(0, lineEnd + 1) + routeToAdd + content.slice(lineEnd + 1);
  
  // Remove any existing broken route
  content = content.replace(/\/\/ Template Builder Integration Routes\\n\\n.*?\\n}\);\n/gs, '');
  
  fs.writeFileSync(routesFile, content);
  console.log('Template route added successfully!');
} else {
  console.log('Could not find insertion point');
}