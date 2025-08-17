const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

class CompanyShopifyStore {
  constructor(data = {}) {
    this.id = data.id;
    this.uuid = data.uuid || uuidv4();
    this.nickname = data.nickname;
    this.shopify_domain = data.shopify_domain;
    this.shopify_access_token = data.shopify_access_token;
    this.shopify_shop_name = data.shopify_shop_name;
    this.shopify_email = data.shopify_email;
    this.shopify_currency = data.shopify_currency;
    this.shopify_timezone = data.shopify_timezone;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.connection_status = data.connection_status || 'pending';
    this.last_validated_at = data.last_validated_at;
    this.validation_error = data.validation_error;
    this.product_count = data.product_count || 0;
    this.last_sync_at = data.last_sync_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create(storeData) {
    console.log('🏪 Creating new company Shopify store:', storeData.nickname);
    const store = new CompanyShopifyStore(storeData);
    
    // Validate required fields
    if (!store.nickname || !store.shopify_domain || !store.shopify_access_token) {
      throw new Error('Missing required fields: nickname, shopify_domain, shopify_access_token');
    }

    // Normalize domain
    store.shopify_domain = store.shopify_domain.includes('.myshopify.com') 
      ? store.shopify_domain 
      : `${store.shopify_domain}.myshopify.com`;

    // Check for domain conflicts
    const existingStore = await CompanyShopifyStore.findByDomain(store.shopify_domain);
    if (existingStore) {
      throw new Error(`Shopify domain conflict: A store already exists with domain "${store.shopify_domain}". Please choose a different domain.`);
    }

    try {
      // Validate connection before saving
      const validationResult = await store.validateConnection();
      if (validationResult.success) {
        store.shopify_shop_name = validationResult.data.shopName;
        store.shopify_email = validationResult.data.email;
        store.shopify_currency = validationResult.data.currency;
        store.shopify_timezone = validationResult.data.timezone;
        store.product_count = validationResult.data.productCount;
        store.connection_status = 'connected';
        store.last_validated_at = new Date().toISOString();
      } else {
        store.connection_status = 'failed';
        store.validation_error = validationResult.error;
      }

      const result = await db.run(
        `INSERT INTO company_shopify_stores (
          uuid, nickname, shopify_domain, shopify_access_token, shopify_shop_name,
          shopify_email, shopify_currency, shopify_timezone, is_active,
          connection_status, last_validated_at, validation_error, product_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          store.uuid, store.nickname, store.shopify_domain, store.shopify_access_token,
          store.shopify_shop_name, store.shopify_email, store.shopify_currency,
          store.shopify_timezone, store.is_active ? 1 : 0, store.connection_status,
          store.last_validated_at, store.validation_error, store.product_count
        ]
      );

      store.id = result.id;
      console.log('✅ Company Shopify store created successfully with ID:', store.id);
      
      return store;
    } catch (error) {
      console.error('❌ Error creating company Shopify store:', error.message);
      throw error;
    }
  }

  static async findById(id) {
    const row = await db.get('SELECT * FROM company_shopify_stores WHERE id = ?', [id]);
    return row ? new CompanyShopifyStore(row) : null;
  }

  static async findByUuid(uuid) {
    const row = await db.get('SELECT * FROM company_shopify_stores WHERE uuid = ?', [uuid]);
    return row ? new CompanyShopifyStore(row) : null;
  }

  static async findByDomain(domain) {
    const row = await db.get('SELECT * FROM company_shopify_stores WHERE shopify_domain = ?', [domain]);
    return row ? new CompanyShopifyStore(row) : null;
  }

  static async findAll(activeOnly = false) {
    const sql = activeOnly 
      ? 'SELECT * FROM company_shopify_stores WHERE is_active = 1 ORDER BY created_at DESC'
      : 'SELECT * FROM company_shopify_stores ORDER BY created_at DESC';
    const rows = await db.all(sql);
    return rows.map(row => new CompanyShopifyStore(row));
  }

  async update(updateData) {
    const allowedFields = [
      'nickname', 'shopify_domain', 'shopify_access_token', 'shopify_shop_name',
      'shopify_email', 'shopify_currency', 'shopify_timezone', 'is_active',
      'connection_status', 'last_validated_at', 'validation_error',
      'product_count', 'last_sync_at'
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
      `UPDATE company_shopify_stores SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    return this;
  }

  async delete() {
    try {
      await db.run('DELETE FROM company_shopify_stores WHERE id = ?', [this.id]);
      console.log(`✅ Company Shopify store ${this.nickname} deleted successfully`);
    } catch (error) {
      console.error(`❌ Error deleting company Shopify store ${this.nickname}:`, error);
      throw error;
    }
  }

  async validateConnection() {
    try {
      console.log(`🔍 Validating Shopify connection for ${this.shopify_domain}...`);
      
      // Test Shopify API connection
      const response = await axios.get(`https://${this.shopify_domain}/admin/api/2023-10/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': this.shopify_access_token,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const shopData = response.data.shop;
      
      // Get product count
      const productCountResponse = await axios.get(`https://${this.shopify_domain}/admin/api/2023-10/products/count.json`, {
        headers: {
          'X-Shopify-Access-Token': this.shopify_access_token,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        success: true,
        data: {
          shopName: shopData.name,
          shopDomain: shopData.domain,
          myshopifyDomain: shopData.myshopify_domain,
          email: shopData.email,
          currency: shopData.currency,
          timezone: shopData.iana_timezone,
          productCount: productCountResponse.data.count || 0
        }
      };
    } catch (error) {
      console.error(`❌ Shopify validation failed for ${this.shopify_domain}:`, error.message);
      
      let errorMessage = 'Failed to connect to Shopify store';
      
      if (error.response?.status === 401) {
        errorMessage = 'Invalid Shopify access token';
      } else if (error.response?.status === 404) {
        errorMessage = 'Shopify store not found';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Invalid Shopify domain';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async testConnection() {
    const result = await this.validateConnection();
    
    // Update connection status
    await this.update({
      connection_status: result.success ? 'connected' : 'failed',
      validation_error: result.success ? null : result.error,
      last_validated_at: new Date().toISOString(),
      ...(result.success && {
        shopify_shop_name: result.data.shopName,
        shopify_email: result.data.email,
        shopify_currency: result.data.currency,
        shopify_timezone: result.data.timezone,
        product_count: result.data.productCount
      })
    });

    return result;
  }

  toJSON() {
    return {
      id: this.id,
      uuid: this.uuid,
      nickname: this.nickname,
      shopify_domain: this.shopify_domain,
      shopify_shop_name: this.shopify_shop_name,
      shopify_email: this.shopify_email,
      shopify_currency: this.shopify_currency,
      shopify_timezone: this.shopify_timezone,
      is_active: this.is_active,
      connection_status: this.connection_status,
      last_validated_at: this.last_validated_at,
      validation_error: this.validation_error,
      product_count: this.product_count,
      last_sync_at: this.last_sync_at,
      created_at: this.created_at,
      updated_at: this.updated_at,
      // Computed properties
      is_connected: this.connection_status === 'connected',
      needs_validation: !this.last_validated_at || 
        (new Date() - new Date(this.last_validated_at)) > 24 * 60 * 60 * 1000, // 24 hours
      display_name: `${this.nickname} (${this.shopify_domain})`
    };
  }

  // Safe JSON that excludes sensitive data
  toSafeJSON() {
    const json = this.toJSON();
    delete json.shopify_access_token;
    return json;
  }
}

module.exports = CompanyShopifyStore;