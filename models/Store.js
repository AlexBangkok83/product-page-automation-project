const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const TemplateRenderer = require('../utils/TemplateRenderer');
const fs = require('fs');
const path = require('path');

class Store {
  constructor(data = {}) {
    this.id = data.id;
    this.uuid = data.uuid || uuidv4();
    this.name = data.name;
    this.domain = data.domain;
    this.subdomain = data.subdomain;
    this.country = data.country;
    this.language = data.language;
    this.currency = data.currency;
    this.timezone = data.timezone || 'UTC';
    this.shopify_domain = data.shopify_domain;
    this.shopify_access_token = data.shopify_access_token;
    this.shopify_shop_name = data.shopify_shop_name;
    this.shopify_connected = data.shopify_connected || false;
    this.theme_id = data.theme_id || 'default';
    this.logo_url = data.logo_url;
    this.primary_color = data.primary_color || '#007cba';
    this.secondary_color = data.secondary_color || '#f8f9fa';
    this.meta_title = data.meta_title;
    this.meta_description = data.meta_description;
    this.favicon_url = data.favicon_url;
    // Store settings
    this.shipping_info = data.shipping_info;
    this.shipping_time = data.shipping_time;
    this.return_policy = data.return_policy;
    this.return_period = data.return_period;
    this.support_email = data.support_email;
    this.support_phone = data.support_phone;
    this.business_address = data.business_address;
    this.gdpr_compliant = data.gdpr_compliant || false;
    this.cookie_consent = data.cookie_consent || false;
    this.selected_pages = data.selected_pages;
    this.status = data.status || 'setup';
    this.deployment_status = data.deployment_status || 'pending';
    this.deployment_url = data.deployment_url;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.deployed_at = data.deployed_at;
  }

