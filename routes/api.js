const express = require('express');
const axios = require('axios');
const validator = require('validator');
const Store = require('../models/Store');
const CompanyShopifyStore = require('../models/CompanyShopifyStore');
const { validateStoreCreation, sanitizeInput, createRateLimiter } = require('../middleware/validation');
const { PageTemplate } = require('../models/PageTemplate');
const router = express.Router();

// Helper function to get Shopify product count
async function getShopifyProductCount(domain, accessToken) {
  try {
    const response = await axios.get(`https://${domain}/admin/api/2023-10/products/count.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    return response.data.count || 0;
  } catch (error) {
    console.warn('Failed to get product count:', error.message);
    return 0; // Return 0 if we can't get the count
  }
}

// Apply input sanitization and rate limiting
router.use(sanitizeInput);
router.use(createRateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Base API route - API information and status
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Multi-Store E-commerce Platform API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      stores: '/api/stores',
      countries: '/api/countries',
      templates: '/api/page-templates',
        templateContent: '/api/page-templates/:templateKey',
      validation: {
        domain: '/api/check-domain',
        shopify: '/api/validate-shopify'
      },
      shopify: {
        products: '/api/shopify-products',
        stores: '/api/company-shopify-stores'
      },
      content: {
        pages: '/api/stores/:storeId/pages',
        pageContent: '/api/stores/:storeId/pages/:pageType',
        updateContent: '/api/stores/:storeId/pages/:pageType/content'
      }
    },
    documentation: 'Available endpoints listed above'
  });
});


// Simplified middleware to validate JSON content type for POST requests
router.use((req, res, next) => {
  // Skip content-type validation for specific endpoints that don't require a body
  const skipValidation = req.path.includes('/deploy') || 
                        req.path.includes('/bulk') || 
                        req.path.includes('/test-connection') ||
                        req.path.includes('/toggle-status') ||
                        req.method === 'GET' || 
                        req.method === 'DELETE';
  
  // Only validate content-type for POST/PUT requests that require a body
  if (!skipValidation && (req.method === 'POST' || req.method === 'PUT') && Object.keys(req.body || {}).length > 0) {
    if (!req.is('application/json') && !req.is('application/x-www-form-urlencoded')) {
      return res.status(400).json({ error: 'Content-Type must be application/json or application/x-www-form-urlencoded' });
    }
  }
  next();
});

// === CONTENT MANAGEMENT ENDPOINTS (PHASE 1) ===

// Get all pages for a store
router.get('/stores/:storeId/pages', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    // Find store by UUID
    const store = await Store.findByUuid(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    // Get all pages for the store
    const pages = await store.getPages();
    
    res.json({
      success: true,
      store: {
        uuid: store.uuid,
        name: store.name,
        domain: store.domain
      },
      pages: pages.map(page => ({
        id: page.id,
        page_type: page.page_type,
        slug: page.slug,
        title: page.title,
        subtitle: page.subtitle,
        is_enabled: page.is_enabled,
        has_custom_content: page.content !== null && page.content.trim() !== '',
        updated_at: page.updated_at
      }))
    });
  } catch (error) {
    console.error('Get store pages error:', error);
    res.status(500).json({ error: 'Failed to get store pages' });
  }
});

// Get specific page content for editing
router.get('/stores/:storeId/pages/:pageType', async (req, res) => {
  try {
    const { storeId, pageType } = req.params;
    
    // Find store by UUID
    const store = await Store.findByUuid(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    // Get page from database
    const db = require('../database/db');
    const page = await db.get(
      'SELECT * FROM store_pages WHERE store_id = ? AND page_type = ?',
      [store.id, pageType]
    );
    
    if (page) {
      // Return existing custom content
      res.json({
        success: true,
        page: {
          id: page.id,
          page_type: page.page_type,
          slug: page.slug,
          title: page.title,
          subtitle: page.subtitle,
          content: page.content,
          meta_title: page.meta_title,
          meta_description: page.meta_description,
          has_custom_content: true,
          is_enabled: page.is_enabled,
          updated_at: page.updated_at
        },
        store: {
          uuid: store.uuid,
          name: store.name,
          domain: store.domain
        }
      });
    } else {
      // Return template content as fallback
      try {
        const template = await PageTemplate.getTranslatedContent(pageType, store.language);
        
        // Replace template variables with store data
        const processedContent = store.replaceTemplateVariables(template.content);
        
        res.json({
          success: true,
          page: {
            page_type: pageType,
            slug: template.slug,
            title: template.title,
            subtitle: '',
            content: processedContent,
            meta_title: store.replaceTemplateVariables(template.meta_title || template.title),
            meta_description: store.replaceTemplateVariables(template.meta_description || ''),
            has_custom_content: false,
            is_enabled: true,
            is_template: true
          },
          store: {
            uuid: store.uuid,
            name: store.name,
            domain: store.domain
          }
        });
      } catch (templateError) {
        // Fallback to basic content if template not found
        res.json({
          success: true,
          page: {
            page_type: pageType,
            slug: pageType,
            title: `${store.name} - ${pageType.charAt(0).toUpperCase() + pageType.slice(1)}`,
            subtitle: `Welcome to our ${pageType} page`,
            content: `<p>Welcome to the ${pageType} page of ${store.name}. This content can be customized.</p>`,
            meta_title: `${store.name} - ${pageType.charAt(0).toUpperCase() + pageType.slice(1)}`,
            meta_description: `Visit our ${pageType} page at ${store.name}`,
            has_custom_content: false,
            is_enabled: true,
            is_template: true
          },
          store: {
            uuid: store.uuid,
            name: store.name,
            domain: store.domain
          }
        });
      }
    }
  } catch (error) {
    console.error('Get page content error:', error);
    res.status(500).json({ error: 'Failed to get page content' });
  }
});

// Update page content (Phase 1 main endpoint)
router.put('/stores/:storeId/pages/:pageType/content', async (req, res) => {
  try {
    const { storeId, pageType } = req.params;
    const { title, subtitle, content, meta_title, meta_description, is_enabled } = req.body;
    
    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Find store by UUID
    const store = await Store.findByUuid(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    const db = require('../database/db');
    
    // Check if page already exists
    const existingPage = await db.get(
      'SELECT * FROM store_pages WHERE store_id = ? AND page_type = ?',
      [store.id, pageType]
    );
    
    if (existingPage) {
      // Update existing page
      await db.run(
        `UPDATE store_pages SET 
         title = ?, subtitle = ?, content = ?, 
         meta_title = ?, meta_description = ?, is_enabled = ?, 
         updated_at = CURRENT_TIMESTAMP 
         WHERE store_id = ? AND page_type = ?`,
        [
          title,
          subtitle || '',
          content,
          meta_title || title,
          meta_description || '',
          is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1,
          store.id,
          pageType
        ]
      );
      
      console.log(`✅ Updated page content for ${store.name}: ${pageType}`);
    } else {
      // Create new page
      await db.run(
        `INSERT INTO store_pages (
          store_id, page_type, slug, title, subtitle, content,
          meta_title, meta_description, is_enabled, template_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          store.id,
          pageType,
          pageType === 'home' ? '' : pageType,
          title,
          subtitle || '',
          content,
          meta_title || title,
          meta_description || '',
          is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1,
          JSON.stringify({ layout: 'custom', edited: true })
        ]
      );
      
      console.log(`✅ Created new page content for ${store.name}: ${pageType}`);
    }
    
    // Get updated page
    const updatedPage = await db.get(
      'SELECT * FROM store_pages WHERE store_id = ? AND page_type = ?',
      [store.id, pageType]
    );
    
    // Trigger store file regeneration in background (for live updates)
    setImmediate(async () => {
      try {
        await store.regenerateStoreFiles();
        console.log(`🔄 Store files regenerated for ${store.name} after content update`);
      } catch (regenError) {
        console.warn(`⚠️ Failed to regenerate store files for ${store.name}:`, regenError.message);
      }
    });
    
    res.json({
      success: true,
      message: 'Page content updated successfully',
      page: {
        id: updatedPage.id,
        page_type: updatedPage.page_type,
        slug: updatedPage.slug,
        title: updatedPage.title,
        subtitle: updatedPage.subtitle,
        content: updatedPage.content,
        meta_title: updatedPage.meta_title,
        meta_description: updatedPage.meta_description,
        has_custom_content: true,
        is_enabled: updatedPage.is_enabled,
        updated_at: updatedPage.updated_at
      },
      store: {
        uuid: store.uuid,
        name: store.name,
        domain: store.domain,
        live_url: `https://${store.domain}`
      }
    });
    
  } catch (error) {
    console.error('Update page content error:', error);
    res.status(500).json({ error: 'Failed to update page content' });
  }
});

