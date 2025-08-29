const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(__dirname, 'multistore.db');

class Database {
  constructor() {
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err);
          reject(err);
        } else {
          console.log('📊 Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  async initialize() {
    if (!this.db) {
      await this.connect();
    }

    // Create tables
    await this.createTables();
    await this.insertDefaultData();
  }

  async createTables() {
    const tables = [
      // Users table for basic authentication
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Themes table for theme management
      `CREATE TABLE IF NOT EXISTS themes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        css_variables TEXT, -- JSON string containing color scheme
        is_default BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        preview_image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Stores table - main entity for each created store
      `CREATE TABLE IF NOT EXISTS stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        domain TEXT UNIQUE NOT NULL,
        subdomain TEXT UNIQUE,
        
        /* Detected/configured settings */
        country TEXT NOT NULL,
        language TEXT NOT NULL,
        currency TEXT NOT NULL,
        timezone TEXT DEFAULT 'UTC',
        
        /* Shopify integration */
        shopify_domain TEXT,
        shopify_access_token TEXT,
        shopify_shop_name TEXT,
        shopify_connected BOOLEAN DEFAULT 0,
        
        /* Store configuration and theming */
        theme_id TEXT DEFAULT 'default',
        theme_id_new INTEGER, /* New theme system reference */
        template TEXT DEFAULT 'bootstrap-default',
        logo_url TEXT,
        primary_color TEXT DEFAULT '#007cba',
        secondary_color TEXT DEFAULT '#f8f9fa',
        
        /* SEO and branding */
        meta_title TEXT,
        meta_description TEXT,
        favicon_url TEXT,
        
        /* Store settings */
        shipping_info TEXT,
        shipping_time TEXT,
        return_policy TEXT,
        return_period TEXT,
        support_email TEXT,
        support_phone TEXT,
        business_address TEXT,
        business_orgnr TEXT, -- Organization number
        gdpr_compliant BOOLEAN DEFAULT 0,
        cookie_consent BOOLEAN DEFAULT 0,
        selected_pages TEXT, -- comma-separated list of selected page types
        selected_products TEXT, -- JSON array of selected product handles
        
        /* Pre-footer content */
        prefooter_enabled BOOLEAN DEFAULT 0,
        prefooter_card1_image TEXT,
        prefooter_card1_title TEXT,
        prefooter_card1_text TEXT,
        prefooter_card2_image TEXT,
        prefooter_card2_title TEXT,
        prefooter_card2_text TEXT,
        prefooter_card3_image TEXT,
        prefooter_card3_title TEXT,
        prefooter_card3_text TEXT,
        
        /* Status */
        status TEXT DEFAULT 'setup', -- setup, active, suspended
        deployment_status TEXT DEFAULT 'pending', -- pending, deploying, deployed, failed
        deployment_url TEXT,
        
        /* Timestamps */
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deployed_at DATETIME,
        
        FOREIGN KEY (theme_id_new) REFERENCES themes (id)
      )`,

      // Content defaults for different page types
      `CREATE TABLE IF NOT EXISTS content_defaults (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_type TEXT NOT NULL, -- home, products, about, contact, etc.
        language TEXT NOT NULL,
        industry TEXT DEFAULT 'general',
        
        /* Content fields */
        title TEXT,
        subtitle TEXT,
        description TEXT,
        content_blocks TEXT, -- JSON string
        meta_title TEXT,
        meta_description TEXT,
        
        /* Template configuration */
        template_config TEXT, -- JSON string
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Store pages - generated pages for each store
      `CREATE TABLE IF NOT EXISTS store_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id INTEGER NOT NULL,
        page_type TEXT NOT NULL,
        slug TEXT NOT NULL,
        
        /* Content */
        title TEXT NOT NULL,
        subtitle TEXT,
        content TEXT, -- Full HTML content
        meta_title TEXT,
        meta_description TEXT,
        
        /* Page configuration */
        is_enabled BOOLEAN DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        template_data TEXT, -- JSON string
        
        /* Timestamps */
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE,
        UNIQUE(store_id, page_type)
      )`,

      // Sessions for basic session management
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        store_id INTEGER,
        data TEXT, -- JSON string
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE
      )`,

      // Company Shopify Stores - for managing multiple Shopify connections
      `CREATE TABLE IF NOT EXISTS company_shopify_stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        nickname TEXT NOT NULL,
        shopify_domain TEXT NOT NULL,
        shopify_access_token TEXT NOT NULL,
        shopify_shop_name TEXT,
        shopify_email TEXT,
        shopify_currency TEXT,
        shopify_timezone TEXT,
        
        /* Connection status */
        is_active BOOLEAN DEFAULT 1,
        connection_status TEXT DEFAULT 'pending', -- pending, connected, failed
        last_validated_at DATETIME,
        validation_error TEXT,
        
        /* Metadata */
        product_count INTEGER DEFAULT 0,
        last_sync_at DATETIME,
        
        /* Timestamps */
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(shopify_domain)
      )`
    ];

    for (const tableSQL of tables) {
      await this.run(tableSQL);
    }
  }

  async insertDefaultData() {
    // Insert default themes first
    const defaultThemes = [
      {
        name: 'Modern E-commerce',
        description: 'Clean, professional theme perfect for modern e-commerce stores',
        css_variables: JSON.stringify({
          primary: '#667eea',
          secondary: '#764ba2',
          accent: '#f093fb',
          background: '#ffffff',
          surface: '#f8f9fa'
        }),
        is_default: true,
        is_active: true
      },
      {
        name: 'Bold Red Commerce',
        description: 'Dynamic red theme that makes your products stand out',
        css_variables: JSON.stringify({
          primary: '#dc2626',
          secondary: '#991b1b',
          accent: '#f59e0b',
          background: '#ffffff',
          surface: '#fef2f2'
        }),
        is_default: false,
        is_active: true
      },
      {
        name: 'Elegant Red Luxury',
        description: 'Sophisticated red theme for luxury and premium brands',
        css_variables: JSON.stringify({
          primary: '#b91c1c',
          secondary: '#7f1d1d',
          accent: '#d97706',
          background: '#ffffff',
          surface: '#fef2f2'
        }),
        is_default: false,
        is_active: true
      },
      {
        name: 'Ocean Blue Fresh',
        description: 'Fresh ocean-inspired blue theme for clean, trustworthy brands',
        css_variables: JSON.stringify({
          primary: '#0ea5e9',
          secondary: '#0284c7',
          accent: '#06b6d4',
          background: '#ffffff',
          surface: '#f0f9ff'
        }),
        is_default: false,
        is_active: true
      },
      {
        name: 'Forest Green Nature',
        description: 'Natural green theme perfect for eco-friendly and organic brands',
        css_variables: JSON.stringify({
          primary: '#059669',
          secondary: '#047857',
          accent: '#10b981',
          background: '#ffffff',
          surface: '#f0fdf4'
        }),
        is_default: false,
        is_active: true
      }
    ];

    for (const theme of defaultThemes) {
      await this.run(
        `INSERT OR IGNORE INTO themes 
         (name, description, css_variables, is_default, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [
          theme.name,
          theme.description,
          theme.css_variables,
          theme.is_default ? 1 : 0,
          theme.is_active ? 1 : 0
        ]
      );
    }

    // Insert default content templates
    const defaultContent = [
      {
        page_type: 'home',
        language: 'en',
        industry: 'general',
        title: 'Welcome to {store_name}',
        subtitle: 'Discover amazing products crafted just for you',
        description: 'Your premier destination for quality products and exceptional service.',
        content_blocks: JSON.stringify([
          {
            type: 'hero',
            title: 'Welcome to {store_name}',
            subtitle: 'Discover amazing products crafted just for you',
            cta: 'Shop Now'
          },
          {
            type: 'features',
            items: [
              { title: 'Quality Products', description: 'Carefully curated selection' },
              { title: 'Fast Shipping', description: 'Quick and reliable delivery' },
              { title: 'Great Support', description: '24/7 customer service' }
            ]
          }
        ]),
        meta_title: '{store_name} - Quality Products & Service',
        meta_description: 'Discover amazing products at {store_name}. Quality items, fast shipping, and excellent customer service.',
        template_config: JSON.stringify({
          layout: 'hero-features',
          hero_height: 'large',
          show_featured_products: true
        })
      },
      {
        page_type: 'about',
        language: 'en',
        industry: 'general',
        title: 'About {store_name}',
        subtitle: 'Our story and mission',
        description: 'Learn more about our company, values, and commitment to quality.',
        content_blocks: JSON.stringify([
          {
            type: 'text',
            content: 'Founded with a passion for quality and customer satisfaction, {store_name} has been serving customers with dedication and excellence.'
          },
          {
            type: 'team',
            title: 'Our Team',
            description: 'Meet the people behind {store_name}'
          }
        ]),
        meta_title: 'About {store_name} - Our Story',
        meta_description: 'Learn about {store_name}, our mission, values, and commitment to providing quality products and exceptional service.',
        template_config: JSON.stringify({
          layout: 'text-with-image',
          show_team: true
        })
      },
      {
        page_type: 'contact',
        language: 'en',
        industry: 'general',
        title: 'Contact {store_name}',
        subtitle: 'Get in touch with us',
        description: 'We\'d love to hear from you. Send us a message and we\'ll respond as soon as possible.',
        content_blocks: JSON.stringify([
          {
            type: 'contact_form',
            fields: ['name', 'email', 'subject', 'message']
          },
          {
            type: 'contact_info',
            show_hours: true,
            show_location: true
          }
        ]),
        meta_title: 'Contact {store_name} - Get in Touch',
        meta_description: 'Contact {store_name} for any questions or support. We\'re here to help!',
        template_config: JSON.stringify({
          layout: 'form-with-info',
          show_map: false
        })
      }
    ];

    for (const content of defaultContent) {
      await this.run(
        `INSERT OR IGNORE INTO content_defaults 
         (page_type, language, industry, title, subtitle, description, content_blocks, meta_title, meta_description, template_config)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          content.page_type,
          content.language,
          content.industry,
          content.title,
          content.subtitle,
          content.description,
          content.content_blocks,
          content.meta_title,
          content.meta_description,
          content.template_config
        ]
      );
    }
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Database run error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Database get error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database all error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('📊 Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;