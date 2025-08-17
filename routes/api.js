const express = require('express');
const axios = require('axios');
const validator = require('validator');
const Store = require('../models/Store');
const CompanyShopifyStore = require('../models/CompanyShopifyStore');
const { validateStoreCreation, sanitizeInput, createRateLimiter } = require('../middleware/validation');
const { getAgentSystem } = require('../agent-automation-system'); // Enabled for full automation
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
      agents: '/api/agents/status',
      countries: '/api/countries',
      templates: '/api/page-templates',
      validation: {
        domain: '/api/check-domain',
        shopify: '/api/validate-shopify'
      },
      shopify: {
        products: '/api/shopify-products',
        stores: '/api/company-shopify-stores'
      }
    },
    documentation: 'Available endpoints listed above'
  });
});

// Auto-deploy agents for API activities - ENABLED for full automation
router.use((req, res, next) => {
  // Auto-deploy agents for technical API work
  if (req.method === 'POST' || req.method === 'PUT') {
    const agentSystem = getAgentSystem();
    const taskDescription = `API ${req.method} request to ${req.path}`;
    
    // Detect specific API work types
    if (req.path.includes('stores')) {
      agentSystem.autoDeployAgents(`Store management: ${taskDescription}`, {
        type: 'store-management',
        api: true,
        endpoint: req.path
      }).catch(err => console.warn('Auto-agent deployment failed:', err));
    } else if (req.path.includes('shopify')) {
      agentSystem.autoDeployAgents(`Shopify integration: ${taskDescription}`, {
        type: 'shopify-integration',
        api: true,
        endpoint: req.path
      }).catch(err => console.warn('Auto-agent deployment failed:', err));
    } else if (req.path.includes('deploy')) {
      agentSystem.autoDeployAgents(`Deployment operation: ${taskDescription}`, {
        type: 'deployment',
        api: true,
        endpoint: req.path
      }).catch(err => console.warn('Auto-agent deployment failed:', err));
    }
  }
  next();
});