// Reset page to template content
router.post('/stores/:storeId/pages/:pageType/reset', async (req, res) => {
  try {
    const { storeId, pageType } = req.params;
    
    // Find store by UUID
    const store = await Store.findByUuid(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    const db = require('../database/db');
    
    // Delete custom content to revert to template
    await db.run(
      'DELETE FROM store_pages WHERE store_id = ? AND page_type = ?',
      [store.id, pageType]
    );
    
    console.log(`🔄 Reset page ${pageType} to template for store ${store.name}`);
    
    // Trigger store file regeneration
    setImmediate(async () => {
      try {
        await store.regenerateStoreFiles();
        console.log(`🔄 Store files regenerated for ${store.name} after page reset`);
      } catch (regenError) {
        console.warn(`⚠️ Failed to regenerate store files for ${store.name}:`, regenError.message);
      }
    });
    
    res.json({
      success: true,
      message: 'Page reset to template successfully',
      page_type: pageType,
      store: {
        uuid: store.uuid,
        name: store.name,
        domain: store.domain
      }
    });
    
  } catch (error) {
    console.error('Reset page content error:', error);
    res.status(500).json({ error: 'Failed to reset page content' });
  }
});

// Auto-detect language and currency from domain
router.post('/detect-domain-info', async (req, res) => {
  try {
    const { domain } = req.body;
    
    // Normalize domain by removing protocol if present
    let normalizedDomain = domain;
    if (domain && (domain.startsWith('http://') || domain.startsWith('https://'))) {
      normalizedDomain = domain.replace(/^https?:\/\//i, '');
    }
    
    // Remove www. prefix if present
    if (normalizedDomain) {
      normalizedDomain = normalizedDomain.replace(/^www\./i, '');
    }
    
    if (!normalizedDomain || !validator.isFQDN(normalizedDomain)) {
      return res.status(400).json({ error: 'Valid domain required' });
    }

    // Extract TLD for country detection
    const tld = normalizedDomain.split('.').pop().toLowerCase();
    
    // Simple TLD to country/currency mapping
    const domainMapping = {
      'com': { country: 'US', currency: 'USD', language: 'en' },
      'uk': { country: 'GB', currency: 'GBP', language: 'en' },
      'ca': { country: 'CA', currency: 'CAD', language: 'en' },
      'au': { country: 'AU', currency: 'AUD', language: 'en' },
      'de': { country: 'DE', currency: 'EUR', language: 'de' },
      'fr': { country: 'FR', currency: 'EUR', language: 'fr' },
      'es': { country: 'ES', currency: 'EUR', language: 'es' },
      'it': { country: 'IT', currency: 'EUR', language: 'it' },
      'jp': { country: 'JP', currency: 'JPY', language: 'ja' },
      'br': { country: 'BR', currency: 'BRL', language: 'pt' },
      'fi': { country: 'FI', currency: 'EUR', language: 'fi' }
    };

    const detectedInfo = domainMapping[tld] || { 
      country: 'US', 
      currency: 'USD', 
      language: 'en' 
    };

    res.json({
      success: true,
      domain: normalizedDomain,
      detected: detectedInfo,
      confidence: tld in domainMapping ? 'high' : 'low'
    });

  } catch (error) {
    console.error('Domain detection error:', error);
    res.status(500).json({ error: 'Failed to detect domain information' });
  }
});


// === STORE MANAGEMENT ENDPOINTS ===


// Bulk redeploy all stores - MUST be before /stores/:uuid
router.post('/stores/bulk/redeploy', async (req, res) => {
  try {
    const stores = await Store.findAll();
    let count = 0;
    
    // Start redeployment for each store (in background)
    for (const store of stores) {
      // Set status to deploying and increment counter
      await store.update({ deployment_status: 'deploying' });
      count++;
      
      // Start deployment in background using simplified deploy method
      setImmediate(async () => {
        try {
          await store.deploy();
        } catch (error) {
          console.error(`Bulk redeploy failed for ${store.name}:`, error.message);
        }
      });
    }
    
    res.json({
      success: true,
      count,
      message: `Started redeployment for ${count} stores`
    });
  } catch (error) {
    console.error('Bulk redeploy error:', error);
    res.status(500).json({ 
      error: 'Failed to start bulk redeployment',
      details: error.message 
    });
  }
});

// Get store status summary - MUST be before /stores/:uuid
router.get('/stores/status-summary', async (req, res) => {
  try {
    const stores = await Store.findAll();
    
    const summary = {
      total: stores.length,
      byStatus: {
        deployed: stores.filter(s => s.deployment_status === 'deployed').length,
        deploying: stores.filter(s => s.deployment_status === 'deploying').length,
        failed: stores.filter(s => s.deployment_status === 'failed').length,
        pending: stores.filter(s => s.deployment_status === 'pending').length
      },
      byHealth: {
        healthy: stores.filter(s => s.deployment_status === 'deployed' && s.storeFilesExist()).length,
        needsAttention: stores.filter(s => s.deployment_status === 'failed' || !s.storeFilesExist()).length
      },
      shopifyConnected: stores.filter(s => s.shopify_connected).length
    };
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Get status summary error:', error);
    res.status(500).json({ error: 'Failed to get status summary' });
  }
});

// Export store data - MUST be before /stores/:uuid
router.get('/stores/export', async (req, res) => {
  try {
    const stores = await Store.findAll();
    const exportData = {
      exportDate: new Date().toISOString(),
      totalStores: stores.length,
      stores: stores.map(store => {
        const storeData = store.toJSON();
        // Remove sensitive data
        delete storeData.shopify_access_token;
        return storeData;
      })
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="stores-export-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export stores error:', error);
    res.status(500).json({ 
      error: 'Failed to export store data',
      details: error.message 
    });
  }
});

// Get all stores
router.get('/stores', async (req, res) => {
  try {
    const stores = await Store.findAll();
    const storesWithDetails = stores.map(store => {
      const storeJson = store.toJSON();
      return {
        ...storeJson,
        files_exist: store.storeFilesExist(),
        store_path: store.getStorePath(),
        live_url: `https://${store.domain}`,
        can_deploy: store.deployment_status !== 'deploying',
        needs_deployment: !store.storeFilesExist() || store.deployment_status === 'failed'
      };
    });
    
    res.json({
      success: true,
      stores: storesWithDetails,
      summary: {
        total: stores.length,
        deployed: storesWithDetails.filter(s => s.deployment_status === 'deployed').length,
        pending: storesWithDetails.filter(s => s.deployment_status === 'pending').length,
        failed: storesWithDetails.filter(s => s.deployment_status === 'failed').length,
        deploying: storesWithDetails.filter(s => s.deployment_status === 'deploying').length
      }
    });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// Get store by UUID
router.get('/stores/:uuid', async (req, res) => {
  try {
    const store = await Store.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    const pages = await store.getPages();
    
    res.json({
      success: true,
      store: store.toJSON(),
      pages: pages
    });
  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({ error: 'Failed to fetch store' });
  }
});

// Create new store
router.post('/stores', validateStoreCreation, async (req, res) => {
  try {
    const storeData = {
      name: req.body.name,
      domain: req.body.domain,
      country: req.body.country,
      language: req.body.language,
      currency: req.body.currency,
      shopify_domain: req.body.shopify_domain,
      shopify_access_token: req.body.shopify_access_token,
      shopify_connected: !!(req.body.shopify_domain && req.body.shopify_access_token),
      meta_title: req.body.meta_title,
      meta_description: req.body.meta_description,
      primary_color: req.body.primary_color,
      secondary_color: req.body.secondary_color
    };
    
    const store = await Store.create(storeData);
    
    res.status(201).json({
      success: true,
      store: store.toJSON(),
      message: 'Store created successfully'
    });
  } catch (error) {
    console.error('Create store error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to create store'
    });
  }
});

// Update store
router.put('/stores/:uuid', async (req, res) => {
  try {
    const store = await Store.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    await store.update(req.body);
    
    // Auto-regenerate and deploy store files after update
    try {
      await store.regenerateStoreFiles();
      console.log(`🔄 Store files auto-regenerated for ${store.name} after update`);
      
      // Trigger deployment using simplified method
      await store.deploy();
      console.log(`🚀 Store deployment triggered for ${store.name} after update`);
    } catch (regenError) {
      console.warn(`⚠️ Failed to auto-regenerate/deploy store files for ${store.name}:`, regenError.message);
      // Continue without failing the update - user can manually regenerate
    }
    
    res.json({
      success: true,
      store: store.toJSON(),
      message: 'Store updated successfully',
      redirectUrl: `/admin/stores/${store.uuid}?updated=true`
    });
  } catch (error) {
    console.error('Update store error:', error);
    res.status(400).json({ error: 'Failed to update store' });
  }
});

// Delete store
router.delete('/stores/:uuid', async (req, res) => {
  try {
    const store = await Store.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    await store.delete();
    
    res.json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({ error: 'Failed to delete store' });
  }
});


// Get store deployment status
router.get('/stores/:uuid/deployment', async (req, res) => {
  try {
    const store = await Store.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    res.json({
      success: true,
      deployment: {
        status: store.deployment_status,
        url: store.deployment_url,
        deployed_at: store.deployed_at,
        files_exist: store.storeFilesExist(),
        live_url: `https://${store.domain}`
      }
    });
  } catch (error) {
    console.error('Get deployment status error:', error);
    res.status(500).json({ error: 'Failed to get deployment status' });
  }
});


// Fast deployment endpoint for quick API responses
router.post('/stores/:uuid/deploy-fast', async (req, res) => {
  let store;
  try {
    store = await Store.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    const { force = false } = req.body;
    console.log(`⚡ Fast deploying ${store.name}${force ? ' (FORCED)' : ''}`);
    
    // Use the fast deploy method
    const result = await store.deployFast(force);
    
    res.json({
      success: true,
      store: store.toJSON(),
      message: result.message,
      deployment: {
        status: store.deployment_status,
        url: result.url,
        deployed_at: store.deployed_at,
        live: result.isLive || false,
        alreadyDeployed: result.alreadyDeployed || false,
        fast_mode: true
      }
    });
  } catch (error) {
    console.error('Fast deploy store error:', error);
    
    // Update status to failed if store exists
    if (store) {
      try {
        await store.update({ deployment_status: 'failed' });
      } catch (updateError) {
        console.error('Failed to update deployment status:', updateError);
      }
    }
    
    res.status(500).json({ 
      error: 'Fast deployment failed',
      details: error.message 
    });
  }
});

// Single reliable deployment endpoint - handles all deployment scenarios
router.post('/stores/:uuid/deploy', async (req, res) => {
  let store;
  try {
    store = await Store.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    const { force = false } = req.body;
    console.log(`🚀 Deploying ${store.name} - Single reliable deployment path${force ? ' (FORCED)' : ''}`);
    
    // Use the simplified deploy method
    const result = await store.deploy(null, force);
    
    res.json({
      success: true,
      store: store.toJSON(),
      message: result.message,
      deployment: {
        status: store.deployment_status,
        url: result.url,
        deployed_at: store.deployed_at,
        live: result.isLive || false,
        alreadyDeployed: result.alreadyDeployed || false
      }
    });
  } catch (error) {
    console.error('Deploy store error:', error);
    
    // Update status to failed if store exists
    if (store) {
      try {
        await store.update({ deployment_status: 'failed' });
      } catch (updateError) {
        console.error('Failed to update deployment status:', updateError);
      }
    }
    
    res.status(500).json({ 
      error: 'Deployment failed',
      details: error.message 
    });
  }
});

// === DOMAIN AND VALIDATION ENDPOINTS ===

// Check domain availability
router.post('/check-domain', createRateLimiter(60 * 1000, 10), async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain || !validator.isURL(domain, { require_protocol: false })) {
      return res.status(400).json({ error: 'Valid domain required' });
    }
    
    // Check if domain is already taken
    const existingStore = await Store.findByDomain(domain);
    
    res.json({
      success: true,
      domain: domain,
      available: !existingStore,
      message: existingStore ? 'Domain is already in use' : 'Domain is available'
    });
  } catch (error) {
    console.error('Domain check error:', error);
    res.status(500).json({ error: 'Failed to check domain availability' });
  }
});

// Validate Shopify connection
router.post('/validate-shopify', createRateLimiter(60 * 1000, 5), async (req, res) => {
  try {
    const { shopifyDomain, accessToken } = req.body;
    
    if (!shopifyDomain || !accessToken) {
      return res.status(400).json({ error: 'Shopify domain and access token required' });
    }

    // Validate domain format
    const domain = shopifyDomain.includes('.myshopify.com') 
      ? shopifyDomain 
      : `${shopifyDomain}.myshopify.com`;

    try {
      // Detect token type and test appropriate API
      let shopData, productCount = 0;
      
      console.log('🔍 Token analysis:', {
        token: accessToken.substring(0, 10) + '...',
        length: accessToken.length,
        startsWithShpat: accessToken.startsWith('shpat_'),
        startsWithShpca: accessToken.startsWith('shpca_')
      });
      
      if (accessToken.startsWith('shpat_') || accessToken.startsWith('shpca_')) {
        // Admin API token - test with Admin API
        const response = await axios.get(`https://${domain}/admin/api/2023-10/shop.json`, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        shopData = response.data.shop;
        productCount = await getShopifyProductCount(domain, accessToken);
        
      } else {
        // Storefront API token - test with GraphQL
        console.log('🛒 Testing Storefront API for token:', accessToken.substring(0, 8) + '...');
        
        const response = await axios.post(`https://${domain}/api/2023-10/graphql.json`, {
          query: `{
            shop {
              name
              primaryDomain { url }
              paymentSettings {
                currencyCode
              }
            }
            products(first: 5) {
              edges {
                node {
                  title
                  handle
                  id
                }
              }
            }
          }`
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': accessToken
          },
          timeout: 10000
        });
        
        if (response.data.errors) {
          throw new Error('Storefront API error: ' + JSON.stringify(response.data.errors));
        }
        
        console.log('✅ Storefront API response received:', response.data);
        
        const shop = response.data.data.shop;
        const products = response.data.data.products.edges;
        
        shopData = {
          name: shop.name,
          domain: shop.primaryDomain.url.replace('https://', '').replace('http://', ''),
          myshopify_domain: domain,
          email: 'N/A (Storefront API)',
          currency: shop.paymentSettings?.currencyCode || 'N/A',
          iana_timezone: 'N/A (Storefront API)'
        };
        
        // Count available products through Storefront API
        productCount = products.length;
        console.log(`📦 Found ${productCount} products via Storefront API`);
      }
      
      res.json({
        success: true,
        shopName: shopData.name,
        shopDomain: shopData.domain,
        myshopifyDomain: shopData.myshopify_domain,
        email: shopData.email,
        currency: shopData.currency,
        timezone: shopData.iana_timezone,
        productCount: productCount,
        status: 'connected',
        apiType: accessToken.startsWith('shpat_') || accessToken.startsWith('shpca_') ? 'Admin API' : 'Storefront API'
      });
    } catch (shopifyError) {
      console.error('Shopify API error:', shopifyError.response?.data || shopifyError.message);
      
      let errorMessage = 'Failed to connect to Shopify store';
      let statusCode = 500;
      let errorDetails = null;
      
      if (shopifyError.response?.status === 401) {
        statusCode = 401;
        const tokenType = accessToken.startsWith('shpat_') || accessToken.startsWith('shpca_') ? 'Admin API' : 'Storefront API';
        errorMessage = `Invalid Shopify access token. This appears to be a ${tokenType} token. Please verify the token has the correct permissions.`;
        errorDetails = 'Token authentication failed';
      } else if (shopifyError.response?.status === 404) {
        statusCode = 404;
        errorMessage = 'Shopify store not found. Please verify the domain is correct and the store exists.';
        errorDetails = 'Store not found';
      } else if (shopifyError.response?.status === 403) {
        statusCode = 403;
        errorMessage = 'Access denied. The token may not have sufficient permissions for this operation.';
        errorDetails = 'Insufficient permissions';
      } else if (shopifyError.code === 'ENOTFOUND') {
        statusCode = 404;
        errorMessage = 'Invalid Shopify domain. Please check the domain format (e.g., yourstore.myshopify.com).';
        errorDetails = 'Domain not found';
      } else if (shopifyError.code === 'ETIMEDOUT') {
        statusCode = 408;
        errorMessage = 'Connection timeout. Please try again or check if the Shopify store is accessible.';
        errorDetails = 'Connection timeout';
      } else if (shopifyError.message.includes('Storefront API error')) {
        statusCode = 400;
        errorMessage = 'Storefront API error. The GraphQL query failed or the token may be invalid.';
        errorDetails = shopifyError.message;
      } else {
        errorMessage = 'Failed to connect to Shopify store. Please verify your domain and access token.';
        errorDetails = shopifyError.message;
      }
      
      res.status(statusCode).json({ 
        success: false,
        error: errorMessage,
        details: errorDetails,
        tokenType: accessToken.startsWith('shpat_') || accessToken.startsWith('shpca_') ? 'Admin API' : 'Storefront API',
        troubleshooting: {
          adminApi: 'Admin API tokens start with "shpat_" and require Admin API permissions',
          storefrontApi: 'Storefront API tokens are used for public access and use GraphQL',
          domain: 'Domain should be in format: yourstore.myshopify.com'
        }
      });
    }

  } catch (error) {
    console.error('Shopify validation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to validate Shopify connection',
      details: error.message,
      troubleshooting: {
        checkInputs: 'Verify shopifyDomain and accessToken are provided',
        domainFormat: 'Domain should be: yourstore.myshopify.com',
        tokenFormat: 'Admin tokens start with shpat_, Storefront tokens are alphanumeric'
      }
    });
  }
});

// Get available page templates with database integration
router.get('/page-templates', async (req, res) => {
  try {
    const { language = 'en' } = req.query;
    
    // Static core templates that don't come from database
    const staticTemplates = [
      { id: 'home', name: 'Homepage', required: true, description: 'Main landing page', icon: 'home', category: 'core' },
      { id: 'products', name: 'Products', required: true, description: 'Product catalog', icon: 'shopping-bag', category: 'core' },
      { id: 'about', name: 'About Us', required: false, description: 'Company information', icon: 'info', category: 'business' },
      { id: 'contact', name: 'Contact', required: false, description: 'Contact form and details', icon: 'mail', category: 'business' },
      { id: 'blog', name: 'Blog', required: false, description: 'News and updates', icon: 'edit', category: 'content' },
      { id: 'faq', name: 'FAQ', required: false, description: 'Frequently asked questions', icon: 'help-circle', category: 'support' }
    ];
    
    // Get dynamic templates from database (legal pages)
    const dbTemplates = await PageTemplate.getAllForLanguage(language);
    
    // Map database templates to expected format
    const dynamicTemplates = dbTemplates.map(template => ({
      id: template.template_key,
      name: template.title || template.template_key.charAt(0).toUpperCase() + template.template_key.slice(1),
      required: false,
      description: getTemplateDescription(template.template_key),
      icon: getTemplateIcon(template.template_key),
      category: template.template_type || 'legal',
      has_content: template.has_translation === 1,
      slug: template.slug
    }));
    
    // Combine static and dynamic templates
    const allTemplates = [...staticTemplates, ...dynamicTemplates];
    
    // Group templates by category for better organization
    const categorizedTemplates = {
      core: allTemplates.filter(t => t.category === 'core'),
      business: allTemplates.filter(t => t.category === 'business'),
      content: allTemplates.filter(t => t.category === 'content'),
      support: allTemplates.filter(t => t.category === 'support'),
      legal: allTemplates.filter(t => t.category === 'legal')
    };

    res.json({ 
      success: true,
      templates: allTemplates,
      categorized: categorizedTemplates,
      summary: {
        total: allTemplates.length,
        required: allTemplates.filter(t => t.required).length,
        optional: allTemplates.filter(t => !t.required).length,
        categories: Object.keys(categorizedTemplates).length,
        language: language,
        database_templates: dynamicTemplates.length
      }
    });
  } catch (error) {
    console.error('Get page templates error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch page templates',
      message: error.message 
    });
  }
});

