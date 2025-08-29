const db = require('./db');

async function createProductTemplatesTables() {
  try {
    console.log('🗃️ Creating product page template tables...');
    
    // Initialize database connection
    await db.initialize();
    
    // Create product_page_templates table
    await db.run(`
      CREATE TABLE IF NOT EXISTS product_page_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        elements TEXT NOT NULL, -- JSON string of page elements
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create product_template_assignments table
    await db.run(`
      CREATE TABLE IF NOT EXISTS product_template_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        product_handle TEXT NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES product_page_templates(id) ON DELETE CASCADE,
        UNIQUE(template_id, product_handle)
      )
    `);
    
    // Create indexes
    await db.run('CREATE INDEX IF NOT EXISTS idx_product_templates_default ON product_page_templates(is_default)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_template_assignments_template ON product_template_assignments(template_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_template_assignments_product ON product_template_assignments(product_handle)');
    
    console.log('✅ Product page template tables created successfully');
    
    // Check if we need to create a default template
    const defaultTemplate = await db.get('SELECT * FROM product_page_templates WHERE is_default = 1');
    
    if (!defaultTemplate) {
      console.log('📝 Creating default product page template...');
      
      const defaultElements = [
        {
          id: 1,
          type: 'product-images',
          properties: {
            layout: 'gallery',
            showThumbnails: true,
            zoomEnabled: true
          }
        },
        {
          id: 2,
          type: 'product-info',
          properties: {
            showTitle: true,
            showPrice: true,
            showDescription: true,
            showVendor: true,
            layout: 'standard'
          }
        },
        {
          id: 3,
          type: 'product-variants',
          properties: {
            layout: 'dropdown',
            showLabels: true,
            required: true
          }
        },
        {
          id: 4,
          type: 'add-to-cart',
          properties: {
            buttonText: 'Add to Cart',
            showQuantity: true,
            buttonStyle: 'primary'
          }
        },
        {
          id: 5,
          type: 'spacer',
          properties: {
            height: '2rem'
          }
        },
        {
          id: 6,
          type: 'related-products',
          properties: {
            title: 'You might also like',
            count: 4,
            layout: 'grid'
          }
        }
      ];
      
      await db.run(`
        INSERT INTO product_page_templates (name, description, elements, is_default)
        VALUES (?, ?, ?, 1)
      `, [
        'Default Product Page',
        'Standard product page layout with images, info, variants, and related products',
        JSON.stringify(defaultElements)
      ]);
      
      console.log('✅ Default product page template created');
    }
    
  } catch (error) {
    console.error('❌ Error creating product template tables:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  createProductTemplatesTables()
    .then(() => {
      console.log('🎉 Product template database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = createProductTemplatesTables;