// Middleware to validate JSON content type for POST requests (skip for specific endpoints)
router.use((req, res, next) => {
  // Skip content-type validation for deploy/regenerate endpoints that don't need body
  const skipValidation = req.path.includes('/deploy') || req.path.includes('/regenerate') || req.method === 'GET' || req.method === 'DELETE';
  
  if (!skipValidation && req.method === 'POST' && !req.is('application/json') && !req.is('application/x-www-form-urlencoded')) {
    return res.status(400).json({ error: 'Content-Type must be application/json or application/x-www-form-urlencoded' });
  }
  next();
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
    
    res.json({
      success: true,
      store: store.toJSON(),
      message: 'Store updated successfully'
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

// Regenerate store files
router.post('/stores/:uuid/regenerate', async (req, res) => {
  try {
    const store = await Store.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    await store.regenerateStoreFiles();
    
    res.json({
      success: true,
      store: store.toJSON(),
      message: 'Store files regenerated successfully'
    });
  } catch (error) {
    console.error('Regenerate store error:', error);
    res.status(500).json({ 
      error: 'Failed to regenerate store files',
      details: error.message 
    });
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

// Deploy store (generate files if not exist)
router.post('/stores/:uuid/deploy', async (req, res) => {
  try {
    const store = await Store.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    // Check if files already exist
    if (store.storeFilesExist() && store.deployment_status === 'deployed') {
      return res.json({
        success: true,
        store: store.toJSON(),
        message: 'Store is already deployed'
      });
    }
    
    // Update status to deploying
    await store.update({ deployment_status: 'deploying' });
    
    // Generate store files
    await store.generateStoreFiles();
    
    // Update status to deployed
    await store.update({ 
      deployment_status: 'deployed',
      deployed_at: new Date().toISOString(),
      deployment_url: `https://${store.domain}`
    });
    
    res.json({
      success: true,
      store: store.toJSON(),
      message: 'Store deployed successfully'
    });
  } catch (error) {
    console.error('Deploy store error:', error);
    
    // Update status to failed
    try {
      const store = await Store.findByUuid(req.params.uuid);
      if (store) {
        await store.update({ deployment_status: 'failed' });
      }
    } catch (updateError) {
      console.error('Failed to update deployment status:', updateError);
    }
    
    res.status(500).json({ 
      error: 'Failed to deploy store',
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
        
        const response = await axios.post(`https://${domain}/api/2025-07/graphql.json`, {
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
      
      if (shopifyError.response?.status === 401) {
        res.status(401).json({ error: 'Invalid Shopify access token' });
      } else if (shopifyError.response?.status === 404) {
        res.status(404).json({ error: 'Shopify store not found' });
      } else {
        // Only return error for real connection issues
        res.status(500).json({ 
          error: 'Failed to connect to Shopify store. Please check your domain and access token.',
          details: shopifyError.message 
        });
      }
    }

  } catch (error) {
    console.error('Shopify validation error:', error);
    res.status(500).json({ error: 'Failed to validate Shopify connection' });
  }
});

// Get available page templates
router.get('/page-templates', (req, res) => {
  const templates = [
    { id: 'home', name: 'Homepage', required: true, description: 'Main landing page', icon: 'home' },
    { id: 'products', name: 'Products', required: true, description: 'Product catalog', icon: 'shopping-bag' },
    { id: 'about', name: 'About Us', required: false, description: 'Company information', icon: 'info' },
    { id: 'contact', name: 'Contact', required: false, description: 'Contact form and details', icon: 'mail' },
    { id: 'blog', name: 'Blog', required: false, description: 'News and updates', icon: 'edit' },
    { id: 'faq', name: 'FAQ', required: false, description: 'Frequently asked questions', icon: 'help-circle' },
    { id: 'terms', name: 'Terms of Service', required: false, description: 'Legal terms', icon: 'file-text' },
    { id: 'privacy', name: 'Privacy Policy', required: false, description: 'Privacy information', icon: 'shield' }
  ];

  res.json({ 
    success: true,
    templates: templates
  });
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
      const existing = await Store.findByDomain(suggestion);
      if (!existing) {
        availableSuggestions.push(suggestion);
      }
    }
    
    res.json({
      success: true,
      suggestions: availableSuggestions.slice(0, 5),
      primary: availableSuggestions[0] || `${baseSubdomain}-${Date.now()}`
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

// === AGENT AUTOMATION API ENDPOINTS ===

// Get agent system status and metrics
router.get('/agents/status', (req, res) => {
  try {
    const agentSystem = getAgentSystem();
    const status = agentSystem.getSystemStatus();
    
    res.json({
      success: true,
      message: 'Agent automation system is active and monitoring',
      system: status,
      activeAgents: agentSystem.getActiveAgents(),
      taskProgress: agentSystem.getAllTasksProgress()
    });
  } catch (error) {
    console.error('Get agent status error:', error);
    res.status(500).json({ error: 'Failed to get agent status' });
  }
});

// Get all active agents
router.get('/agents/active', (req, res) => {
  try {
    const agentSystem = getAgentSystem();
    const activeAgents = agentSystem.getActiveAgents();
    
    res.json({
      success: true,
      agents: activeAgents,
      count: activeAgents.length
    });
  } catch (error) {
    console.error('Get active agents error:', error);
    res.status(500).json({ error: 'Failed to get active agents' });
  }
});

// Get agent registry
router.get('/agents/registry', (req, res) => {
  try {
    const agentSystem = getAgentSystem();
    const registry = agentSystem.getAgentRegistry();
    
    res.json({
      success: true,
      agents: registry,
      count: registry.length
    });
  } catch (error) {
    console.error('Get agent registry error:', error);
    res.status(500).json({ error: 'Failed to get agent registry' });
  }
});

// Deploy agents for a specific task
router.post('/agents/deploy', async (req, res) => {
  try {
    const { taskDescription, context } = req.body;
    
    if (!taskDescription) {
      return res.status(400).json({
        error: 'Task description is required'
      });
    }
    
    const agentSystem = getAgentSystem();
    const deployment = await agentSystem.autoDeployAgents(taskDescription, context || {});
    
    res.json({
      success: true,
      taskId: deployment.taskId,
      deployedAgents: deployment.deployedAgents.map(agent => ({
        id: agent.id,
        name: agent.name,
        department: agent.department,
        priority: agent.priority
      })),
      coordination: deployment.coordination,
      message: `Successfully deployed ${deployment.deployedAgents.length} agents`
    });
  } catch (error) {
    console.error('Agent deployment error:', error);
    res.status(500).json({
      error: 'Failed to deploy agents',
      message: error.message
    });
  }
});

// Get task progress
router.get('/agents/tasks/:taskId', (req, res) => {
  try {
    const agentSystem = getAgentSystem();
    const taskProgress = agentSystem.getTaskProgress(req.params.taskId);
    
    if (!taskProgress) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({
      success: true,
      task: taskProgress
    });
  } catch (error) {
    console.error('Get task progress error:', error);
    res.status(500).json({ error: 'Failed to get task progress' });
  }
});

// Get all task progress
router.get('/agents/tasks', (req, res) => {
  try {
    const agentSystem = getAgentSystem();
    const allTasks = agentSystem.getAllTasksProgress();
    
    res.json({
      success: true,
      tasks: allTasks,
      count: allTasks.length
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({ error: 'Failed to get task progress' });
  }
});

// Auto-deploy agents for common scenarios when API is used - DISABLED
// setInterval(() => {
//   const agentSystem = getAgentSystem();
//   
//   // Check if we should deploy monitoring agents
//   if (agentSystem.activeAgents.size === 0) {
//     // System is idle, deploy monitoring agents
//     agentSystem.autoDeployAgents('System monitoring and readiness check', {
//       type: 'monitoring',
//       source: 'auto-scheduled'
//     }).catch(err => console.warn('Auto-monitoring deployment failed:', err));
//   }
// }, 300000); // Every 5 minutes

module.exports = router;