// Helper function to get template description
function getTemplateDescription(templateKey) {
  const descriptions = {
    terms: 'Legal terms and conditions',
    privacy: 'Privacy information and data protection',
    refund: 'Return and refund policy',
    delivery: 'Shipping and delivery information'
  };
  return descriptions[templateKey] || `${templateKey.charAt(0).toUpperCase() + templateKey.slice(1)} page`;
}

// Helper function to get template icon
function getTemplateIcon(templateKey) {
  const icons = {
    terms: 'file-text',
    privacy: 'shield',
    refund: 'refresh-ccw',
    delivery: 'truck'
  };
  return icons[templateKey] || 'file-text';
}

// Get specific page template content by key and language
router.get('/page-templates/:templateKey', async (req, res) => {
  try {
    const { templateKey } = req.params;
    const { language = 'en' } = req.query;
    
    const content = await PageTemplate.getTranslatedContent(templateKey, language);
    
    res.json({
      success: true,
      template: {
        key: content.template_key,
        type: content.template_type,
        language: content.language_code,
        title: content.title,
        slug: content.slug,
        content: content.content,
        meta_title: content.meta_title,
        meta_description: content.meta_description
      }
    });
  } catch (error) {
    console.error('Get page template content error:', error);
    
    if (error.message.includes('No translation found')) {
      res.status(404).json({
        success: false,
        error: 'Template not found',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch page template content',
        message: error.message
      });
    }
  }
});

