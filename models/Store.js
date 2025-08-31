const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const TemplateRenderer = require('../utils/TemplateRenderer');
const DeploymentAutomation = require('../utils/DeploymentAutomation');
const { PageTemplate } = require('./PageTemplate');
const LegalPageLoader = require('../utils/LegalPageLoader');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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
    this.theme_id_new = data.theme_id_new || null;
    this.template = data.template || 'bootstrap-default';
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
    this.business_orgnr = data.business_orgnr;
    this.gdpr_compliant = data.gdpr_compliant || false;
    this.cookie_consent = data.cookie_consent || false;
    this.selected_pages = data.selected_pages;
    this.selected_products = data.selected_products;
    
    // Pre-footer content
    this.prefooter_enabled = data.prefooter_enabled || false;
    this.prefooter_card1_image = data.prefooter_card1_image;
    this.prefooter_card1_title = data.prefooter_card1_title;
    this.prefooter_card1_text = data.prefooter_card1_text;
    this.prefooter_card2_image = data.prefooter_card2_image;
    this.prefooter_card2_title = data.prefooter_card2_title;
    this.prefooter_card2_text = data.prefooter_card2_text;
    this.prefooter_card3_image = data.prefooter_card3_image;
    this.prefooter_card3_title = data.prefooter_card3_title;
    this.prefooter_card3_text = data.prefooter_card3_text;
    
    this.status = data.status || 'setup';
    this.deployment_status = data.deployment_status || 'pending';
    this.deployment_url = data.deployment_url;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.deployed_at = data.deployed_at;
  }

  static async createDraft(storeData) {
    console.log('📝 Creating store as draft:', storeData.name);
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

    try {
      // Generate UUID for the store
      store.uuid = require('crypto').randomUUID();
      
      // Save store to database as draft (no files generated)  
      const result = await db.run(`
        INSERT INTO stores (
          uuid, name, domain, country, language, currency, timezone,
          shopify_domain, shopify_access_token, theme_id, deployment_status, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        store.uuid, store.name, store.domain, store.country, 
        store.language, store.currency, store.timezone, store.shopify_domain, 
        store.shopify_access_token, store.theme_id
      ]);
      
      store.id = result.lastID;
      console.log('✅ Store draft created successfully with ID:', store.id);
      
      return store;
    } catch (error) {
      console.error('❌ Error creating store draft:', error.message);
      throw error;
    }
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
      store.subdomain = await Store.generateUniqueSubdomain(store.name);
    }

    // Double-check subdomain uniqueness before insertion
    const subdomainConflict = await Store.findBySubdomain(store.subdomain);
    if (subdomainConflict) {
      console.log('⚠️ Subdomain conflict detected during final check, regenerating...');
      store.subdomain = await Store.generateUniqueSubdomain(store.name + '-alt');
    }

    console.log('🏷️ Final subdomain for store:', store.subdomain);
    console.log('🆔 Store UUID:', store.uuid);
    console.log('🌐 Store domain:', store.domain);

    try {
      const result = await db.run(
        `INSERT INTO stores (
          uuid, name, domain, subdomain, country, language, currency, timezone,
          shopify_domain, shopify_access_token, shopify_shop_name, shopify_connected,
          theme_id, theme_id_new, template, logo_url, primary_color, secondary_color,
          meta_title, meta_description, favicon_url,
          business_address, business_orgnr, support_email, support_phone,
          shipping_info, shipping_time, return_policy, return_period,
          gdpr_compliant, cookie_consent, selected_pages, selected_products,
          prefooter_enabled, prefooter_card1_image, prefooter_card1_title, prefooter_card1_text,
          prefooter_card2_image, prefooter_card2_title, prefooter_card2_text,
          prefooter_card3_image, prefooter_card3_title, prefooter_card3_text,
          status, deployment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          store.uuid, store.name, store.domain, store.subdomain,
          store.country, store.language, store.currency, store.timezone,
          store.shopify_domain, store.shopify_access_token, store.shopify_shop_name, store.shopify_connected ? 1 : 0,
          store.theme_id, store.theme_id_new, store.template, store.logo_url, store.primary_color, store.secondary_color,
          store.meta_title, store.meta_description, store.favicon_url,
          store.business_address, store.business_orgnr, store.support_email, store.support_phone,
          store.shipping_info, store.shipping_time, store.return_policy, store.return_period,
          store.gdpr_compliant ? 1 : 0, store.cookie_consent ? 1 : 0, store.selected_pages, store.selected_products,
          store.prefooter_enabled ? 1 : 0, store.prefooter_card1_image, store.prefooter_card1_title, store.prefooter_card1_text,
          store.prefooter_card2_image, store.prefooter_card2_title, store.prefooter_card2_text,
          store.prefooter_card3_image, store.prefooter_card3_title, store.prefooter_card3_text,
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
        
        // Update status to indicate files are ready for deployment
        await store.update({ 
          deployment_status: 'pending',
          files_generated_at: new Date().toISOString()
        });
        console.log('✅ Store files generated:', store.name);
        
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

  async publishDraft() {
    if (this.status !== 'draft') {
      throw new Error('Store is not in draft status');
    }
    
    console.log('📋 Publishing draft store:', this.name);
    
    try {
      // Create default pages for the store
      await this.createDefaultPages();
      console.log('✅ Default pages created for store:', this.name);
      
      // Generate physical store files
      await this.generateStoreFiles();
      console.log('✅ Store files generated for:', this.name);
      
      // Update status to published and trigger deployment
      await this.update({ 
        status: 'active',
        deployment_status: 'pending',
        files_generated_at: new Date().toISOString()
      });
      
      console.log('✅ Store published successfully:', this.name);
      return this;
      
    } catch (error) {
      console.error('❌ Error publishing store:', error.message);
      
      // Update deployment status to failed
      try {
        await this.update({ 
          status: 'failed',
          deployment_status: 'failed' 
        });
      } catch (updateError) {
        console.error('❌ Failed to update deployment status:', updateError.message);
      }
      
      throw error;
    }
  }

  static async findById(id) {
    const row = await db.get('SELECT * FROM stores WHERE id = ?', [id]);
    return row ? new Store(row) : null;
  }

  static async findByUuid(uuid) {
    const row = await db.get('SELECT * FROM stores WHERE uuid = ?', [uuid]);
    if (row) {
      console.log('🔍 DEBUG Store data loaded:', { name: row.name, theme_id: row.theme_id, theme_id_new: row.theme_id_new });
    }
    return row ? new Store(row) : null;
  }

  static async findByDomain(domain) {
    const row = await db.get('SELECT * FROM stores WHERE LOWER(domain) = LOWER(?) OR LOWER(subdomain) = LOWER(?)', [domain, domain]);
    return row ? new Store(row) : null;
  }

  static async findBySubdomain(subdomain) {
    const row = await db.get('SELECT * FROM stores WHERE subdomain = ?', [subdomain]);
    return row ? new Store(row) : null;
  }

  /**
   * Clean up any stores with duplicate subdomains
   * This is a maintenance method to fix any existing conflicts
   */
  static async cleanupDuplicateSubdomains() {
    console.log('💫 Checking for duplicate subdomains...');
    
    try {
      // Find all stores with duplicate subdomains
      const duplicates = await db.all(`
        SELECT subdomain, COUNT(*) as count 
        FROM stores 
        WHERE subdomain IS NOT NULL 
        GROUP BY subdomain 
        HAVING COUNT(*) > 1
      `);
      
      if (duplicates.length === 0) {
        console.log('✅ No duplicate subdomains found');
        return { fixed: 0, conflicts: 0 };
      }
      
      console.log(`⚠️ Found ${duplicates.length} subdomain conflicts:`);
      let fixedCount = 0;
      
      for (const duplicate of duplicates) {
        console.log(`  - "${duplicate.subdomain}" used by ${duplicate.count} stores`);
        
        // Get all stores with this subdomain
        const conflictingStores = await db.all(
          'SELECT * FROM stores WHERE subdomain = ? ORDER BY created_at ASC',
          [duplicate.subdomain]
        );
        
        // Keep the first one (oldest), update the rest
        for (let i = 1; i < conflictingStores.length; i++) {
          const store = new Store(conflictingStores[i]);
          const newSubdomain = await Store.generateUniqueSubdomain(store.name + '-fixed');
          
          await store.update({ subdomain: newSubdomain });
          console.log(`    → Updated store "${store.name}" to subdomain: ${newSubdomain}`);
          fixedCount++;
        }
      }
      
      console.log(`✅ Fixed ${fixedCount} subdomain conflicts`);
      return { fixed: fixedCount, conflicts: duplicates.length };
      
    } catch (error) {
      console.error('❌ Error cleaning up duplicate subdomains:', error.message);
      throw error;
    }
  }

  /**
   * Generate a unique subdomain with automatic conflict resolution
   * This method ensures no UNIQUE constraint failures ever occur
   */
  static async generateUniqueSubdomain(baseName) {
    console.log('🔄 Generating unique subdomain for:', baseName);
    
    // Create base subdomain from name
    let baseSubdomain = baseName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20); // Limit length to leave room for suffix
    
    // Ensure minimum length
    if (baseSubdomain.length < 3) {
      baseSubdomain = 'store-' + baseSubdomain;
    }
    
    // Check if base subdomain is available
    let candidateSubdomain = baseSubdomain;
    let existing = await Store.findBySubdomain(candidateSubdomain);
    
    if (!existing) {
      console.log('✅ Base subdomain available:', candidateSubdomain);
      return candidateSubdomain;
    }
    
    console.log('⚠️ Base subdomain taken, generating alternatives...');
    
    // Strategy 1: Add timestamp suffix
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits
    candidateSubdomain = `${baseSubdomain}-${timestamp}`;
    existing = await Store.findBySubdomain(candidateSubdomain);
    
    if (!existing) {
      console.log('✅ Timestamp subdomain available:', candidateSubdomain);
      return candidateSubdomain;
    }
    
    // Strategy 2: Add random suffix (extremely unlikely to conflict)
    for (let attempt = 1; attempt <= 10; attempt++) {
      const randomSuffix = Math.random().toString(36).substring(2, 8); // 6 chars
      candidateSubdomain = `${baseSubdomain}-${randomSuffix}`;
      existing = await Store.findBySubdomain(candidateSubdomain);
      
      if (!existing) {
        console.log('✅ Random subdomain available:', candidateSubdomain);
        return candidateSubdomain;
      }
      
      console.log(`⚠️ Attempt ${attempt}: ${candidateSubdomain} also taken, retrying...`);
    }
    
    // Strategy 3: Fallback with UUID (guaranteed unique)
    const { v4: uuidv4 } = require('uuid');
    const uuidSuffix = uuidv4().substring(0, 8);
    candidateSubdomain = `${baseSubdomain}-${uuidSuffix}`;
    
    console.log('🛡️ Using UUID fallback subdomain:', candidateSubdomain);
    return candidateSubdomain;
  }

  static async findAll() {
    const rows = await db.all('SELECT * FROM stores ORDER BY created_at DESC');
    return rows.map(row => new Store(row));
  }

  async update(updateData) {
    const allowedFields = [
      'name', 'domain', 'subdomain', 'country', 'language', 'currency', 'timezone',
      'shopify_domain', 'shopify_access_token', 'shopify_shop_name', 'shopify_connected',
      'theme_id', 'theme_id_new', 'template', 'logo_url', 'primary_color', 'secondary_color',
      'meta_title', 'meta_description', 'favicon_url',
      'shipping_info', 'shipping_time', 'return_policy', 'return_period',
      'support_email', 'support_phone', 'business_address', 'business_orgnr',
      'gdpr_compliant', 'cookie_consent', 'selected_pages', 'selected_products',
      // Pre-footer content fields
      'prefooter_enabled', 'prefooter_card1_image', 'prefooter_card1_title', 'prefooter_card1_text',
      'prefooter_card2_image', 'prefooter_card2_title', 'prefooter_card2_text',
      'prefooter_card3_image', 'prefooter_card3_title', 'prefooter_card3_text',
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
      console.log(`🗑️ Starting comprehensive deletion of store: ${this.name} (${this.domain})`);
      console.log(`📋 Correct order: Git → Vercel → Local Files → Database`);
      
      // 1. Clean up Git repository FIRST (while files still exist locally)
      console.log(`🔄 Step 1: Cleaning up Git repository (while files exist)...`);
      await this.cleanupGitRepository();
      console.log(`✅ Step 1 completed: Git cleanup done`);
      
      // 2. Clean up Vercel project and domain
      console.log(`🔄 Step 2: Cleaning up Vercel project and domain...`);
      await this.cleanupVercelProject();
      console.log(`✅ Step 2 completed: Vercel cleanup done`);
      
      // 3. Delete store files (now that Git and Vercel are cleaned)
      console.log(`🔄 Step 3: Deleting local store files...`);
      await this.deleteStoreFiles();
      console.log(`✅ Step 3 completed: Local files deleted`);
      
      // 4. Clean up orphaned database records
      console.log(`🔄 Step 4: Cleaning up orphaned database records...`);
      await this.cleanupOrphanedRecords();
      console.log(`✅ Step 4 completed: Database cleanup done`);
      
      // 5. Delete main store record from database (last step)
      console.log(`🔄 Step 5: Deleting main store record from database...`);
      await db.run('DELETE FROM stores WHERE id = ?', [this.id]);
      console.log(`✅ Step 5 completed: Store record deleted`);
      
      console.log(`✅ Store ${this.name} deleted successfully with COMPLETE automation cleanup`);
      console.log(`🎉 Full cleanup completed: Local files, Git, Database, and Vercel!`);
    } catch (error) {
      console.error(`❌ Error in comprehensive delete for store ${this.name}:`, error);
      console.error(`❌ Error details:`, error.message);
      console.error(`❌ Stack trace:`, error.stack);
      
      // Fall back to basic deletion if comprehensive fails
      console.log(`⚠️ Falling back to basic deletion (files + database only)...`);
      try {
        await this.deleteStoreFiles();
        await db.run('DELETE FROM stores WHERE id = ?', [this.id]);
        console.log(`✅ Store ${this.name} deleted successfully (basic cleanup only)`);
      } catch (basicError) {
        console.error(`❌ Even basic deletion failed:`, basicError);
        throw basicError;
      }
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
      
      // Map selected page names to internal page types
      const pageMapping = {
        'privacy-policy': 'privacy',
        'terms-of-service': 'terms',
        'return-policy': 'refund',
        'shipping-policy': 'delivery',
        'blog': 'blog',
        'faq': 'faq'
      };
      
      const mappedPages = selectedArray.map(page => pageMapping[page] || page);
      pagesToCreate = [...new Set([...pagesToCreate, ...mappedPages])];
    } else {
      // Default set including legal pages
      pagesToCreate = ['home', 'products', 'about', 'contact', 'terms', 'privacy', 'refund', 'delivery'];
    }
    
    console.log('📋 Pages to create:', pagesToCreate);
    
    // Define legal page types that should use professional templates
    const legalPages = ['terms', 'privacy', 'refund', 'delivery'];
    
    for (const pageType of pagesToCreate) {
      try {
        let pageContent = null;
        let isLegalPage = legalPages.includes(pageType);
        
        if (isLegalPage) {
          // Use localized legal pages from legal_pages folder
          try {
            console.log(`🏛️ Using localized legal page for ${pageType} (${this.language})`);
            const legalLoader = new LegalPageLoader();
            await legalLoader.loadAllLegalPages(); // Ensure pages are loaded
            
            const legalPage = legalLoader.getLegalPage(this.language, pageType);
            
            if (legalPage) {
              // Process the HTML content and replace placeholders
              const processedContent = this.replaceLegalPageVariables(legalPage.content);
              
              pageContent = {
                title: legalPage.title,
                subtitle: '',
                content: processedContent, // This is now full HTML content
                meta_title: legalPage.title,
                meta_description: `${legalPage.title} - ${this.name}`,
                slug: legalPage.slug // Use localized slug!
              };
              
              console.log(`✅ Created localized legal page: ${pageType} → /${legalPage.slug}.html`);
            } else {
              console.warn(`⚠️ No localized legal page found for ${pageType} in ${this.language}, falling back to basic page`);
              isLegalPage = false; // Fall back to basic content
            }
            
          } catch (templateError) {
            console.warn(`⚠️ Could not load localized legal page for ${pageType}:`, templateError.message);
            isLegalPage = false; // Fall back to basic content
          }
        }
        
        if (!isLegalPage) {
          // Try to get content from content_defaults for non-legal pages
          const defaultContent = await db.get(
            'SELECT * FROM content_defaults WHERE page_type = ? AND language = ?',
            [pageType, this.language]
          );

          if (defaultContent) {
            // Replace placeholders in content
            pageContent = this.replaceContentPlaceholders(defaultContent);
          } else {
            // Create basic page content
            console.log(`⚠️ No template found for ${pageType}, creating basic page`);
            pageContent = {
              title: this.name + ' - ' + pageType.charAt(0).toUpperCase() + pageType.slice(1),
              subtitle: 'Welcome to our ' + pageType + ' page',
              content: JSON.stringify([{
                type: 'text',
                content: `Welcome to the ${pageType} page of ${this.name}. This page is being built automatically.`
              }]),
              meta_title: `${this.name} - ${pageType.charAt(0).toUpperCase() + pageType.slice(1)}`,
              meta_description: `Visit our ${pageType} page at ${this.name}`,
              slug: pageType
            };
          }
        }
        
        if (pageContent) {
          await db.run(
            `INSERT OR REPLACE INTO store_pages (
              store_id, page_type, slug, title, subtitle, content,
              meta_title, meta_description, template_data, is_enabled
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              this.id,
              pageType,
              pageType === 'home' ? '' : (pageContent.slug || pageType),
              pageContent.title,
              pageContent.subtitle || '',
              pageContent.content,
              pageContent.meta_title,
              pageContent.meta_description,
              pageContent.template_config || JSON.stringify({ layout: 'basic' }),
              1
            ]
          );
          
          console.log(`✅ Created ${isLegalPage ? 'professional legal' : 'standard'} page: ${pageType}`);
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

  /**
   * Replace template variables in professional legal content
   * Variables use $variable_name format
   */
  replaceTemplateVariables(content) {
    if (!content) return content;
    
    // Define variable mappings
    const variables = {
      '$domain': this.domain,
      '$company_name': this.name,
      '$contact_email': this.support_email || `support@${this.domain}`,
      '$country': this.country,
      '$currency': this.currency,
      '$company_orgnr': this.business_orgnr || 'TBD',
      '$company_address': this.business_address || 'TBD'
    };
    
    let result = content;
    
    // Replace each variable with its corresponding value
    for (const [variable, value] of Object.entries(variables)) {
      // Escape the $ character for regex and create global regex
      const escapedVariable = variable.replace(/\$/g, '\\$');
      const regex = new RegExp(escapedVariable, 'g');
      result = result.replace(regex, value || 'TBD');
    }
    
    return result;
  }

  /**
   * Replace variables in legal page HTML content
   * Uses same variable mapping as replaceTemplateVariables
   */
  replaceLegalPageVariables(htmlContent) {
    if (!htmlContent) return htmlContent;
    
    // Use the existing variable replacement logic
    return this.replaceTemplateVariables(htmlContent);
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
   * Regenerate store files (useful for content updates)
   * For full deployment, use deploy() method instead
   */
  async regenerateStoreFiles() {
    try {
      console.log(`🔄 Regenerating store files for ${this.name}...`);
      
      // Just generate files without changing deployment status
      await this.generateStoreFiles();
      
      console.log(`✅ Store files regenerated for ${this.name}`);
      
    } catch (error) {
      console.error(`❌ Error regenerating store files for ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Regenerate legal pages with professional templates
   */
  async regenerateLegalPages() {
    try {
      console.log(`🏛️ Regenerating legal pages for ${this.name}...`);
      
      const legalPages = ['terms', 'privacy', 'refund', 'delivery'];
      let updatedCount = 0;
      
      for (const pageType of legalPages) {
        try {
          // Get professional template for this page type
          const template = await PageTemplate.getTranslatedContent(pageType, this.language);
          
          // Replace template variables with store data
          const processedContent = this.replaceTemplateVariables(template.content);
          
          const pageContent = {
            title: template.title,
            subtitle: '',
            content: processedContent,
            meta_title: this.replaceTemplateVariables(template.meta_title || template.title),
            meta_description: this.replaceTemplateVariables(template.meta_description || ''),
            slug: template.slug
          };
          
          // Update or create the page
          await db.run(
            `INSERT OR REPLACE INTO store_pages (
              store_id, page_type, slug, title, subtitle, content,
              meta_title, meta_description, template_data, is_enabled, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              this.id,
              pageType,
              pageType === 'home' ? '' : (pageContent.slug || pageType),
              pageContent.title,
              pageContent.subtitle || '',
              pageContent.content,
              pageContent.meta_title,
              pageContent.meta_description,
              JSON.stringify({ layout: 'legal', professional: true }),
              1
            ]
          );
          
          updatedCount++;
          console.log(`✅ Regenerated professional legal page: ${pageType}`);
          
        } catch (pageError) {
          console.warn(`⚠️ Could not regenerate ${pageType} page:`, pageError.message);
          // Continue with other pages
        }
      }
      
      if (updatedCount > 0) {
        // Regenerate store files to reflect the changes
        await this.regenerateStoreFiles();
        console.log(`✅ Regenerated ${updatedCount} legal pages for ${this.name}`);
      } else {
        console.warn(`⚠️ No legal pages were regenerated for ${this.name}`);
      }
      
      return updatedCount;
      
    } catch (error) {
      console.error(`❌ Error regenerating legal pages for ${this.name}:`, error);
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

  /**
   * Clean up Git repository (remove store files from version control)
   */
  async cleanupGitRepository() {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      const storePath = `stores/${this.domain}`;
      
      // Check if store directory exists in git
      try {
        await execAsync(`git ls-files ${storePath} | head -1`);
        
        // Remove from git and commit
        console.log(`🔧 Removing ${storePath} from Git repository...`);
        await execAsync(`git rm -r ${storePath}`);
        await execAsync(`git commit -m "Remove deleted store: ${this.domain}

🗑️ Store deletion cleanup:
- Removed store files from repository
- Cleaned up version control history
- Domain: ${this.domain}
- Store: ${this.name}

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"`);
        
        console.log(`✅ Git cleanup completed for ${this.name}`);
        
        // Push changes to remote
        try {
          await execAsync('git push');
          console.log(`✅ Pushed deletion commit to remote repository`);
        } catch (pushError) {
          console.warn(`⚠️ Failed to push to remote (continuing anyway):`, pushError.message);
        }
      } catch (lsError) {
        console.log(`ℹ️ Store ${storePath} not found in Git (already clean)`);
      }
    } catch (error) {
      console.error(`⚠️ Git cleanup failed for ${this.name}:`, error.message);
      // Don't throw error - continue with other cleanup steps
    }
  }

  /**
   * Clean up orphaned database records
   */
  async cleanupOrphanedRecords() {
    try {
      console.log(`🧹 Cleaning up orphaned database records for store ID: ${this.id}`);
      
      // Clean up related tables that might reference this store
      const cleanupQueries = [
        { table: 'store_pages', query: 'DELETE FROM store_pages WHERE store_id = ?' },
        { table: 'store_products', query: 'DELETE FROM store_products WHERE store_id = ?' },
        { table: 'store_settings', query: 'DELETE FROM store_settings WHERE store_id = ?' }
      ];
      
      for (const cleanup of cleanupQueries) {
        try {
          const result = await db.run(cleanup.query, [this.id]);
          if (result.changes > 0) {
            console.log(`✅ Cleaned up ${result.changes} records from ${cleanup.table}`);
          }
        } catch (tableError) {
          // Table might not exist - that's okay
          console.log(`ℹ️ Table ${cleanup.table} not found or already clean`);
        }
      }
      
      console.log(`✅ Database cleanup completed for ${this.name}`);
    } catch (error) {
      console.error(`⚠️ Database cleanup failed for ${this.name}:`, error.message);
      // Don't throw error - continue with deletion
    }
  }

  /**
   * Clean up Vercel project and domain
   */
  async cleanupVercelProject() {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      console.log(`🔧 Attempting to remove Vercel project for ${this.domain}...`);
      
      // STEP 1: Remove aliases FIRST (this is what keeps sites live)
      console.log(`🗑️ Removing aliases for ${this.domain}...`);
      try {
        await execAsync(`echo "y" | vercel alias rm ${this.domain}`, { timeout: 15000 });
        console.log(`✅ Removed alias for ${this.domain}`);
      } catch (aliasError) {
        console.log(`ℹ️ No alias found for ${this.domain} or already removed`);
      }
      
      // STEP 2: Skip deployment cleanup (this was causing issues)
      console.log(`ℹ️ Skipping deployment cleanup - aliases and domain removal are sufficient`);
      
      // STEP 3: Remove domain from Vercel
      try {
        await execAsync(`echo "y" | vercel domains rm ${this.domain}`, { timeout: 15000 });
        console.log(`✅ Removed domain ${this.domain} from Vercel`);
      } catch (domainError) {
        console.log(`ℹ️ Domain ${this.domain} not found in Vercel or already removed`);
      }
      
      // STEP 4: Clear ALL caches (final step to prevent any cached content)
      try {
        console.log(`🧹 Clearing ALL caches for ${this.domain} (final step)...`);
        
        // Multiple aggressive cache clearing approaches
        await execAsync(`curl -X PURGE "https://${this.domain}/" -H "Cache-Control: no-cache"`, { timeout: 10000 });
        await execAsync(`curl -X PURGE "https://${this.domain}/index.html" -H "Cache-Control: no-cache"`, { timeout: 10000 });
        await execAsync(`curl -X PURGE "https://${this.domain}/*" -H "Cache-Control: no-cache"`, { timeout: 10000 });
        
        // Force cache invalidation with multiple headers
        await execAsync(`curl -H "Cache-Control: no-cache, no-store, must-revalidate" -H "Pragma: no-cache" -H "Expires: 0" "https://${this.domain}/?cache_bust=${Date.now()}"`, { timeout: 10000 });
        
        // Additional CDN cache clearing
        await execAsync(`curl -X PURGE "https://${this.domain}" -H "CF-Cache-Status: BYPASS"`, { timeout: 10000 });
        
        console.log(`✅ ALL caches cleared for ${this.domain} - no stale content should remain`);
      } catch (cacheError) {
        console.log(`⚠️ Cache clearing failed for ${this.domain}: ${cacheError.message}`);
      }
      
      // STEP 4: Remove any remaining deployments
      try {
        console.log('🧹 Final cleanup: removing any remaining deployments...');
        const { stdout } = await execAsync('vercel list', { timeout: 10000 });
        
        const deploymentUrls = [];
        const lines = stdout.split('\n');
        for (const line of lines) {
          const urlMatch = line.match(/https:\/\/product-page-automation-project-[a-z0-9]+-trampolin1\.vercel\.app/);
          if (urlMatch) {
            deploymentUrls.push(urlMatch[0]);
          }
        }
        
        for (const url of deploymentUrls) {
          try {
            const deploymentId = url.split('-').slice(-2).join('-');
            console.log(`🗑️ Removing remaining deployment: ${deploymentId}`);
            await execAsync(`echo "y" | vercel remove ${deploymentId}`, { timeout: 15000 });
            console.log(`✅ Removed remaining deployment: ${deploymentId}`);
          } catch (removeError) {
            console.log(`⚠️ Could not remove remaining deployment: ${removeError.message}`);
          }
        }
        
      } catch (finalCleanupError) {
        console.log(`⚠️ Final deployment cleanup failed: ${finalCleanupError.message}`);
      }
      
      console.log(`✅ Vercel cleanup completed: ALL deployments removed, domain removed, caches cleared`);
      
      // Method 2: Try to delete the entire project
      try {
        // Get project info
        const projectListResult = await execAsync('vercel list');
        
        // Look for project with matching domain
        if (projectListResult.includes(this.domain)) {
          // Find project name/id from the list
          const lines = projectListResult.split('\n');
          for (const line of lines) {
            if (line.includes(this.domain)) {
              // Extract project name (first column typically)
              const projectName = line.trim().split(/\s+/)[0];
              
              if (projectName && projectName !== 'Name' && projectName.length > 0) {
                console.log(`🗑️ Attempting to remove Vercel project: ${projectName}`);
                
                try {
                  await execAsync(`vercel remove ${projectName}`);
                  console.log(`✅ Successfully removed Vercel project: ${projectName}`);
                } catch (removeError) {
                  console.warn(`⚠️ Could not remove project ${projectName}: ${removeError.message}`);
                }
              }
              break;
            }
          }
        } else {
          console.log(`ℹ️ No Vercel project found for ${this.domain}`);
        }
      } catch (listError) {
        console.log(`ℹ️ Could not list Vercel projects: ${listError.message}`);
      }
      
      console.log(`✅ Vercel cleanup completed for ${this.domain}`);
    } catch (error) {
      console.error(`⚠️ Vercel cleanup failed for ${this.domain}:`, error.message);
      console.log(`💡 Manual cleanup: Run 'vercel domains rm ${this.domain}' and remove project from Vercel dashboard`);
      // Don't throw error - this is optional cleanup
    }
  }

  /**
   * Check if domain is accessible
   */
  async isDomainLive() {
    try {
      const deploymentAutomation = new DeploymentAutomation();
      return await deploymentAutomation.verifyDomainLive(this.domain, 3, 5000); // Quick check
    } catch (error) {
      console.error(`Error checking domain ${this.domain}:`, error.message);
      return false;
    }
  }

  /**
   * Get deployment information
   */
  getDeploymentInfo() {
    return {
      status: this.deployment_status,
      url: this.deployment_url || `https://${this.domain}`,
      deployedAt: this.deployed_at,
      filesExist: this.storeFilesExist(),
      canDeploy: this.deployment_status !== 'deploying',
      needsDeployment: !this.storeFilesExist() || this.deployment_status === 'failed'
    };
  }

  /**
   * Fast deployment method for quick API responses
   */
  async deployFast(force = false) {
    try {
      console.log(`⚡ Fast deploying ${this.name}${force ? ' (FORCED)' : ''}`);
      
      // Check if already deployed and not forcing
      if (!force && this.deployment_status === 'deployed' && this.storeFilesExist()) {
        console.log(`✅ ${this.name} is already deployed at https://${this.domain}`);
        return {
          success: true,
          url: `https://${this.domain}`,
          isLive: true,
          message: 'Store is already deployed',
          alreadyDeployed: true
        };
      }
      
      // Update status to deploying
      await this.update({ deployment_status: 'deploying' });
      
      // Generate store files only
      console.log(`📁 Generating store files for ${this.name}...`);
      await this.generateStoreFiles();
      
      // Update status to indicate files are ready for deployment (Git automation only)
      await this.update({ 
        deployment_status: 'pending',
        files_generated_at: new Date().toISOString()
      });
      
      console.log(`⚡ ${this.name} deployed successfully (fast mode): https://${this.domain}`);
      return {
        success: true,
        url: `https://${this.domain}`,
        isLive: false, // Will be live shortly
        message: 'Fast deployment completed - files pushed to GitHub and will be live shortly'
      };
      
    } catch (error) {
      console.error(`❌ Fast deployment failed for ${this.name}:`, error.message);
      
      // Update deployment status to failed
      await this.update({ deployment_status: 'failed' });
      
      throw new Error(`Fast deployment failed: ${error.message}`);
    }
  }

  /**
   * Single, reliable deployment method - handles all deployment scenarios
   * This replaces forceDeploy, deployToLive, regenerateStoreFiles etc.
   */
  async deploy(progressCallback = null, force = false) {
    try {
      console.log(`🚀 Deploying ${this.name} - Single reliable deployment path${force ? ' (FORCED)' : ''}`);
      
      // Check if already deployed and not forcing
      if (!force && this.deployment_status === 'deployed' && this.storeFilesExist()) {
        console.log(`✅ ${this.name} is already deployed at https://${this.domain}`);
        return {
          success: true,
          url: `https://${this.domain}`,
          isLive: true,
          message: 'Store is already deployed',
          alreadyDeployed: true
        };
      }
      
      // Update status to deploying
      await this.update({ deployment_status: 'deploying' });
      
      // Step 1: Generate/regenerate store files
      console.log(`📁 Generating store files for ${this.name}...`);
      await this.generateStoreFiles();
      
      // Step 2: Execute deployment automation
      console.log(`🚀 Executing deployment automation for ${this.name}...`);
      const deploymentAutomation = new DeploymentAutomation();
      const result = await deploymentAutomation.executeCompleteDeployment(this, {
        progressCallback
      });
      
      if (result.success) {
        // Update deployment status to success
        await this.update({ 
          deployment_status: 'deployed',
          deployed_at: new Date().toISOString(),
          deployment_url: `https://${this.domain}`
        });
        
        console.log(`✅ ${this.name} deployed successfully: https://${this.domain}`);
        return {
          success: true,
          url: `https://${this.domain}`,
          isLive: result.isLive || false,
          message: 'Deployment completed successfully'
        };
      } else {
        await this.update({ deployment_status: 'failed' });
        throw new Error('Deployment automation failed');
      }
      
    } catch (error) {
      console.error(`❌ Deployment failed for ${this.name}:`, error.message);
      
      // Update deployment status to failed
      await this.update({ deployment_status: 'failed' });
      
      throw new Error(`Deployment failed: ${error.message}`);
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
      theme_id_new: this.theme_id_new,
      template: this.template,
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
      business_orgnr: this.business_orgnr,
      gdpr_compliant: this.gdpr_compliant,
      cookie_consent: this.cookie_consent,
      selected_pages: this.selected_pages,
      selected_products: this.selected_products,
      // Pre-footer fields
      prefooter_enabled: this.prefooter_enabled,
      prefooter_card1_image: this.prefooter_card1_image,
      prefooter_card1_title: this.prefooter_card1_title,
      prefooter_card1_text: this.prefooter_card1_text,
      prefooter_card2_image: this.prefooter_card2_image,
      prefooter_card2_title: this.prefooter_card2_title,
      prefooter_card2_text: this.prefooter_card2_text,
      prefooter_card3_image: this.prefooter_card3_image,
      prefooter_card3_title: this.prefooter_card3_title,
      prefooter_card3_text: this.prefooter_card3_text,
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

  // Get store pages for content editing
  async getPages() {
    const pages = await db.all('SELECT * FROM store_pages WHERE store_id = ? ORDER BY sort_order, page_type', [this.id]);
    
    // If no pages exist, create default pages from content_defaults
    if (pages.length === 0) {
      console.log(`📄 No pages found for store ${this.name}, creating default pages...`);
      await this.createDefaultPages();
      return await db.all('SELECT * FROM store_pages WHERE store_id = ? ORDER BY sort_order, page_type', [this.id]);
    }
    
    return pages;
  }

  // Create default pages for a store from content_defaults
  async createDefaultPages() {
    const defaultContent = await db.all(
      'SELECT * FROM content_defaults WHERE language = ? OR language = "en" ORDER BY page_type', 
      [this.language]
    );

    const defaultPageTypes = ['home', 'about', 'contact'];
    
    for (const pageType of defaultPageTypes) {
      const content = defaultContent.find(c => c.page_type === pageType && c.language === this.language) ||
                     defaultContent.find(c => c.page_type === pageType && c.language === 'en');
      
      if (content) {
        await db.run(
          `INSERT INTO store_pages 
           (store_id, page_type, slug, title, subtitle, content, meta_title, meta_description, template_data) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            this.id,
            content.page_type,
            content.page_type === 'home' ? '' : content.page_type,
            content.title.replace('{store_name}', this.name),
            content.subtitle.replace('{store_name}', this.name),
            content.description.replace('{store_name}', this.name),
            content.meta_title.replace('{store_name}', this.name),
            content.meta_description.replace('{store_name}', this.name),
            content.template_config
          ]
        );
      }
    }
  }

  // Get specific page for editing
  async getPage(pageType) {
    return await db.get('SELECT * FROM store_pages WHERE store_id = ? AND page_type = ?', [this.id, pageType]);
  }

  // Update page content
  async updatePage(pageType, pageData) {
    const allowedFields = ['title', 'subtitle', 'content', 'meta_title', 'meta_description', 'is_enabled'];
    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(pageData)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length > 0) {
      updateValues.push(this.id, pageType);
      await db.run(
        `UPDATE store_pages SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
         WHERE store_id = ? AND page_type = ?`,
        updateValues
      );
    }
  }

  /**
   * Fetch products from Shopify API
   */
  async fetchShopifyProducts(limit = 50) {
    if (!this.shopify_domain || !this.shopify_access_token) {
      console.log(`⚠️ No Shopify connection configured for ${this.name}`);
      return [];
    }

    try {
      console.log(`🛒 Fetching products from ${this.shopify_domain}...`);
      
      let products = [];
      
      if (this.shopify_access_token.startsWith('shpat_') || this.shopify_access_token.startsWith('shpca_')) {
        // Admin API
        const response = await axios.get(`https://${this.shopify_domain}/admin/api/2023-10/products.json`, {
          headers: {
            'X-Shopify-Access-Token': this.shopify_access_token,
            'Content-Type': 'application/json'
          },
          params: {
            limit: limit,
            status: 'active'
          },
          timeout: 15000
        });

        products = response.data.products.map(product => ({
          id: product.id,
          handle: product.handle,
          title: product.title,
          description: product.body_html || '',
          vendor: product.vendor || '',
          product_type: product.product_type || '',
          tags: product.tags ? product.tags.split(',').map(tag => tag.trim()) : [],
          images: product.images.map(img => ({
            id: img.id,
            src: img.src,
            alt: img.alt || product.title
          })),
          variants: product.variants.map(variant => ({
            id: variant.id,
            title: variant.title,
            price: parseFloat(variant.price),
            compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            available: variant.inventory_quantity > 0,
            inventory_quantity: variant.inventory_quantity,
            sku: variant.sku || ''
          })),
          created_at: product.created_at,
          updated_at: product.updated_at
        }));

      } else {
        // Storefront API
        const query = `
          query getProducts($first: Int!) {
            products(first: $first) {
              edges {
                node {
                  id
                  handle
                  title
                  description
                  vendor
                  productType
                  tags
                  images(first: 10) {
                    edges {
                      node {
                        id
                        url
                        altText
                      }
                    }
                  }
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        title
                        price {
                          amount
                          currencyCode
                        }
                        compareAtPrice {
                          amount
                          currencyCode
                        }
                        availableForSale
                        quantityAvailable
                        sku
                      }
                    }
                  }
                  createdAt
                  updatedAt
                }
              }
            }
          }
        `;

        const response = await axios.post(`https://${this.shopify_domain}/api/2023-10/graphql.json`, {
          query,
          variables: { first: limit }
        }, {
          headers: {
            'X-Shopify-Storefront-Access-Token': this.shopify_access_token,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        products = response.data.data.products.edges.map(edge => {
          const product = edge.node;
          return {
            id: product.id,
            handle: product.handle,
            title: product.title,
            description: product.description || '',
            vendor: product.vendor || '',
            product_type: product.productType || '',
            tags: product.tags || [],
            images: product.images.edges.map(imgEdge => ({
              id: imgEdge.node.id,
              src: imgEdge.node.url,
              alt: imgEdge.node.altText || product.title
            })),
            variants: product.variants.edges.map(varEdge => {
              const variant = varEdge.node;
              return {
                id: variant.id,
                title: variant.title,
                price: parseFloat(variant.price.amount),
                compare_at_price: variant.compareAtPrice ? parseFloat(variant.compareAtPrice.amount) : null,
                available: variant.availableForSale,
                inventory_quantity: variant.quantityAvailable,
                sku: variant.sku || ''
              };
            }),
            created_at: product.createdAt,
            updated_at: product.updatedAt
          };
        });
      }

      console.log(`✅ Fetched ${products.length} products from ${this.shopify_domain}`);
      return products;

    } catch (error) {
      console.error(`❌ Error fetching products from ${this.shopify_domain}:`, error.message);
      return [];
    }
  }

  /**
   * Get product by handle
   */
  async getShopifyProduct(handle) {
    if (!this.shopify_domain || !this.shopify_access_token) {
      console.log(`⚠️ No Shopify connection configured for ${this.name}`);
      return null;
    }

    try {
      console.log(`🔍 Fetching product ${handle} from ${this.shopify_domain}...`);
      
      if (this.shopify_access_token.startsWith('shpat_') || this.shopify_access_token.startsWith('shpca_')) {
        // Admin API
        const response = await axios.get(`https://${this.shopify_domain}/admin/api/2023-10/products.json`, {
          headers: {
            'X-Shopify-Access-Token': this.shopify_access_token,
            'Content-Type': 'application/json'
          },
          params: {
            handle: handle,
            status: 'active'
          },
          timeout: 10000
        });

        if (response.data.products.length === 0) {
          return null;
        }

        const product = response.data.products[0];
        return {
          id: product.id,
          handle: product.handle,
          title: product.title,
          description: product.body_html || '',
          vendor: product.vendor || '',
          product_type: product.product_type || '',
          tags: product.tags ? product.tags.split(',').map(tag => tag.trim()) : [],
          images: product.images.map(img => ({
            id: img.id,
            src: img.src,
            alt: img.alt || product.title
          })),
          variants: product.variants.map(variant => ({
            id: variant.id,
            title: variant.title,
            price: parseFloat(variant.price),
            compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            available: variant.inventory_quantity > 0,
            inventory_quantity: variant.inventory_quantity,
            sku: variant.sku || ''
          })),
          created_at: product.created_at,
          updated_at: product.updated_at
        };

      } else {
        // Storefront API  
        const query = `
          query getProduct($handle: String!) {
            product(handle: $handle) {
              id
              handle
              title
              description
              vendor
              productType
              tags
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                    availableForSale
                    quantityAvailable
                    sku
                  }
                }
              }
              createdAt
              updatedAt
            }
          }
        `;

        const response = await axios.post(`https://${this.shopify_domain}/api/2023-10/graphql.json`, {
          query,
          variables: { handle }
        }, {
          headers: {
            'X-Shopify-Storefront-Access-Token': this.shopify_access_token,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        const product = response.data.data.product;
        if (!product) {
          return null;
        }

        return {
          id: product.id,
          handle: product.handle,
          title: product.title,
          description: product.description || '',
          vendor: product.vendor || '',
          product_type: product.productType || '',
          tags: product.tags || [],
          images: product.images.edges.map(edge => ({
            id: edge.node.id,
            src: edge.node.url,
            alt: edge.node.altText || product.title
          })),
          variants: product.variants.edges.map(edge => {
            const variant = edge.node;
            return {
              id: variant.id,
              title: variant.title,
              price: parseFloat(variant.price.amount),
              compare_at_price: variant.compareAtPrice ? parseFloat(variant.compareAtPrice.amount) : null,
              available: variant.availableForSale,
              inventory_quantity: variant.quantityAvailable,
              sku: variant.sku || ''
            };
          }),
          created_at: product.createdAt,
          updated_at: product.updatedAt
        };
      }

    } catch (error) {
      console.error(`❌ Error fetching product ${handle} from ${this.shopify_domain}:`, error.message);
      return null;
    }
  }
}

module.exports = Store;