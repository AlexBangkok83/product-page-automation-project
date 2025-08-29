const db = require('./db');

async function createComprehensiveSchema() {
  try {
    console.log('🏗️ Creating comprehensive schema for Company → Shopify → Store → Theme → Template hierarchy...');
    
    // Initialize database connection
    await db.initialize();
    
    // 1. Companies table (for future multi-tenant support)
    await db.run(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. Shopify Stores table (external connections - highest level data source)
    await db.run(`
      CREATE TABLE IF NOT EXISTS shopify_stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL DEFAULT 1,
        name TEXT NOT NULL,
        shop_domain TEXT NOT NULL UNIQUE,
        access_token TEXT,
        webhook_secret TEXT,
        is_active INTEGER DEFAULT 1,
        last_sync_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      )
    `);
    
    // 3. Themes table (website designs/layouts)
    await db.run(`
      CREATE TABLE IF NOT EXISTS themes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        layout_config TEXT, -- JSON config for overall site layout
        css_variables TEXT, -- JSON for theme colors, fonts, etc
        header_config TEXT, -- JSON for header/navigation
        footer_config TEXT, -- JSON for footer
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 4. Add new columns to existing stores table
    console.log('🔧 Adding new columns to existing stores table...');
    
    // Add shopify_store_id column (references shopify_stores table)
    try {
      await db.run('ALTER TABLE stores ADD COLUMN shopify_store_id INTEGER');
      console.log('✅ Added shopify_store_id column');
    } catch (error) {
      if (!error.message.includes('duplicate column')) {
        throw error;
      }
      console.log('⚠️ shopify_store_id column already exists');
    }
    
    // Add theme_id_new column (references themes table) - using different name to avoid conflicts
    try {
      await db.run('ALTER TABLE stores ADD COLUMN theme_id_new INTEGER');
      console.log('✅ Added theme_id_new column');
    } catch (error) {
      if (!error.message.includes('duplicate column')) {
        throw error;
      }
      console.log('⚠️ theme_id_new column already exists');
    }
    
    // 5. Update product_template_assignments to be store-specific
    await db.run(`
      DROP TABLE IF EXISTS product_template_assignments
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS product_template_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id INTEGER NOT NULL,
        template_id INTEGER NOT NULL,
        product_handle TEXT NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES product_page_templates(id) ON DELETE CASCADE,
        UNIQUE(store_id, product_handle)
      )
    `);
    
    // 6. Store default templates (fallback when no specific assignment)
    await db.run(`
      CREATE TABLE IF NOT EXISTS store_default_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id INTEGER NOT NULL UNIQUE,
        default_template_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        FOREIGN KEY (default_template_id) REFERENCES product_page_templates(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes for performance
    await db.run('CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_shopify_stores_company ON shopify_stores(company_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_shopify_stores_domain ON shopify_stores(shop_domain)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_stores_shopify ON stores(shopify_store_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_stores_theme_new ON stores(theme_id_new)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_stores_domain ON stores(domain)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_template_assignments_store ON product_template_assignments(store_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_template_assignments_product ON product_template_assignments(product_handle)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_themes_default ON themes(is_default)');
    
    console.log('✅ Comprehensive schema created successfully');
    
    // Create default company if none exists
    const defaultCompany = await db.get('SELECT * FROM companies WHERE id = 1');
    if (!defaultCompany) {
      console.log('👤 Creating default company...');
      await db.run(`
        INSERT INTO companies (id, name, email, created_at)
        VALUES (1, 'Default Company', 'admin@company.com', CURRENT_TIMESTAMP)
      `);
    }
    
    // Create default theme if none exists
    const defaultTheme = await db.get('SELECT * FROM themes WHERE is_default = 1');
    if (!defaultTheme) {
      console.log('🎨 Creating default theme...');
      
      const defaultThemeConfig = {
        colors: {
          primary: '#667eea',
          secondary: '#764ba2',
          accent: '#f093fb',
          background: '#ffffff',
          surface: '#f8f9fa',
          text: '#1f2937',
          textSecondary: '#6c757d'
        },
        fonts: {
          primary: 'Inter, system-ui, sans-serif',
          secondary: 'Georgia, serif'
        },
        layout: {
          maxWidth: '1200px',
          padding: '1rem',
          borderRadius: '0.5rem'
        }
      };
      
      const headerConfig = {
        style: 'modern',
        showLogo: true,
        showNavigation: true,
        showSearch: true,
        showCart: true,
        layout: 'horizontal'
      };
      
      const footerConfig = {
        showLinks: true,
        showSocial: true,
        showNewsletter: true,
        showCopyright: true,
        layout: 'columns'
      };
      
      await db.run(`
        INSERT INTO themes (name, description, layout_config, css_variables, header_config, footer_config, is_default)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `, [
        'Modern E-commerce',
        'Clean, modern theme perfect for any e-commerce store',
        JSON.stringify(defaultThemeConfig),
        JSON.stringify(defaultThemeConfig.colors),
        JSON.stringify(headerConfig),
        JSON.stringify(footerConfig)
      ]);
      
      console.log('✅ Default theme created');
    }
    
    // Migrate existing stores to use default theme
    console.log('🔄 Migrating existing stores to use themes...');
    const existingStores = await db.all('SELECT * FROM stores WHERE theme_id_new IS NULL');
    const defaultThemeRecord = await db.get('SELECT id FROM themes WHERE is_default = 1');
    
    for (const store of existingStores) {
      await db.run('UPDATE stores SET theme_id_new = ? WHERE id = ?', [defaultThemeRecord.id, store.id]);
      console.log(`📌 Store "${store.name}" assigned to default theme`);
    }
    
    // Migrate existing stores to have shopify_store relationships
    console.log('🔗 Ensuring stores have Shopify connections...');
    const storesWithoutShopify = await db.all('SELECT * FROM stores WHERE shopify_store_id IS NULL OR shopify_store_id = 0');
    
    if (storesWithoutShopify.length > 0) {
      // Create a default Shopify store connection if needed
      let defaultShopifyStore = await db.get('SELECT * FROM shopify_stores LIMIT 1');
      
      if (!defaultShopifyStore) {
        console.log('🔗 Creating default Shopify store connection...');
        const result = await db.run(`
          INSERT INTO shopify_stores (company_id, name, shop_domain, created_at)
          VALUES (1, 'Default Store', 'ecominter.myshopify.com', CURRENT_TIMESTAMP)
        `);
        defaultShopifyStore = { id: result.lastID };
      }
      
      for (const store of storesWithoutShopify) {
        await db.run('UPDATE stores SET shopify_store_id = ? WHERE id = ?', [defaultShopifyStore.id, store.id]);
        console.log(`🔗 Store "${store.name}" connected to Shopify store`);
      }
    }
    
    console.log('🎉 Schema migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating comprehensive schema:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  createComprehensiveSchema()
    .then(() => {
      console.log('✨ Comprehensive database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = createComprehensiveSchema;