// Get Shopify products for the connected store
router.post('/shopify-products', createRateLimiter(60 * 1000, 20), async (req, res) => {
  try {
    const { shopifyDomain, accessToken, page = 1, limit = 50 } = req.body;
    
    if (!shopifyDomain || !accessToken) {
      return res.status(400).json({ error: 'Shopify domain and access token required' });
    }

    // Validate domain format
    const domain = shopifyDomain.includes('.myshopify.com') 
      ? shopifyDomain 
      : `${shopifyDomain}.myshopify.com`;

    try {
      // Fetch products from Shopify API
      const response = await axios.get(`https://${domain}/admin/api/2023-10/products.json`, {
        params: {
          limit: Math.min(limit, 100), // Max 100 per page
          page: page,
          status: 'active',
          fields: 'id,title,handle,vendor,product_type,tags,status,images,variants,options'
        },
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const products = response.data.products.map(product => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        vendor: product.vendor,
        productType: product.product_type,
        tags: product.tags ? product.tags.split(',').map(tag => tag.trim()) : [],
        status: product.status,
        imageUrl: product.images && product.images.length > 0 
          ? product.images[0].src 
          : null,
        imageAlt: product.images && product.images.length > 0 
          ? product.images[0].alt || product.title 
          : product.title,
        price: product.variants && product.variants.length > 0 
          ? product.variants[0].price 
          : '0.00',
        compareAtPrice: product.variants && product.variants.length > 0 
          ? product.variants[0].compare_at_price 
          : null,
        currency: '$', // We'll get this from store settings later
        variantCount: product.variants ? product.variants.length : 0,
        hasMultipleVariants: product.variants ? product.variants.length > 1 : false,
        inStock: product.variants ? product.variants.some(v => v.inventory_quantity > 0) : false
      }));
      
      res.json({
        success: true,
        products: products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: products.length,
          hasMore: products.length === limit
        }
      });
    } catch (shopifyError) {
      console.error('Shopify products API error:', shopifyError.response?.data || shopifyError.message);
      
      if (shopifyError.response?.status === 401) {
        res.status(401).json({ error: 'Invalid Shopify access token' });
      } else if (shopifyError.response?.status === 404) {
        res.status(404).json({ error: 'Shopify store not found' });
      } else {
        res.status(500).json({ 
          error: 'Failed to fetch products from Shopify store',
          details: shopifyError.message 
        });
      }
    }

  } catch (error) {
    console.error('Shopify products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get supported countries and currencies
router.get('/countries', (req, res) => {
  const countries = [
    { code: 'US', name: 'United States', currency: 'USD', language: 'en' },
    { code: 'CA', name: 'Canada', currency: 'CAD', language: 'en' },
    { code: 'GB', name: 'United Kingdom', currency: 'GBP', language: 'en' },
    { code: 'AU', name: 'Australia', currency: 'AUD', language: 'en' },
    { code: 'DE', name: 'Germany', currency: 'EUR', language: 'de' },
    { code: 'FR', name: 'France', currency: 'EUR', language: 'fr' },
    { code: 'ES', name: 'Spain', currency: 'EUR', language: 'es' },
    { code: 'IT', name: 'Italy', currency: 'EUR', language: 'it' },
    { code: 'JP', name: 'Japan', currency: 'JPY', language: 'ja' },
    { code: 'BR', name: 'Brazil', currency: 'BRL', language: 'pt' },
    { code: 'FI', name: 'Finland', currency: 'EUR', language: 'fi' }
  ];

  res.json({
    success: true,
    countries: countries
  });
});

// Clean up duplicate subdomains (maintenance endpoint)
router.post('/cleanup-subdomains', async (req, res) => {
  try {
    console.log('💫 Admin: Cleaning up duplicate subdomains...');
    const result = await Store.cleanupDuplicateSubdomains();
    
    res.json({
      success: true,
      message: `Cleaned up ${result.fixed} subdomain conflicts from ${result.conflicts} duplicate groups`,
      fixed: result.fixed,
      conflicts: result.conflicts
    });
  } catch (error) {
    console.error('Subdomain cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup duplicate subdomains' });
  }
});

// Generate store subdomain suggestion
router.post('/suggest-subdomain', async (req, res) => {
  try {
    const { storeName } = req.body;
    
    if (!storeName) {
      return res.status(400).json({ error: 'Store name required' });
    }
    
    // Generate base subdomain
    let baseSubdomain = storeName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
    
    // Check availability and suggest alternatives
    const suggestions = [baseSubdomain];
    
    for (let i = 1; i <= 5; i++) {
      suggestions.push(`${baseSubdomain}-${i}`);
      suggestions.push(`${baseSubdomain}${i}`);
    }
    
    const availableSuggestions = [];
    
    for (const suggestion of suggestions) {
      // Check both domain and subdomain conflicts
      const domainConflict = await Store.findByDomain(suggestion);
      const subdomainConflict = await Store.findBySubdomain(suggestion);
      
      if (!domainConflict && !subdomainConflict) {
        availableSuggestions.push(suggestion);
      }
    }
    
    res.json({
      success: true,
      suggestions: availableSuggestions.slice(0, 5),
      primary: availableSuggestions[0] || await Store.generateUniqueSubdomain(storeName)
    });
  } catch (error) {
    console.error('Subdomain suggestion error:', error);
    res.status(500).json({ error: 'Failed to generate subdomain suggestions' });
  }
});

// Get store by domain (for debugging)
router.get('/stores/domain/:domain', async (req, res) => {
  try {
    const store = await Store.findByDomain(req.params.domain);
    if (!store) {
      return res.status(404).json({ error: 'Store not found for domain' });
    }
    
    const pages = await store.getPages();
    
    res.json({
      success: true,
      store: store.toJSON(),
      pages: pages
    });
  } catch (error) {
    console.error('Get store by domain error:', error);
    res.status(500).json({ error: 'Failed to fetch store by domain' });
  }
});


// === COMPANY SHOPIFY STORES MANAGEMENT ===

// Get all company Shopify stores
router.get('/company-shopify-stores', async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const stores = await CompanyShopifyStore.findAll(activeOnly === 'true');
    
    res.json({
      success: true,
      stores: stores.map(store => store.toSafeJSON()),
      summary: {
        total: stores.length,
        connected: stores.filter(s => s.connection_status === 'connected').length,
        failed: stores.filter(s => s.connection_status === 'failed').length,
        pending: stores.filter(s => s.connection_status === 'pending').length,
        active: stores.filter(s => s.is_active).length
      }
    });
  } catch (error) {
    console.error('Get company Shopify stores error:', error);
    res.status(500).json({ error: 'Failed to fetch company Shopify stores' });
  }
});