  static async create(storeData) {
    console.log('🏪 Creating new store:', storeData.name);
    const store = new Store(storeData);
    
    // Validate required fields
    if (!store.name || !store.domain || !store.country || !store.language || !store.currency) {
      throw new Error('Missing required fields: name, domain, country, language, currency');
    }

    // Check for domain conflicts
    const existingStore = await Store.findByDomain(store.domain);
    if (existingStore) {
      throw new Error(`Domain conflict: A store already exists with domain "${store.domain}". Please choose a different domain or update the existing store.`);
    }

    // Check for filesystem conflicts
    const fs = require('fs');
    const path = require('path');
    const storePath = path.join(process.cwd(), 'stores', store.domain);
    
    if (fs.existsSync(storePath)) {
      throw new Error(`File system conflict: Directory "stores/${store.domain}" already exists. Please choose a different domain or remove the existing directory.`);
    }

    // Generate subdomain from name if not provided
    if (!store.subdomain) {
      store.subdomain = store.name.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    try {
      const result = await db.run(
        `INSERT INTO stores (
          uuid, name, domain, subdomain, country, language, currency, timezone,
          shopify_domain, shopify_access_token, shopify_shop_name, shopify_connected,
          theme_id, logo_url, primary_color, secondary_color,
          meta_title, meta_description, favicon_url,
          status, deployment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          store.uuid, store.name, store.domain, store.subdomain,
          store.country, store.language, store.currency, store.timezone,
          store.shopify_domain, store.shopify_access_token, store.shopify_shop_name, store.shopify_connected ? 1 : 0,
          store.theme_id, store.logo_url, store.primary_color, store.secondary_color,
          store.meta_title, store.meta_description, store.favicon_url,
          store.status, store.deployment_status
        ]
      );

      store.id = result.id;
      console.log('✅ Store created successfully with ID:', store.id);
      
      // Create default pages for the store
      try {
        await store.createDefaultPages();
        console.log('✅ Default pages created for store:', store.name);
        
        // Generate physical store files
        await store.generateStoreFiles();
        console.log('✅ Store files generated for:', store.name);
        
        // Update deployment status
        await store.update({ 
          deployment_status: 'deployed',
          deployed_at: new Date().toISOString()
        });
        console.log('✅ Store deployment completed:', store.name);
        
      } catch (pageError) {
        console.error('⚠️ Error creating pages/files:', pageError.message);
        // Update deployment status to failed
        try {
          await store.update({ deployment_status: 'failed' });
        } catch (updateError) {
          console.error('❌ Failed to update deployment status:', updateError.message);
        }
        // Don't fail the entire store creation if page creation fails
      }
      
      return store;
    } catch (error) {
      console.error('❌ Error creating store:', error.message);
      throw error;
    }
  }

  static async findById(id) {
    const row = await db.get('SELECT * FROM stores WHERE id = ?', [id]);
    return row ? new Store(row) : null;
  }

  static async findByUuid(uuid) {
    const row = await db.get('SELECT * FROM stores WHERE uuid = ?', [uuid]);
    return row ? new Store(row) : null;
  }

  static async findByDomain(domain) {
    const row = await db.get('SELECT * FROM stores WHERE domain = ? OR subdomain = ?', [domain, domain]);
    return row ? new Store(row) : null;
  }

  static async findAll() {
    const rows = await db.all('SELECT * FROM stores ORDER BY created_at DESC');
    return rows.map(row => new Store(row));
  }

  async update(updateData) {
    const allowedFields = [
      'name', 'domain', 'subdomain', 'country', 'language', 'currency', 'timezone',
      'shopify_domain', 'shopify_access_token', 'shopify_shop_name', 'shopify_connected',
      'theme_id', 'logo_url', 'primary_color', 'secondary_color',
      'meta_title', 'meta_description', 'favicon_url',
      'shipping_info', 'shipping_time', 'return_policy', 'return_period',
      'support_email', 'support_phone', 'business_address',
      'gdpr_compliant', 'cookie_consent', 'selected_pages',
      'status', 'deployment_status', 'deployment_url'
    ];

    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
        this[key] = value;
      }
    }

    if (updateFields.length === 0) {
      return this;
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(this.id);

    await db.run(
      `UPDATE stores SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    return this;
  }

  async delete() {
    try {
      // Delete store files first
      await this.deleteStoreFiles();
      
      // Delete from database
      await db.run('DELETE FROM stores WHERE id = ?', [this.id]);
      
      console.log(`✅ Store ${this.name} deleted successfully`);
    } catch (error) {
      console.error(`❌ Error deleting store ${this.name}:`, error);
      throw error;
    }
  }

  async createDefaultPages() {
    console.log('📄 Creating default pages for store:', this.name);
    
    // Determine which pages to create based on selected_pages or use defaults
    let pagesToCreate = ['home', 'products']; // Always create these essential pages
    
    if (this.selected_pages) {
      const selectedArray = typeof this.selected_pages === 'string' 
        ? this.selected_pages.split(',') 
        : this.selected_pages;
      
      // Add any additional selected pages
      pagesToCreate = [...new Set([...pagesToCreate, ...selectedArray])];
    } else {
      // Default set if no selection
      pagesToCreate = ['home', 'products', 'about', 'contact'];
    }
    
    console.log('📋 Pages to create:', pagesToCreate);
    
    for (const pageType of pagesToCreate) {
      try {
        // Get default content for this page type and language
        const defaultContent = await db.get(
          'SELECT * FROM content_defaults WHERE page_type = ? AND language = ?',
          [pageType, this.language]
        );

        if (defaultContent) {
          // Replace placeholders in content
          const processedContent = this.replaceContentPlaceholders(defaultContent);
          
          await db.run(
            `INSERT OR REPLACE INTO store_pages (
              store_id, page_type, slug, title, subtitle, content,
              meta_title, meta_description, template_data, is_enabled
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              this.id,
              pageType,
              pageType === 'home' ? '' : pageType,
              processedContent.title,
              processedContent.subtitle,
              processedContent.content_blocks,
              processedContent.meta_title,
              processedContent.meta_description,
              processedContent.template_config,
              1
            ]
          );
          
          console.log(`✅ Created page: ${pageType}`);
        } else {
          // Create a basic page if no template exists
          console.log(`⚠️ No template found for ${pageType}, creating basic page`);
          
          await db.run(
            `INSERT OR REPLACE INTO store_pages (
              store_id, page_type, slug, title, subtitle, content,
              meta_title, meta_description, template_data, is_enabled
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              this.id,
              pageType,
              pageType === 'home' ? '' : pageType,
              this.name + ' - ' + pageType.charAt(0).toUpperCase() + pageType.slice(1),
              'Welcome to our ' + pageType + ' page',
              JSON.stringify([{
                type: 'text',
                content: `Welcome to the ${pageType} page of ${this.name}. This page is being built automatically.`
              }]),
              `${this.name} - ${pageType.charAt(0).toUpperCase() + pageType.slice(1)}`,
              `Visit our ${pageType} page at ${this.name}`,
              JSON.stringify({ layout: 'basic' }),
              1
            ]
          );
          
          console.log(`✅ Created basic page: ${pageType}`);
        }
      } catch (pageError) {
        console.error(`❌ Error creating page ${pageType}:`, pageError.message);
        // Continue with other pages even if one fails
      }
    }
  }

  replaceContentPlaceholders(content) {
    const placeholders = {
      '{store_name}': this.name,
      '{store_domain}': this.domain,
      '{store_country}': this.country,
      '{store_currency}': this.currency,
      '{support_email}': this.support_email || 'support@' + this.domain,
      '{support_phone}': this.support_phone || '',
      '{business_address}': this.business_address || ''
    };

    const processed = { ...content };
    
    // Helper function to replace placeholders in a string
    const replacePlaceholders = (text) => {
      if (!text) return text;
      let result = text;
      for (const [placeholder, value] of Object.entries(placeholders)) {
        result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value || '');
      }
      return result;
    };
    
    // Replace placeholders in all text fields
    ['title', 'subtitle', 'description', 'meta_title', 'meta_description'].forEach(field => {
      if (processed[field]) {
        processed[field] = replacePlaceholders(processed[field]);
      }
    });
    
    // Replace placeholders in content blocks (JSON)
    if (processed.content_blocks) {
      try {
        const blocks = JSON.parse(processed.content_blocks);
        const processedBlocks = JSON.stringify(blocks).replace(
          /{store_name}|{store_domain}|{store_country}|{store_currency}|{support_email}|{support_phone}|{business_address}/g,
          (match) => placeholders[match] || match
        );
        processed.content_blocks = processedBlocks;
      } catch (error) {
        console.error('Error processing content blocks:', error);
      }
    }

    return processed;
  }

  async getPages() {
    const pages = await db.all(
      'SELECT * FROM store_pages WHERE store_id = ? ORDER BY sort_order, page_type',
      [this.id]
    );
    return pages;
  }

  /**
   * Generate physical store files from database content
   */
  async generateStoreFiles() {
    try {
      console.log(`🎨 Generating store files for ${this.name}...`);
      
      // Get all pages for this store
      const pages = await this.getPages();
      
      if (pages.length === 0) {
        console.warn(`⚠️ No pages found for store ${this.name}, skipping file generation`);
        return;
      }
      
      // Initialize template renderer
      const renderer = new TemplateRenderer();
      
      // Generate all files
      const storePath = await renderer.generateStoreFiles(this, pages);
      
      console.log(`✅ Store files generated at: ${storePath}`);
      return storePath;
      
    } catch (error) {
      console.error(`❌ Error generating store files for ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Regenerate store files (useful for updates)
   */
  async regenerateStoreFiles() {
    try {
      console.log(`🔄 Regenerating store files for ${this.name}...`);
      
      // Update deployment status
      await this.update({ deployment_status: 'deploying' });
      
      // Generate files
      await this.generateStoreFiles();
      
      // Update deployment status
      await this.update({ 
        deployment_status: 'deployed',
        deployed_at: new Date().toISOString()
      });
      
      console.log(`✅ Store files regenerated for ${this.name}`);
      
    } catch (error) {
      console.error(`❌ Error regenerating store files for ${this.name}:`, error);
      
      // Update deployment status to failed
      await this.update({ deployment_status: 'failed' });
      throw error;
    }
  }

  /**
   * Check if store files exist
   */
  storeFilesExist() {
    const storePath = path.join(process.cwd(), 'stores', this.domain);
    const indexPath = path.join(storePath, 'index.html');
    return fs.existsSync(indexPath);
  }

  /**
   * Get store file path
   */
  getStorePath() {
    return path.join(process.cwd(), 'stores', this.domain);
  }

  /**
   * Delete store files
   */
  async deleteStoreFiles() {
    try {
      const storePath = this.getStorePath();
      
      if (fs.existsSync(storePath)) {
        fs.rmSync(storePath, { recursive: true, force: true });
        console.log(`✅ Deleted store files for ${this.name}`);
      }
    } catch (error) {
      console.error(`❌ Error deleting store files for ${this.name}:`, error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      uuid: this.uuid,
      name: this.name,
      domain: this.domain,
      subdomain: this.subdomain,
      country: this.country,
      language: this.language,
      currency: this.currency,
      timezone: this.timezone,
      shopify_domain: this.shopify_domain,
      shopify_shop_name: this.shopify_shop_name,
      shopify_connected: this.shopify_connected,
      theme_id: this.theme_id,
      logo_url: this.logo_url,
      primary_color: this.primary_color,
      secondary_color: this.secondary_color,
      meta_title: this.meta_title,
      meta_description: this.meta_description,
      favicon_url: this.favicon_url,
      shipping_info: this.shipping_info,
      shipping_time: this.shipping_time,
      return_policy: this.return_policy,
      return_period: this.return_period,
      support_email: this.support_email,
      support_phone: this.support_phone,
      business_address: this.business_address,
      gdpr_compliant: this.gdpr_compliant,
      cookie_consent: this.cookie_consent,
      selected_pages: this.selected_pages,
      status: this.status,
      deployment_status: this.deployment_status,
      deployment_url: this.deployment_url,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deployed_at: this.deployed_at,
      // Additional computed properties
      files_exist: this.storeFilesExist(),
      store_path: this.getStorePath(),
      live_url: `https://${this.domain}`
    };
  }
}

module.exports = Store;