// Get company Shopify store by UUID
router.get('/company-shopify-stores/:uuid', async (req, res) => {
  try {
    const store = await CompanyShopifyStore.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).json({ error: 'Company Shopify store not found' });
    }
    
    res.json({
      success: true,
      store: store.toSafeJSON()
    });
  } catch (error) {
    console.error('Get company Shopify store error:', error);
    res.status(500).json({ error: 'Failed to fetch company Shopify store' });
  }
});

// Create new company Shopify store
router.post('/company-shopify-stores', async (req, res) => {
  try {
    const { nickname, shopifyDomain, accessToken } = req.body;
    
    if (!nickname || !shopifyDomain || !accessToken) {
      return res.status(400).json({ 
        error: 'Missing required fields: nickname, shopifyDomain, accessToken' 
      });
    }
    
    const storeData = {
      nickname: nickname.trim(),
      shopify_domain: shopifyDomain.trim(),
      shopify_access_token: accessToken.trim()
    };
    
    const store = await CompanyShopifyStore.create(storeData);
    
    res.status(201).json({
      success: true,
      store: store.toSafeJSON(),
      message: 'Company Shopify store created successfully'
    });
  } catch (error) {
    console.error('Create company Shopify store error:', error);
    
    // Handle specific error types with better user feedback
    let statusCode = 400;
    let errorMessage = error.message || 'Failed to create company Shopify store';
    
    if (error.message && error.message.includes('domain conflict')) {
      statusCode = 409;
      errorMessage = 'A store with this Shopify domain already exists';
    } else if (error.message && error.message.includes('Invalid Shopify access token')) {
      statusCode = 401;
      errorMessage = 'Invalid Shopify access token. Please check your credentials.';
    } else if (error.message && error.message.includes('Shopify store not found')) {
      statusCode = 404;
      errorMessage = 'Shopify store not found. Please check the domain.';
    } else if (error.message && error.message.includes('Failed to connect')) {
      statusCode = 503;
      errorMessage = 'Unable to connect to Shopify. Please check your domain and access token.';
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage
    });
  }
});

// Update company Shopify store
router.put('/company-shopify-stores/:uuid', async (req, res) => {
  try {
    const store = await CompanyShopifyStore.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).json({ 
        success: false,
        error: 'Company Shopify store not found' 
      });
    }
    
    await store.update(req.body);
    
    res.json({
      success: true,
      store: store.toSafeJSON(),
      message: 'Company Shopify store updated successfully'
    });
  } catch (error) {
    console.error('Update company Shopify store error:', error);
    
    let statusCode = 400;
    let errorMessage = error.message || 'Failed to update company Shopify store';
    
    if (error.message && error.message.includes('Invalid Shopify access token')) {
      statusCode = 401;
      errorMessage = 'Invalid Shopify access token. Please check your credentials.';
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage 
    });
  }
});

// Delete company Shopify store
router.delete('/company-shopify-stores/:uuid', async (req, res) => {
  try {
    const store = await CompanyShopifyStore.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).json({ 
        success: false,
        error: 'Company Shopify store not found' 
      });
    }
    
    await store.delete();
    
    res.json({
      success: true,
      message: 'Company Shopify store deleted successfully'
    });
  } catch (error) {
    console.error('Delete company Shopify store error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete company Shopify store' 
    });
  }
});

// Test company Shopify store connection
router.post('/company-shopify-stores/:uuid/test-connection', createRateLimiter(60 * 1000, 5), async (req, res) => {
  try {
    const store = await CompanyShopifyStore.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).json({ 
        success: false,
        error: 'Company Shopify store not found' 
      });
    }
    
    const result = await store.testConnection();
    
    res.json({
      success: result.success,
      store: store.toSafeJSON(),
      connection: result.success ? result.data : null,
      error: result.success ? null : result.error,
      message: result.success ? 'Connection test successful' : 'Connection test failed'
    });
  } catch (error) {
    console.error('Test company Shopify store connection error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test connection' 
    });
  }
});

// Toggle company Shopify store status
router.patch('/company-shopify-stores/:uuid/toggle-status', async (req, res) => {
  try {
    const store = await CompanyShopifyStore.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).json({ 
        success: false,
        error: 'Company Shopify store not found' 
      });
    }
    
    await store.update({ is_active: !store.is_active });
    
    res.json({
      success: true,
      store: store.toSafeJSON(),
      message: `Company Shopify store ${store.is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle company Shopify store status error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to toggle status' 
    });
  }
});

// Regenerate legal pages for a specific store



module.exports = router;