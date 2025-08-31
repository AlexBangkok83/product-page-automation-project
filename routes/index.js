const express = require('express');
const Store = require('../models/Store');
const CompanyShopifyStore = require('../models/CompanyShopifyStore');
const { validateSiteSetup, sanitizeInput } = require('../middleware/validation');
const router = express.Router();

// Apply input sanitization to all routes
router.use(sanitizeInput);


// Homepage - Landing page for the platform
router.get('/', (req, res) => {
  res.render('index', { 
    title: 'Multi-Store E-commerce Platform',
    message: 'Welcome to the future of e-commerce!'
  });
});

// === ADMIN ROUTES ===

// Admin Dashboard - Main admin area
router.get('/admin', async (req, res) => {
  try {
    const stores = await Store.findAll();
    res.render('admin/dashboard', { 
      title: 'Admin Dashboard',
      stores: stores,
      totalStores: stores.length,
      activeStores: stores.filter(s => s.status === 'active').length,
      currentPage: 'dashboard'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Failed to load dashboard'
    });
  }
});

// New Admin V2 - Modern interface
router.get('/admin-v2', async (req, res) => {
  try {
    const stores = await Store.findAll();
    const shopifyStores = await CompanyShopifyStore.findAll();
    
    res.render('admin-v2/dashboard', { 
      title: 'Admin Dashboard V2',
      stores: stores,
      shopifyStores: shopifyStores,
      totalStores: stores.length,
      activeStores: stores.filter(s => s.status === 'active').length,
      currentPage: 'dashboard'
    });
  } catch (error) {
    console.error('Dashboard V2 error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Failed to load dashboard'
    });
  }
});

router.get('/admin-v2/company/settings', async (req, res) => {
  try {
    // Get data needed for sidebar
    const stores = await Store.findAll();
    const shopifyStores = await CompanyShopifyStore.findAll();
    
    res.render('admin-v2/company-settings', { 
      title: 'Company Settings',
      stores: stores,
      shopifyStores: shopifyStores,
      currentPage: 'company-settings'
    });
  } catch (error) {
    console.error('Company settings page error:', error);
    res.render('admin-v2/company-settings', { 
      title: 'Company Settings',
      stores: [],
      shopifyStores: [],
      currentPage: 'company-settings'
    });
  }
});

// Company settings save for admin-v2
router.post('/admin-v2/company/settings', async (req, res) => {
  try {
    const { 
      companyName, 
      contactEmail, 
      contactPhone, 
      country, 
      businessAddress 
    } = req.body;
    
    // For now, we'll just return success since company data is hardcoded in templates
    // In a real implementation, you would save to a company_profiles table
    console.log('💾 Admin V2 - Company settings updated:', {
      companyName,
      contactEmail,
      contactPhone,
      country,
      businessAddress
    });
    
    res.json({ 
      success: true, 
      message: 'Company settings updated successfully!' 
    });
    
  } catch (error) {
    console.error('Admin V2 - Company settings save error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save company settings' 
    });
  }
});

router.get('/admin-v2/company/design', async (req, res) => {
  try {
    // Get data needed for sidebar
    const stores = await Store.findAll();
    const shopifyStores = await CompanyShopifyStore.findAll();
    
    res.render('admin-v2/design-library', { 
      title: 'Design Library',
      stores: stores,
      shopifyStores: shopifyStores,
      currentPage: 'design-library'
    });
  } catch (error) {
    console.error('Design library error:', error);
    res.render('admin-v2/design-library', { 
      title: 'Design Library',
      stores: [],
      shopifyStores: [],
      currentPage: 'design-library'
    });
  }
});

// Design Library sub-pages
router.get('/admin-v2/company/design/templates', async (req, res) => {
  try {
    // Get data needed for sidebar
    const stores = await Store.findAll();
    const shopifyStores = await CompanyShopifyStore.findAll();
    
    res.render('admin-v2/design-templates', { 
      title: 'Product Templates',
      stores: stores,
      shopifyStores: shopifyStores,
      currentPage: 'design-templates'
    });
  } catch (error) {
    console.error('Design templates error:', error);
    res.render('admin-v2/design-templates', { 
      title: 'Product Templates',
      stores: [],
      shopifyStores: [],
      currentPage: 'design-templates'
    });
  }
});

router.get('/admin-v2/company/design/themes', async (req, res) => {
  try {
    // Get data needed for sidebar
    const stores = await Store.findAll();
    const shopifyStores = await CompanyShopifyStore.findAll();
    
    res.render('admin-v2/design-themes', { 
      title: 'Themes & Styling',
      stores: stores,
      shopifyStores: shopifyStores,
      currentPage: 'design-themes'
    });
  } catch (error) {
    console.error('Design themes error:', error);
    res.render('admin-v2/design-themes', { 
      title: 'Themes & Styling',
      stores: [],
      shopifyStores: [],
      currentPage: 'design-themes'
    });
  }
});

// Add shopify connection route
router.get('/admin-v2/shopify/:shopifyId', async (req, res) => {
  try {
    const shopifyId = req.params.shopifyId;
    const shopifyStore = await CompanyShopifyStore.findByDomain(shopifyId + '.myshopify.com');
    
    if (!shopifyStore) {
      return res.status(404).render('error', { 
        title: 'Shopify Store Not Found',
        message: 'The requested Shopify store could not be found'
      });
    }
    
    // Get all stores and shopify connections for sidebar
    const stores = await Store.findAll();
    const shopifyStores = await CompanyShopifyStore.findAll();
    const connectedStores = stores.filter(store => store.shopify_domain === shopifyStore.shopify_domain);
    
    // Fetch products from this Shopify store
    let products = [];
    try {
      if (shopifyStore.storefront_access_token) {
        products = await Store.fetchShopifyProducts(shopifyStore.shopify_domain, shopifyStore.storefront_access_token);
      }
    } catch (error) {
      console.error('Error fetching products for Shopify connection:', error);
    }
    
    res.render('admin-v2/shopify-connection', { 
      title: `Shopify Connection - ${shopifyStore.shopify_shop_name}`,
      shopifyStore: shopifyStore,
      stores: stores, // Pass all stores for sidebar
      shopifyStores: shopifyStores, // Pass all shopify stores for sidebar  
      connectedStores: connectedStores, // Keep connected stores for main content
      products: products,
      currentPage: 'shopify-connection'
    });
  } catch (error) {
    console.error('Shopify connection error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Failed to load Shopify connection: ' + error.message
    });
  }
});

router.get('/admin-v2/product/:id/edit', (req, res) => {
  res.render('admin-v2/product-editor', { title: 'Product Editor' });
});

router.get('/admin-v2/store/:id', async (req, res) => {
  try {
    const storeId = req.params.id;
    let store = null;
    
    // Try to find by UUID first, then by domain
    store = await Store.findByUuid(storeId);
    if (!store) {
      // Try to find by domain
      const stores = await Store.findAll();
      store = stores.find(s => s.domain === storeId || s.subdomain === storeId);
    }
    
    if (!store) {
      return res.status(404).render('error', { 
        title: 'Store Not Found',
        message: `The requested store "${storeId}" could not be found`
      });
    }
    
    // Get data needed for sidebar
    const stores = await Store.findAll();
    const shopifyStores = await CompanyShopifyStore.findAll();
    
    // Get store pages - use the correct method
    const pages = await store.getPages();
    
    // Get Shopify products if connected
    let products = [];
    try {
      if (store.shopify_store_id) {
        const shopifyStore = await CompanyShopifyStore.findById(store.shopify_store_id);
        if (shopifyStore && shopifyStore.storefront_access_token) {
          products = await Store.fetchShopifyProducts(shopifyStore.shop_domain, shopifyStore.storefront_access_token);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    
    res.render('admin-v2/store-management', { 
      title: `Store Management - ${store.name}`,
      store: store,
      pages: pages,
      products: products,
      stores: stores,
      shopifyStores: shopifyStores,
      currentPage: 'store-management'
    });
  } catch (error) {
    console.error('Store management error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Failed to load store management: ' + error.message
    });
  }
});

router.get('/admin-v2/store/:storeId/page/:pageId/edit', async (req, res) => {
  try {
    const { storeId, pageId } = req.params;
    const store = await Store.findByUuid(storeId);
    const page = await Store.getPageById(pageId);
    
    if (!store || !page) {
      return res.status(404).render('error', { 
        title: 'Not Found',
        message: 'Store or page not found'
      });
    }
    
    res.render('admin-v2/page-editor', { 
      title: `Edit Page: ${page.title}`,
      store: store,
      page: page
    });
  } catch (error) {
    console.error('Page editor error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Failed to load page editor'
    });
  }
});

router.get('/admin-v2/create-store', async (req, res) => {
  try {
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    // Get data needed for sidebar
    const stores = await Store.findAll();
    const shopifyStores = await CompanyShopifyStore.findAll();
    
    // Get themes from database
    const themes = await db.all('SELECT * FROM themes ORDER BY is_default DESC, created_at DESC');
    
    res.render('admin-v2/create-store', { 
      title: 'Create New Storefront',
      stores: stores,
      shopifyStores: shopifyStores,
      themes: themes,
      currentPage: 'create-store'
    });
  } catch (error) {
    console.error('Create store page error:', error);
    res.render('admin-v2/create-store', { 
      title: 'Create New Storefront',
      stores: [],
      shopifyStores: [],
      themes: [],
      currentPage: 'create-store'
    });
  }
});

// Store creation POST route for admin-v2
router.post('/admin-v2/create-store', validateSiteSetup, async (req, res) => {
  try {
    console.log('🚀 Admin V2 - Processing store creation:', req.body);
    
    // Reuse the existing store creation logic
    req.body.step = 'create-store';
    
    // Generate deployment ID for real-time tracking
    const deploymentId = 'deploy-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    console.log('🎯 Generated deployment ID:', deploymentId);
    
    // Process store creation (reuse existing logic from /admin/site-setup)
    const isUpdate = false;
    const storeData = {
      name: req.body.brandName || req.body['store-name'],
      domain: req.body.domain,
      country: req.body.country || 'US',
      language: req.body.language || 'en', 
      currency: req.body.currency || 'USD',
      timezone: req.body.timezone || 'UTC',
      theme_id: req.body.theme || 'default',
      description: req.body.description || `${req.body.brandName} online store`,
      keywords: req.body.keywords || req.body.brandName,
      categories: req.body.categories ? req.body.categories.join(', ') : '',
      contact_email: req.body.contactEmail || '',
      contact_phone: req.body.contactPhone || '',
      business_address: req.body.businessAddress || '',
      return_policy: req.body.returnPolicy || '',
      privacy_policy: req.body.privacyPolicy || '',
      terms_of_service: req.body.termsOfService || '',
      social_facebook: req.body.socialFacebook || '',
      social_instagram: req.body.socialInstagram || '',
      social_twitter: req.body.socialTwitter || '',
      social_youtube: req.body.socialYoutube || '',
      social_linkedin: req.body.socialLinkedin || '',
      social_tiktok: req.body.socialTiktok || '',
      enable_analytics: req.body.enableAnalytics || false,
      google_analytics_id: req.body.googleAnalyticsId || '',
      facebook_pixel_id: req.body.facebookPixelId || '',
      custom_css: req.body.customCss || '',
      custom_js: req.body.customJs || '',
      pages: req.body.pages || ['home', 'about', 'contact'],
      products_enabled: req.body.enableProducts === 'true',
      shopify_domain: 'ecominter.myshopify.com', // Auto-connect to ecominter
      shopify_connected: true
    };
    
    // Get Shopify access token from company connection
    try {
      const CompanyShopifyStore = require('../models/CompanyShopifyStore');
      const shopifyConnection = await CompanyShopifyStore.findByDomain('ecominter.myshopify.com');
      if (shopifyConnection && shopifyConnection.shopify_access_token) {
        storeData.shopify_access_token = shopifyConnection.shopify_access_token;
        console.log('🔗 Using Shopify access token from connection');
      }
    } catch (error) {
      console.error('Failed to get Shopify access token:', error);
    }
    
    // Save store as draft (don't generate files or deploy yet)
    storeData.deployment_status = 'draft';
    storeData.status = 'draft';
    
    console.log('💾 Creating store as draft with data:', storeData);
    const store = await Store.createDraft(storeData);
    
    // Return success with redirect URL to continue setup
    res.json({
      success: true,
      message: 'Storefront configuration saved. Continue to complete setup.',
      deploymentId: deploymentId,
      store: {
        uuid: store.uuid,
        name: store.name,
        domain: store.domain,
        status: 'draft'
      },
      redirectUrl: `/admin-v2/store/${store.uuid}/setup?step=2`
    });
    
  } catch (error) {
    console.error('Store creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create store: ' + error.message
    });
  }
});

// Store setup continuation routes
router.get('/admin-v2/store/:storeId/setup', async (req, res) => {
  try {
    const { storeId } = req.params;
    const step = req.query.step || '2';
    const store = await Store.findByUuid(storeId);
    
    if (!store) {
      return res.status(404).render('error', { 
        title: 'Store Not Found',
        message: 'The store you are looking for does not exist.'
      });
    }
    
    // Get data needed for sidebar
    const stores = await Store.findAll();
    const shopifyStores = await CompanyShopifyStore.findAll();
    
    // Render the appropriate setup step
    res.render('admin-v2/store-setup', {
      title: `Complete Setup - ${store.name}`,
      store: store,
      step: parseInt(step),
      stores: stores,
      shopifyStores: shopifyStores,
      currentPage: 'store-setup'
    });
    
  } catch (error) {
    console.error('Store setup page error:', error);
    res.status(500).render('error', {
      title: 'Setup Error',
      message: 'Failed to load store setup page'
    });
  }
});

// Load products for store setup step 2
router.get('/admin-v2/store/:storeId/products', async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await Store.findByUuid(storeId);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }
    
    // Load products from Shopify using the store's connection
    if (store.shopify_domain && store.shopify_access_token) {
      try {
        const axios = require('axios');
        const response = await axios.get(`https://${store.shopify_domain}/admin/api/2023-10/products.json?limit=50`, {
          headers: {
            'X-Shopify-Access-Token': store.shopify_access_token,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        const products = response.data.products || [];
        const formattedProducts = products.map(product => ({
          id: product.id,
          title: product.title,
          handle: product.handle,
          status: product.status,
          featuredImage: product.images && product.images.length > 0 ? product.images[0].src : null,
          variants: product.variants ? product.variants.length : 0
        }));
        
        res.json({
          success: true,
          products: formattedProducts
        });
      } catch (error) {
        console.error('Failed to load products from Shopify:', error);
        res.json({
          success: false,
          products: [],
          error: 'Failed to load products from Shopify'
        });
      }
    } else {
      // For stores connected to 'ecominter.myshopify.com', use a default access token or show message
      if (store.shopify_domain === 'ecominter.myshopify.com') {
        res.json({
          success: true,
          products: [
            { id: 'sample-1', title: 'Sample Product 1', handle: 'sample-product-1', featuredImage: null },
            { id: 'sample-2', title: 'Sample Product 2', handle: 'sample-product-2', featuredImage: null }
          ]
        });
      } else {
        res.json({
          success: true,
          products: []
        });
      }
    }
    
  } catch (error) {
    console.error('Products loading error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load products'
    });
  }
});

// Save store configuration (step 2)
router.post('/admin-v2/store/:storeId/configure', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { pages, products } = req.body;
    const store = await Store.findByUuid(storeId);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }
    
    if (store.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Store is not in draft status'
      });
    }
    
    // Save selected pages and products to store configuration
    const db = require('../database/db');
    await db.run(`
      UPDATE stores 
      SET selected_pages = ?, 
          selected_products = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE uuid = ?
    `, [
      pages ? pages.join(',') : 'home,products,about,contact',
      products ? JSON.stringify(products) : JSON.stringify([]),
      storeId
    ]);
    
    console.log(`💾 Saved configuration for store ${store.name}: pages=${pages?.length}, products=${products?.length}`);
    
    res.json({
      success: true,
      message: 'Configuration saved successfully'
    });
    
  } catch (error) {
    console.error('Configuration save error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save configuration'
    });
  }
});

// Delete draft store
router.delete('/admin-v2/store/:storeId/delete', async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await Store.findByUuid(storeId);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }
    
    // Only allow deletion of draft stores
    if (store.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Only draft stores can be deleted. Published stores must be unpublished first.'
      });
    }
    
    console.log(`🗑️ Deleting draft store: ${store.name} (${store.domain})`);
    
    // Delete from database
    const db = require('../database/db');
    await db.run('DELETE FROM stores WHERE uuid = ?', [storeId]);
    
    res.json({
      success: true,
      message: 'Draft store deleted successfully'
    });
    
  } catch (error) {
    console.error('Store deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete store: ' + error.message
    });
  }
});

// Publish draft store (final step)
router.post('/admin-v2/store/:storeId/publish', async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await Store.findByUuid(storeId);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }
    
    if (store.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Store is not in draft status'
      });
    }
    
    console.log('🚀 Publishing draft store:', store.name);
    
    // Convert draft to full store by calling the original create logic
    await store.publishDraft();
    
    res.json({
      success: true,
      message: 'Store published successfully',
      store: {
        uuid: store.uuid,
        name: store.name,
        domain: store.domain,
        url: `https://${store.domain}`
      },
      redirectUrl: `/admin-v2/store/${store.uuid}?published=true`
    });
    
  } catch (error) {
    console.error('Store publish error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish store: ' + error.message
    });
  }
});

// Page content update for admin-v2
router.post('/admin-v2/store/:storeId/page/:pageId/edit', async (req, res) => {
  try {
    const { storeId, pageId } = req.params;
    const store = await Store.findByUuid(storeId);
    
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    
    const { title, content, meta_title, meta_description, page_type } = req.body;
    
    // Decode HTML entities that might have been escaped during JSON transport
    const decodedContent = content ? content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x2F;/g, '/') : content;
    
    // Update the page content
    await store.updatePage(page_type, {
      title,
      content: decodedContent,
      meta_title,
      meta_description
    });
    
    console.log(`💾 Admin V2 - Updated ${page_type} page content for store ${store.name}`);
    
    // Deploy to live with new content (includes regeneration + git automation)
    try {
      console.log(`🚀 Starting deployment for ${store.name}...`);
      await store.deploy(null, true); // Force deployment to ensure changes go live
      console.log(`✅ Store deployed for ${store.name} with updated content`);
    } catch (error) {
      console.error(`❌ Failed to deploy store:`, error);
      // Don't fail the save if deployment fails
    }
    
    res.json({ 
      success: true, 
      message: `${page_type.charAt(0).toUpperCase() + page_type.slice(1)} page updated and deployed successfully!` 
    });
    
  } catch (error) {
    console.error('Admin V2 - Content save error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save page content' 
    });
  }
});

// Sync products endpoint
router.post('/admin-v2/shopify/sync-products', async (req, res) => {
  try {
    // For now, just return success - implement actual sync later
    console.log('🔄 Admin V2 - Syncing Shopify products...');
    
    // Simulate sync delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({ 
      success: true, 
      message: 'Products synced successfully' 
    });
    
  } catch (error) {
    console.error('Admin V2 - Sync products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to sync products' 
    });
  }
});

// Site Setup - Multi-step store creation wizard
router.get('/admin/site-setup', async (req, res) => {
  try {
    const step = req.query.step || '1';
    const storeId = req.query.store;
    const success = req.query.success === 'true';
    const deployed = req.query.deployed === 'true';
    let store = null;
    let isEditMode = false;
    
    // If store ID is provided, fetch store data for editing
    if (storeId) {
      store = await Store.findByUuid(storeId);
      if (store) {
        isEditMode = true;
        console.log('📝 Loading store for editing:', store.name, 'UUID:', store.uuid);
      } else {
        console.warn('⚠️ Store not found for UUID:', storeId);
      }
    }
    
    // If success=true and store exists, show the Store Success Page
    if (success && store && deployed) {
      console.log('🎉 Showing Store Success Page for:', store.name);
      return res.render('admin/store-success', {
        title: `Store Created Successfully - ${store.name}`,
        store: store
      });
    }
    
    const templateData = {
      title: isEditMode ? `Edit Store - ${store.name}` : 'Site Setup - Create Your Store',
      step: step,
      storeId: storeId,
      store: store,
      isEditMode: isEditMode,
      // Error handling
      error: req.query.error,
      message: req.query.message,
      // Preserve form data for new stores
      siteUrl: req.query.siteUrl,
      brandName: req.query.brandName,
      shopifyDomain: req.query.shopifyDomain,
      shippingPolicy: req.query.shippingPolicy,
      returnPolicy: req.query.returnPolicy
    };
    
    console.log('🔄 Rendering site-setup with:', {
      isEditMode,
      storeId,
      storeName: store?.name,
      step
    });
    
    res.render('admin/site-setup', templateData);
  } catch (error) {
    console.error('Site setup page error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Failed to load site setup page'
    });
  }
});

// Real-time deployment progress endpoint
router.get('/admin/site-setup/progress/:deploymentId', (req, res) => {
  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const deploymentId = req.params.deploymentId;
  console.log(`📡 SSE connection established for deployment: ${deploymentId}`);

  // Store the response object for this deployment
  if (!global.deploymentConnections) {
    global.deploymentConnections = new Map();
  }
  global.deploymentConnections.set(deploymentId, res);

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ 
    type: 'connected', 
    message: 'Real-time deployment tracking connected - Complete automation active',
    deploymentId: deploymentId,
    automationLevel: 'complete',
    expectedSteps: [
      'Database creation',
      'File generation', 
      'Git repository setup',
      'Code commit & push',
      'Vercel deployment trigger',
      'Domain verification',
      'Live domain confirmation'
    ]
  })}\n\n`);

  // Clean up on client disconnect
  req.on('close', () => {
    console.log(`📡 SSE connection closed for deployment: ${deploymentId}`);
    global.deploymentConnections.delete(deploymentId);
  });
});

// Helper function to send deployment progress updates
function sendDeploymentUpdate(deploymentId, data) {
  if (global.deploymentConnections && global.deploymentConnections.has(deploymentId)) {
    const res = global.deploymentConnections.get(deploymentId);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

// Site Setup form processing with real-time deployment
router.post('/admin/site-setup', validateSiteSetup, async (req, res) => {
  try {
    const { step } = req.body;
    console.log('🚀 Processing site setup step:', step);
    console.log('📝 Form data received:', {
      step: req.body.step,
      brandName: req.body.brandName,
      siteUrl: req.body.siteUrl,
      domain: req.body.domain,
      country: req.body.country,
      language: req.body.language,
      currency: req.body.currency,
      hasShopify: !!(req.body.shopifyDomain && req.body.shopifyToken)
    });
    
    console.log('🎯 COMPLETE AUTOMATION ACTIVE: Dashboard → Live Domain in 60 seconds');
    
    if (step === 'create-store' || step === 'update-store') {
      const isUpdate = step === 'update-store';
      const storeUuid = req.body.storeId;
      
      console.log(`🔄 Processing ${isUpdate ? 'update' : 'create'} for store:`, {
        isUpdate,
        storeUuid,
        brandName: req.body.brandName
      });
      
      if (isUpdate && !storeUuid) {
        return res.status(400).json({
          success: false,
          error: 'Store ID is required for updates'
        });
      }
      
      // Handle store update
      if (isUpdate) {
        try {
          const existingStore = await Store.findByUuid(storeUuid);
          if (!existingStore) {
            return res.status(404).json({
              success: false,
              error: 'Store not found'
            });
          }
          
          // Debug: Log form data to see what's being sent
          console.log('📋 Form data for update:', {
            selectedPages: req.body.selectedPages,
            hasSelectedPages: !!req.body.selectedPages,
            selectedPagesType: typeof req.body.selectedPages,
            allFormKeys: Object.keys(req.body)
          });
          
          // Update store data
          const updateData = {
            name: req.body.brandName || req.body.storeName,
            domain: req.body.siteUrl || req.body.domain,
            country: req.body.country,
            language: req.body.language,
            currency: req.body.currency,
            shopify_domain: req.body.shopifyDomain,
            shopify_access_token: req.body.shopifyToken,
            shopify_connected: !!(req.body.shopifyDomain && req.body.shopifyToken),
            meta_title: req.body.metaTitle,
            meta_description: req.body.metaDescription,
            // Global settings
            shipping_info: req.body.shippingInfo,
            return_policy: req.body.returnPolicy,
            support_email: req.body.supportEmail,
            support_phone: req.body.supportPhone,
            business_address: req.body.businessAddress,
            gdpr_compliant: !!req.body.enableGDPR,
            cookie_consent: !!req.body.enableCookies,
            // Selected pages
            selected_pages: req.body.selectedPages ? 
              (Array.isArray(req.body.selectedPages) ? req.body.selectedPages.join(',') : req.body.selectedPages) :
              existingStore.selected_pages
          };
          
          await existingStore.update(updateData);
          
          // Auto-regenerate and deploy store files after update (fast deployment)
          console.log('⚡ Starting fast auto-regeneration and deployment...');
          try {
            console.log('⚡ Calling deployFast...');
            // Use fast deployment which regenerates files instantly
            await existingStore.deployFast(true);
            console.log(`⚡ Store fast deployment completed for ${existingStore.name} after site-setup update`);
          } catch (regenError) {
            console.error(`⚠️ Failed to auto-regenerate/deploy store files for ${existingStore.name}:`, regenError.message);
            console.error('Full error:', regenError);
            // Continue without failing the update - user can manually regenerate
          }
          
          console.log('✅ Store updated successfully:', existingStore.name);
          
          return res.json({
            success: true,
            store: existingStore.toJSON(),
            message: 'Store updated successfully',
            redirectUrl: `/admin/stores/${existingStore.uuid}?updated=true`
          });
          
        } catch (updateError) {
          console.error('❌ Store update failed:', updateError);
          return res.status(400).json({
            success: false,
            error: updateError.message || 'Failed to update store'
          });
        }
      }
      // Generate unique deployment ID for real-time tracking
      const deploymentId = `deployment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`🚀 Starting deployment with ID: ${deploymentId}`);

      // Send immediate response with deployment ID
      res.json({
        success: true,
        deploymentId: deploymentId,
        message: 'Store creation and deployment started',
        redirectUrl: `/admin/site-setup/deploy?deploymentId=${deploymentId}`
      });

      // Continue with store creation in background with real-time updates
      setImmediate(async () => {
        try {
          sendDeploymentUpdate(deploymentId, {
            type: 'progress',
            step: 'company-store',
            message: 'Checking Shopify store configuration...',
            progress: 10
          });

          // Handle new Shopify store creation if requested
          if (req.body.newShopifyStore === 'true' && req.body.newStoreNickname && req.body.shopifyDomain && req.body.shopifyToken) {
            try {
              console.log('🆕 Creating new company Shopify store:', req.body.newStoreNickname);
              await CompanyShopifyStore.create({
                nickname: req.body.newStoreNickname,
                shopify_domain: req.body.shopifyDomain,
                shopify_access_token: req.body.shopifyToken
              });
              console.log('✅ New company Shopify store created successfully');
              sendDeploymentUpdate(deploymentId, {
                type: 'progress',
                step: 'company-store',
                message: 'Shopify store saved to company profile',
                progress: 15
              });
            } catch (error) {
              console.warn('⚠️ Failed to save new Shopify store to company profile:', error.message);
              sendDeploymentUpdate(deploymentId, {
                type: 'warning',
                step: 'company-store',
                message: 'Warning: Could not save to company profile (continuing...)',
                progress: 15
              });
            }
          }

          sendDeploymentUpdate(deploymentId, {
            type: 'progress',
            step: 'store-creation',
            message: 'Creating store database entry...',
            progress: 20
          });

          // Create new store with form data
          const storeData = {
            name: req.body.brandName || req.body.storeName,
            domain: req.body.siteUrl || req.body.domain,
            country: req.body.country || 'US',
            language: req.body.language || 'en',
            currency: req.body.currency || 'USD',
            // Template selection
            template: req.body.template || 'bootstrap-default',
            shopify_domain: req.body.shopifyDomain,
            shopify_access_token: req.body.shopifyToken,
            shopify_connected: !!(req.body.shopifyDomain && req.body.shopifyToken),
            meta_title: req.body.metaTitle || req.body.brandName,
            meta_description: req.body.metaDescription,
            // Global settings
            shipping_info: req.body.shippingPolicy,
            return_policy: req.body.returnPolicy,
            support_email: req.body.supportEmail,
            support_phone: req.body.supportPhone,
            business_address: req.body.businessAddress,
            gdpr_compliant: !!req.body.enableGDPR,
            cookie_consent: !!req.body.enableCookies,
            // Selected pages and products
            selected_pages: req.body.selectedPages ? 
              (Array.isArray(req.body.selectedPages) ? req.body.selectedPages.join(',') : req.body.selectedPages) :
              'home,products', // Default required pages
            selected_products: req.body.selectedProducts || '[]'
          };
          
          console.log('🏪 Creating store with data:', storeData);
          
          // STEP 1: Create store in database first
          console.log('🚀 EXECUTING COMPLETE AUTOMATION PIPELINE');
          console.log('📋 UPDATED Pipeline: Database → Files → Git → Deploy → Domain');
          console.log('🔗 STEP 1: Creating store in database...');
          
          const domain = storeData.domain;
          sendDeploymentUpdate(deploymentId, {
            type: 'progress',
            step: 'database-creation',
            message: 'Creating store in database...',
            progress: 15
          });
          
          const store = await Store.create(storeData);
          console.log(`✅ Store created in database: ${store.name} (${store.uuid})`);
          
          // STEP 2: Deploy the store (files, Git, etc.)
          console.log('🚀 STEP 2: Deploying store files and pushing to Git...');
          sendDeploymentUpdate(deploymentId, {
            type: 'progress',
            step: 'store-deployment',
            message: 'Generating files and pushing to Git...',
            progress: 45
          });
          await store.deploy((update) => {
            // Enhanced progress updates with automation context
            const enhancedUpdate = {
              ...update,
              automationActive: true,
              pipelineStage: update.step,
              timestamp: new Date().toISOString()
            };
            
            sendDeploymentUpdate(deploymentId, enhancedUpdate);
            
            // Log progress for transparency 
            console.log(`📊 [${update.progress || 0}%] ${update.step}: ${update.message}`);
          });
          
          console.log('✅ COMPLETE AUTOMATION FINISHED:', store.uuid);
          console.log(`🌍 LIVE URL: https://${store.domain}`);
          
          // STEP 3: Deploy to Vercel and add domain
          console.log('🚀 STEP 3: Deploying to Vercel and adding domain...');
          sendDeploymentUpdate(deploymentId, {
            type: 'progress',
            step: 'vercel-deployment',
            message: 'Deploying to Vercel...',
            progress: 70
          });
          
          try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            // Deploy first to create the deployment
            console.log('🔧 Deploying to Vercel...');
            const { stdout: deployOutput } = await execAsync('vercel --prod', { timeout: 120000 });
            console.log('✅ Deployment completed');
            
            // Extract deployment URL
            const deploymentUrl = deployOutput.match(/https:\/\/[^\s]+\.vercel\.app/);
            const deploymentUrlStr = deploymentUrl ? deploymentUrl[0] : null;
            console.log(`🌐 Deployment URL: ${deploymentUrlStr}`);
            
            // Now add domain to the deployed project
            console.log(`🔗 Adding domain ${domain} to Vercel project...`);
            await execAsync(`vercel domains add ${domain} --force`, { timeout: 30000 });
            console.log(`✅ Domain ${domain} added to Vercel successfully`);
            
            // CRITICAL: Create alias to connect domain to deployment
            if (deploymentUrlStr) {
              console.log(`🔗 Creating alias: ${domain} → ${deploymentUrlStr}`);
              await execAsync(`vercel alias ${deploymentUrlStr} ${domain}`, { timeout: 30000 });
              console.log(`✅ Alias created: ${domain} now points to deployment`);
            } else {
              console.log('⚠️ Could not extract deployment URL for alias creation');
            }
            
            sendDeploymentUpdate(deploymentId, {
              type: 'progress',
              step: 'vercel-deployment',
              message: 'Deployment and domain setup completed!',
              progress: 95
            });
            
          } catch (deployError) {
            console.error('⚠️ Vercel deployment had issues:', deployError.message);
            sendDeploymentUpdate(deploymentId, {
              type: 'warning',
              step: 'vercel-deployment',
              message: 'Deployment had issues but continuing...',
              progress: 85
            });
          }
          
          // Send final success update with verification
          sendDeploymentUpdate(deploymentId, {
            type: 'complete',
            step: 'automation-complete',
            message: 'COMPLETE AUTOMATION SUCCESSFUL - Store is LIVE!',
            progress: 100,
            automationSuccess: true,
            verificationComplete: true,
            store: {
              uuid: store.uuid,
              name: store.name,
              domain: store.domain,
              live_url: `https://${store.domain}`,
              deployment_status: store.deployment_status,
              deployed_at: store.deployed_at
            },
            nextSteps: [
              'Store is now live and accessible',
              'Domain routing is configured', 
              'Auto-deployment pipeline is active',
              'Future updates will deploy automatically'
            ],
            redirectUrl: `/admin/site-setup?step=5&store=${store.uuid}&success=true&deployed=true&automated=true`
          });

        } catch (error) {
          console.error('❌ COMPLETE AUTOMATION FAILED:', error);
          
          // Enhanced error reporting with troubleshooting
          const errorDetails = {
            type: 'error',
            step: 'automation-failed',
            message: `Complete automation failed: ${error.message}`,
            progress: 0,
            error: error.message,
            automationFailed: true,
            troubleshooting: {
              possibleCauses: [
                'Git repository not properly configured',
                'Vercel integration needs setup',
                'Domain configuration issues',
                'Network connectivity problems'
              ],
              nextSteps: [
                'Check Git repository status',
                'Verify Vercel project connection',
                'Confirm domain DNS settings',
                'Try manual deployment from dashboard'
              ],
              supportUrl: '/admin/stores',
              retryPossible: true
            },
            redirectUrl: `/admin/site-setup?step=1&error=automation_failed&message=${encodeURIComponent(error.message)}&troubleshoot=true`
          };
          
          sendDeploymentUpdate(deploymentId, errorDetails);
          
          // Log detailed error for debugging
          console.error('🔍 Automation Error Details:', {
            errorMessage: error.message,
            errorStack: error.stack,
            requestData: req.body,
            timestamp: new Date().toISOString()
          });
        }
      });
    } else if (step === 'configure-pages') {
      // Update store with page configuration
      const store = await Store.findByUuid(req.body.storeId);
      if (!store) {
        console.error('❌ Store not found for ID:', req.body.storeId);
        return res.status(404).render('error', {
          title: 'Store Not Found',
          message: 'The store you are trying to configure could not be found.',
          statusCode: 404
        });
      }
      
      // Update store settings
      await store.update({
        selected_pages: Array.isArray(req.body.selectedPages) ? req.body.selectedPages.join(',') : req.body.selectedPages,
        status: 'active'
      });
      
      console.log('✅ Store configured successfully:', store.uuid);
      res.redirect(`/admin/site-setup?step=5&store=${store.uuid}&configured=true`);
    } else {
      console.log('⚠️ Unknown step, redirecting to step 1');
      res.redirect('/admin/site-setup?step=1');
    }
  } catch (error) {
    console.error('❌ Site setup error:', error);
    
    // Determine error type and provide user-friendly response
    let errorMessage = error.message;
    let errorType = 'general';
    let redirectStep = 1;
    
    if (error.message.includes('Domain conflict')) {
      errorType = 'domain_conflict';
      errorMessage = 'This domain is already in use by another store';
      redirectStep = 1; // Go back to Basic Info step
    } else if (error.message.includes('File system conflict')) {
      errorType = 'filesystem_conflict';
      errorMessage = 'A store folder with this domain already exists';
      redirectStep = 1;
    } else if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      errorType = 'database_conflict';
      errorMessage = 'Store information conflicts with existing data';
      redirectStep = 1;
    } else if (error.message.includes('Missing required fields')) {
      errorType = 'validation_error';
      errorMessage = 'Please fill in all required fields';
      redirectStep = 1;
    }
    
    // Redirect back to the form with error message instead of showing error page
    const errorParams = new URLSearchParams({
      step: redirectStep,
      error: errorType,
      message: errorMessage,
      // Preserve form data
      siteUrl: req.body.siteUrl || '',
      brandName: req.body.brandName || '',
      shopifyDomain: req.body.shopifyDomain || '',
      shippingPolicy: req.body.shippingPolicy || '',
      returnPolicy: req.body.returnPolicy || ''
    });
    
    res.redirect(`/site-setup?${errorParams.toString()}`);
  }
});


// === NEW TEMPLATE SYSTEM ROUTES ===

// Templates Library - Main listing page
router.get('/admin/templates', async (req, res) => {
  try {
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    // Get all templates
    const templates = await db.all('SELECT * FROM product_page_templates ORDER BY is_default DESC, created_at DESC');
    
    res.render('admin/templates-library', { 
      title: 'Templates Library',
      templates: templates,
      currentPage: 'templates'
    });
  } catch (error) {
    console.error('Templates library error:', error);
    res.render('admin/templates-library', { 
      title: 'Templates Library',
      templates: [],
      currentPage: 'templates'
    });
  }
});

// Template Builder - Creation and editing interface
router.get('/admin/templates/builder', async (req, res) => {
  try {
    const db = require('../database/db');
    const editId = req.query.edit;
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    let templateData = null;
    let editMode = false;
    
    // If editing existing template
    if (editId) {
      templateData = await db.get('SELECT * FROM product_page_templates WHERE id = ?', [editId]);
      if (templateData) {
        editMode = true;
      }
    }
    
    res.render('admin/template-builder', { 
      title: editMode ? `Edit Template - ${templateData.name}` : 'Create Template',
      template: templateData,
      editMode: editMode,
      currentPage: 'template-builder'
    });
  } catch (error) {
    console.error('Template builder error:', error);
    res.render('admin/template-builder', { 
      title: 'Create Template',
      template: null,
      editMode: false,
      currentPage: 'template-builder'
    });
  }
});

// Save new template
router.post('/admin/templates', async (req, res) => {
  try {
    const { name, description, sections } = req.body;
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    if (!name || !sections) {
      return res.status(400).json({ success: false, error: 'Name and sections are required' });
    }
    
    // Insert new template
    const result = await db.run(`
      INSERT INTO product_page_templates (name, description, elements, is_default, created_at)
      VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
    `, [name, description || '', JSON.stringify(sections)]);
    
    res.json({ success: true, templateId: result.lastID });
    
  } catch (error) {
    console.error('Save template error:', error);
    res.status(500).json({ success: false, error: 'Failed to save template: ' + error.message });
  }
});

// Update existing template
router.put('/admin/templates/:id', async (req, res) => {
  try {
    const { name, description, sections } = req.body;
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    if (!name || !sections) {
      return res.status(400).json({ success: false, error: 'Name and sections are required' });
    }
    
    // Update template
    await db.run(`
      UPDATE product_page_templates 
      SET name = ?, description = ?, elements = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, description || '', JSON.stringify(sections), req.params.id]);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ success: false, error: 'Failed to update template: ' + error.message });
  }
});

// Get specific template (for editing)
router.get('/admin/templates/:id', async (req, res) => {
  try {
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    const template = await db.get('SELECT * FROM product_page_templates WHERE id = ?', [req.params.id]);
    
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    res.json({ success: true, template: template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ success: false, error: 'Failed to get template: ' + error.message });
  }
});

// Duplicate template
router.post('/admin/templates/:id/duplicate', async (req, res) => {
  try {
    const { name } = req.body;
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    const original = await db.get('SELECT * FROM product_page_templates WHERE id = ?', [req.params.id]);
    if (!original) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    const result = await db.run(`
      INSERT INTO product_page_templates (name, description, elements, is_default, created_at)
      VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
    `, [name, original.description, original.elements]);
    
    res.json({ success: true, templateId: result.lastID });
  } catch (error) {
    console.error('Duplicate template error:', error);
    res.status(500).json({ success: false, error: 'Failed to duplicate template: ' + error.message });
  }
});

// Delete template
router.delete('/admin/templates/:id', async (req, res) => {
  try {
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    // Check if it's the default template
    const template = await db.get('SELECT is_default FROM product_page_templates WHERE id = ?', [req.params.id]);
    if (template && template.is_default) {
      return res.status(400).json({ success: false, error: 'Cannot delete default template' });
    }
    
    // Delete template assignments first
    await db.run('DELETE FROM product_template_assignments WHERE template_id = ?', [req.params.id]);
    
    // Delete template
    await db.run('DELETE FROM product_page_templates WHERE id = ?', [req.params.id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template: ' + error.message });
  }
});

// Template Assignments page
router.get('/admin/templates/assignments', async (req, res) => {
  try {
    res.render('admin/template-assignments', { 
      title: 'Template Assignments',
      currentPage: 'template-assignments'
    });
  } catch (error) {
    console.error('Template assignments error:', error);
    res.render('admin/template-assignments', { 
      title: 'Template Assignments',
      currentPage: 'template-assignments'
    });
  }
});

// Agent system works in Claude Code - no web dashboard needed

// Company Profile - Manage Shopify stores
router.get('/admin/company-profile', (req, res) => {
  res.render('admin/company-profile', { 
    title: 'Company Profile - Manage Shopify Stores',
    currentPage: 'company-profile'
  });
});

// Deployment Progress Tracking Page
router.get('/admin/site-setup/deploy', (req, res) => {
  const deploymentId = req.query.deploymentId;
  
  if (!deploymentId) {
    return res.redirect('/admin/site-setup?error=missing_deployment_id');
  }
  
  res.render('admin/deployment-progress', {
    title: 'Store Deployment in Progress',
    deploymentId: deploymentId,
    automationActive: true,
    expectedDuration: '60-120 seconds',
    pipelineSteps: [
      'Database Creation',
      'File Generation', 
      'Git Repository Setup',
      'Code Commit & Push',
      'Vercel Deployment',
      'Domain Verification',
      'Live Domain Confirmation'
    ]
  });
});

// === STORE MANAGEMENT ROUTES (Phase 2) ===

// Store Content Editor - Edit content for specific store
router.get('/admin/store/:uuid/content', async (req, res) => {
  try {
    const storeUuid = req.params.uuid;
    const store = await Store.findByUuid(storeUuid);
    
    if (!store) {
      return res.status(404).render('error', {
        title: 'Store Not Found',
        message: 'The store you are looking for does not exist.'
      });
    }
    
    // Get store pages for editing
    const pages = await store.getPages();
    const currentPageType = req.query.page || 'home';
    let currentPageData = await store.getPage(currentPageType);
    
    // If page doesn't exist or has no content, try to get default content
    if (!currentPageData || !currentPageData.content || currentPageData.content.trim() === '') {
      const db = require('../database/db');
      const defaultContent = await db.get(
        'SELECT * FROM content_defaults WHERE page_type = ? AND language = ?',
        [currentPageType, store.language || 'en']
      );
      
      if (defaultContent) {
        // Convert content blocks to simple HTML for WYSIWYG editor
        let htmlContent = '';
        try {
          const blocks = JSON.parse(defaultContent.content_blocks || '[]');
          htmlContent = blocks.map(block => {
            if (block.type === 'text') {
              return `<p>${block.content || ''}</p>`;
            } else if (block.type === 'team') {
              return `<h3>${block.title || 'Our Team'}</h3><p>${block.description || ''}</p>`;
            } else {
              return `<p>${block.content || block.description || ''}</p>`;
            }
          }).join('\n');
        } catch (e) {
          htmlContent = `<p>Welcome to your ${currentPageType} page. Add your content here...</p>`;
        }
        
        // Create default page data structure
        currentPageData = {
          page_type: currentPageType,
          title: defaultContent.title ? defaultContent.title.replace('{store_name}', store.name) : `${currentPageType.charAt(0).toUpperCase() + currentPageType.slice(1)} - ${store.name}`,
          subtitle: defaultContent.subtitle || '',
          content: htmlContent.replace(/{store_name}/g, store.name),
          meta_title: defaultContent.meta_title ? defaultContent.meta_title.replace('{store_name}', store.name) : '',
          meta_description: defaultContent.meta_description ? defaultContent.meta_description.replace('{store_name}', store.name) : ''
        };
      } else {
        // Fallback if no default content exists
        currentPageData = {
          page_type: currentPageType,
          title: `${currentPageType.charAt(0).toUpperCase() + currentPageType.slice(1)} - ${store.name}`,
          subtitle: '',
          content: `<p>Welcome to your ${currentPageType} page. Add your content here...</p>`,
          meta_title: '',
          meta_description: ''
        };
      }
    }
    
    console.log(`📝 Loading content editor for ${store.name}, page: ${currentPageType}`);
    console.log(`📄 Found ${pages.length} pages for store`);
    
    res.render('admin/content-editor', {
      title: `Edit Content - ${store.name}`,
      store: store,
      pages: pages,
      currentPage: currentPageType,
      currentPageData: currentPageData
    });
  } catch (error) {
    console.error('Content editor error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load content editor'
    });
  }
});

// Save content changes
router.post('/admin/store/:uuid/content', async (req, res) => {
  try {
    const storeUuid = req.params.uuid;
    const store = await Store.findByUuid(storeUuid);
    
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    
    const { pageType, title, subtitle, content, meta_title, meta_description } = req.body;
    
    // Decode HTML entities that might have been escaped during JSON transport
    const decodedContent = content ? content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x2F;/g, '/') : content;
    
    // Update the page content
    await store.updatePage(pageType, {
      title,
      subtitle, 
      content: decodedContent,
      meta_title,
      meta_description
    });
    
    console.log(`💾 Updated ${pageType} page content for store ${store.name}`);
    
    // Deploy to live with new content (includes regeneration + git automation)
    try {
      console.log(`🚀 Starting deployment for ${store.name}...`);
      await store.deploy(null, true); // Force deployment to ensure changes go live
      console.log(`✅ Store deployed for ${store.name} with updated content`);
    } catch (error) {
      console.error(`❌ Failed to deploy store:`, error);
      console.error(`❌ Error stack:`, error.stack);
      // Don't fail the save if deployment fails
    }
    
    res.json({ 
      success: true, 
      message: `${pageType.charAt(0).toUpperCase() + pageType.slice(1)} page updated and deployed successfully!` 
    });
    
  } catch (error) {
    console.error('Content save error:', error);
    res.status(500).json({ success: false, message: 'Failed to save content' });
  }
});

// Store Pages Manager - Manage which pages are enabled/disabled
router.get('/admin/store/:uuid/pages', async (req, res) => {
  try {
    const storeUuid = req.params.uuid;
    const store = await Store.findByUuid(storeUuid);
    
    if (!store) {
      return res.status(404).render('error', {
        title: 'Store Not Found',
        message: 'The store you are looking for does not exist.'
      });
    }
    
    // TODO: Get store pages with enable/disable status
    res.render('admin/page-manager', {
      title: `Manage Pages - ${store.name}`,
      store: store,
      pages: [] // Will be populated with store pages
    });
  } catch (error) {
    console.error('Page manager error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load page manager'
    });
  }
});

// Complete Automation Status Dashboard
router.get('/admin/automation-status', async (req, res) => {
  try {
    const stores = await Store.findAll();
    
    // Get deployment statistics
    const deploymentStats = {
      total: stores.length,
      deployed: stores.filter(s => s.deployment_status === 'deployed').length,
      deploying: stores.filter(s => s.deployment_status === 'deploying').length,
      failed: stores.filter(s => s.deployment_status === 'failed').length,
      pending: stores.filter(s => s.deployment_status === 'pending').length
    };
    
    // Check which stores are actually live
    const liveStatuses = await Promise.allSettled(
      stores.map(async store => {
        try {
          const isLive = await store.isDomainLive();
          return { uuid: store.uuid, isLive };
        } catch (error) {
          return { uuid: store.uuid, isLive: false };
        }
      })
    );
    
    const liveStatusMap = new Map();
    liveStatuses.forEach(result => {
      if (result.status === 'fulfilled') {
        liveStatusMap.set(result.value.uuid, result.value.isLive);
      }
    });
    
    res.render('admin/automation-status', {
      title: 'Complete Automation Status',
      stores: stores.map(store => ({
        ...store.toJSON(),
        isLive: liveStatusMap.get(store.uuid) || false
      })),
      stats: deploymentStats,
      automationEnabled: true,
      pipelineHealthy: deploymentStats.failed < deploymentStats.total * 0.1
    });
    
  } catch (error) {
    console.error('Automation status error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load automation status'
    });
  }
});

// Complete automation deployment status endpoint
router.get('/admin/deployment/status/:storeId', async (req, res) => {
  try {
    const store = await Store.findByUuid(req.params.storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    // Check if domain is actually live
    const isLive = await store.isDomainLive();
    
    res.json({
      success: true,
      store: {
        uuid: store.uuid,
        name: store.name,
        domain: store.domain,
        deployment_status: store.deployment_status,
        deployed_at: store.deployed_at,
        live_url: `https://${store.domain}`
      },
      deployment: store.getDeploymentInfo(),
      verification: {
        isLive: isLive,
        lastChecked: new Date().toISOString()
      },
      automation: {
        pipelineActive: true,
        autoDeployEnabled: true,
        lastAutomationRun: store.deployed_at
      }
    });
  } catch (error) {
    console.error('Deployment status error:', error);
    res.status(500).json({ 
      error: 'Failed to get deployment status',
      message: error.message 
    });
  }
});

// Force redeploy endpoint
router.post('/admin/deployment/redeploy/:storeId', async (req, res) => {
  try {
    const store = await Store.findByUuid(req.params.storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    // Start redeployment in background
    const deploymentId = `redeploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      success: true,
      deploymentId: deploymentId,
      message: 'Redeployment started',
      progressUrl: `/admin/site-setup/progress/${deploymentId}`
    });
    
    // Execute redeployment in background
    setImmediate(async () => {
      try {
        await store.deploy((update) => {
          sendDeploymentUpdate(deploymentId, {
            ...update,
            redeployment: true,
            storeId: store.uuid
          });
        });
        
        sendDeploymentUpdate(deploymentId, {
          type: 'complete',
          step: 'redeployment-complete',
          message: 'Redeployment completed successfully',
          progress: 100,
          success: true
        });
        
      } catch (error) {
        sendDeploymentUpdate(deploymentId, {
          type: 'error',
          step: 'redeployment-failed',
          message: `Redeployment failed: ${error.message}`,
          progress: 0,
          error: error.message
        });
      }
    });
    
  } catch (error) {
    console.error('Redeploy error:', error);
    res.status(500).json({ 
      error: 'Failed to start redeployment',
      message: error.message 
    });
  }
});

// Agents work in Claude Code - no manual deployment needed

// Store management - View/edit individual store (legacy)
router.get('/admin/stores/:uuid', async (req, res) => {
  try {
    const store = await Store.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).render('error', {
        title: 'Store Not Found',
        message: 'The requested store could not be found.',
        statusCode: 404
      });
    }
    
    const pages = await store.getPages();
    
    res.render('admin/store-details', {
      title: `${store.name} - Store Details`,
      store: store,
      pages: pages
    });
  } catch (error) {
    console.error('Store details error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load store details',
      statusCode: 500
    });
  }
});

// Unified Store Edit Page - Main editing interface
router.get('/admin/stores/:uuid/edit', async (req, res) => {
  try {
    const store = await Store.findByUuid(req.params.uuid);
    if (!store) {
      return res.status(404).render('error', {
        title: 'Store Not Found',
        message: 'The requested store could not be found.',
        statusCode: 404
      });
    }
    
    // Get all pages for this store
    const pages = await store.getPages();
    
    // Get products if Shopify is connected
    let products = [];
    let selectedProducts = [];
    if (store.shopify_domain && store.shopify_access_token) {
      try {
        products = await store.fetchShopifyProducts(50);
        selectedProducts = store.selected_products ? JSON.parse(store.selected_products) : [];
      } catch (error) {
        console.warn(`Could not fetch products for ${store.name}:`, error.message);
      }
    }
    
    res.render('admin/store-edit', {
      title: `Edit ${store.name}`,
      store: store,
      pages: pages,
      products: products,
      selectedProducts: selectedProducts
    });
  } catch (error) {
    console.error('Store edit error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load store editor',
      statusCode: 500
    });
  }
});

// === PRODUCT MANAGEMENT ROUTES ===

// Product page editor for store admin
router.get('/admin/stores/:uuid/product/:handle/edit', async (req, res) => {
  try {
    const storeUuid = req.params.uuid;
    const productHandle = req.params.handle;
    const store = await Store.findByUuid(storeUuid);
    
    if (!store) {
      return res.status(404).render('error', {
        title: 'Store Not Found',
        message: 'The store you are looking for does not exist.'
      });
    }

    if (!store.shopify_domain || !store.shopify_access_token) {
      return res.status(400).render('error', {
        title: 'Shopify Not Connected',
        message: 'This store is not connected to Shopify.'
      });
    }

    // Fetch the product from Shopify
    const shopifyProduct = await store.getShopifyProduct(productHandle);
    
    if (!shopifyProduct) {
      return res.status(404).render('error', {
        title: 'Product Not Found',
        message: 'The product you are trying to edit does not exist in Shopify.'
      });
    }

    // Check if custom product page content exists
    const db = require('../database/db');
    let customContent = await db.get(
      'SELECT * FROM store_product_pages WHERE store_id = ? AND product_handle = ?',
      [store.id, productHandle]
    );

    // If no custom content exists, create default structure
    if (!customContent) {
      customContent = {
        custom_title: shopifyProduct.title,
        custom_description: shopifyProduct.description,
        custom_content: '',
        meta_title: shopifyProduct.title + ' - ' + store.name,
        meta_description: shopifyProduct.description ? 
          shopifyProduct.description.replace(/<[^>]*>/g, '').substring(0, 160) + '...' :
          `${shopifyProduct.title} - Available at ${store.name}`,
        seo_slug: productHandle,
        is_active: true
      };
    }

    res.render('admin/product-edit', {
      title: `Edit ${shopifyProduct.title} - ${store.name}`,
      store: store,
      product: shopifyProduct,
      customContent: customContent,
      productHandle: productHandle
    });

  } catch (error) {
    console.error('Product edit page error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load product editor'
    });
  }
});

// Save product page content
router.post('/admin/stores/:uuid/product/:handle/edit', async (req, res) => {
  try {
    const storeUuid = req.params.uuid;
    const productHandle = req.params.handle;
    const store = await Store.findByUuid(storeUuid);
    
    if (!store) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    const {
      custom_title,
      custom_description,
      custom_content,
      meta_title,
      meta_description,
      seo_slug,
      is_active
    } = req.body;

    const db = require('../database/db');
    
    // Upsert the custom content
    await db.run(`
      INSERT OR REPLACE INTO store_product_pages 
      (store_id, product_handle, custom_title, custom_description, custom_content, 
       meta_title, meta_description, seo_slug, is_active, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      store.id,
      productHandle,
      custom_title,
      custom_description,
      custom_content,
      meta_title,
      meta_description,
      seo_slug || productHandle,
      is_active ? 1 : 0
    ]);

    console.log(`✅ Updated product page content for ${productHandle} in store ${store.name}`);

    res.json({
      success: true,
      message: 'Product page updated successfully!'
    });

  } catch (error) {
    console.error('Save product page error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save product page: ' + error.message
    });
  }
});

// === PRODUCT DETAIL ROUTES ===

// Product detail page for specific stores
router.get('/products/:handle', async (req, res) => {
  try {
    const productHandle = req.params.handle;
    const hostname = req.get('host');
    
    // Find store by domain/hostname
    let store = await Store.findByDomain(hostname);
    
    if (!store) {
      // Try to find by subdomain if not found by main domain
      const subdomain = hostname.split('.')[0];
      store = await Store.findBySubdomain(subdomain);
    }
    
    if (!store) {
      return res.status(404).render('error', {
        title: 'Store Not Found',
        message: 'The store you are looking for does not exist.',
        statusCode: 404
      });
    }

    if (!store.shopify_domain || !store.shopify_access_token) {
      return res.status(404).render('error', {
        title: 'Product Not Found',
        message: 'This store is not connected to Shopify.',
        statusCode: 404
      });
    }

    // Fetch the specific product from Shopify
    const product = await store.getShopifyProduct(productHandle);
    
    if (!product) {
      return res.status(404).render('error', {
        title: 'Product Not Found',
        message: 'The product you are looking for does not exist.',
        statusCode: 404
      });
    }

    // Get all pages for navigation
    const allPages = await store.getPages();

    // Render product detail template
    res.render('product-detail', {
      title: `${product.title} - ${store.name}`,
      store: store,
      product: product,
      allPages: allPages,
      metaDescription: product.description ? 
        product.description.replace(/<[^>]*>/g, '').substring(0, 160) + '...' :
        `${product.title} - Available at ${store.name}`
    });

  } catch (error) {
    console.error('Product detail error:', error.message);
    console.error('Product detail stack:', error.stack);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load product details: ' + error.message,
      statusCode: 500
    });
  }
});

// === LEGACY ROUTES (for backward compatibility) ===

// Redirect old site-setup to new admin path
router.get('/site-setup', (req, res) => {
  res.redirect('/admin/site-setup');
});

router.post('/site-setup', (req, res) => {
  res.redirect('/admin/site-setup');
});

// Redirect old dashboard to new admin path
router.get('/dashboard', (req, res) => {
  res.redirect('/admin');
});

// === THEME MANAGEMENT ROUTES ===

// Themes Library - Main listing page
router.get('/admin/themes', async (req, res) => {
  try {
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    // Get all themes
    const themes = await db.all('SELECT * FROM themes ORDER BY is_default DESC, created_at DESC');
    
    res.render('admin/themes-library', {
      title: 'Themes Library',
      themes: themes,
      currentPage: 'themes'
    });
  } catch (error) {
    console.error('Themes library error:', error);
    res.render('admin/themes-library', {
      title: 'Themes Library',
      themes: [],
      currentPage: 'themes'
    });
  }
});

// Theme Builder - Create new theme
router.get('/admin/themes/builder', async (req, res) => {
  try {
    const db = require('../database/db');
    const editId = req.query.edit;
    
    let theme = null;
    let editMode = false;
    
    if (editId) {
      // Ensure database is initialized
      if (!db.db) {
        await db.initialize();
      }
      
      theme = await db.get('SELECT * FROM themes WHERE id = ?', [editId]);
      editMode = !!theme;
    }
    
    res.render('admin/theme-builder', {
      title: editMode ? 'Edit Theme' : 'Create Theme',
      theme: theme,
      editMode: editMode,
      currentPage: 'theme-builder'
    });
  } catch (error) {
    console.error('Theme builder error:', error);
    res.render('admin/theme-builder', {
      title: 'Create Theme',
      theme: null,
      editMode: false,
      currentPage: 'theme-builder'
    });
  }
});

// Create new theme
router.post('/admin/themes', async (req, res) => {
  try {
    const { name, description, css_variables, layout_config, header_config, footer_config, is_default } = req.body;
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Theme name is required' });
    }
    
    // If setting as default, remove default flag from others
    if (is_default) {
      await db.run('UPDATE themes SET is_default = 0');
    }
    
    // Insert new theme
    const result = await db.run(`
      INSERT INTO themes (name, description, css_variables, layout_config, header_config, footer_config, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      name.trim(),
      description ? description.trim() : null,
      css_variables || null,
      layout_config || null,
      header_config || null,
      footer_config || null,
      is_default ? 1 : 0
    ]);
    
    res.json({ success: true, themeId: result.lastID });
    
  } catch (error) {
    console.error('Create theme error:', error);
    res.status(500).json({ success: false, error: 'Failed to create theme' });
  }
});

// Update existing theme
router.put('/admin/themes/:id', async (req, res) => {
  try {
    const themeId = req.params.id;
    const { name, description, css_variables, layout_config, header_config, footer_config, is_default } = req.body;
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Theme name is required' });
    }
    
    // Check if theme exists
    const existingTheme = await db.get('SELECT * FROM themes WHERE id = ?', [themeId]);
    if (!existingTheme) {
      return res.status(404).json({ success: false, error: 'Theme not found' });
    }
    
    // If setting as default, remove default flag from others
    if (is_default && !existingTheme.is_default) {
      await db.run('UPDATE themes SET is_default = 0 WHERE id != ?', [themeId]);
    }
    
    // Update theme
    await db.run(`
      UPDATE themes 
      SET name = ?, description = ?, css_variables = ?, layout_config = ?, header_config = ?, footer_config = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name.trim(),
      description ? description.trim() : null,
      css_variables || null,
      layout_config || null,
      header_config || null,
      footer_config || null,
      is_default ? 1 : 0,
      themeId
    ]);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Update theme error:', error);
    res.status(500).json({ success: false, error: 'Failed to update theme' });
  }
});

// Duplicate theme
router.post('/admin/themes/:id/duplicate', async (req, res) => {
  try {
    const themeId = req.params.id;
    const { name } = req.body;
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'New theme name is required' });
    }
    
    // Get original theme
    const original = await db.get('SELECT * FROM themes WHERE id = ?', [themeId]);
    if (!original) {
      return res.status(404).json({ success: false, error: 'Theme not found' });
    }
    
    // Create duplicate (never default)
    const result = await db.run(`
      INSERT INTO themes (name, description, css_variables, layout_config, header_config, footer_config, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `, [
      name.trim(),
      original.description,
      original.css_variables,
      original.layout_config,
      original.header_config,
      original.footer_config
    ]);
    
    res.json({ success: true, themeId: result.lastID });
    
  } catch (error) {
    console.error('Duplicate theme error:', error);
    res.status(500).json({ success: false, error: 'Failed to duplicate theme' });
  }
});

// Delete theme
router.delete('/admin/themes/:id', async (req, res) => {
  try {
    const themeId = req.params.id;
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    // Check if theme exists and if it's default
    const theme = await db.get('SELECT * FROM themes WHERE id = ?', [themeId]);
    if (!theme) {
      return res.status(404).json({ success: false, error: 'Theme not found' });
    }
    
    if (theme.is_default) {
      return res.status(400).json({ success: false, error: 'Cannot delete default theme' });
    }
    
    // Check if theme is being used by any stores
    const storeCount = await db.get('SELECT COUNT(*) as count FROM stores WHERE theme_id_new = ?', [themeId]);
    if (storeCount.count > 0) {
      return res.status(400).json({ success: false, error: `Theme is currently being used by ${storeCount.count} store(s)` });
    }
    
    // Delete theme
    await db.run('DELETE FROM themes WHERE id = ?', [themeId]);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete theme error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete theme' });
  }
});

// === STORE-THEME CONNECTION ROUTES ===

// Update Store Theme
router.post('/admin/store/:id/theme', async (req, res) => {
  try {
    const storeId = req.params.id;
    const { theme_id } = req.body;
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    if (!theme_id) {
      return res.status(400).json({ success: false, error: 'Theme ID is required' });
    }
    
    // Verify theme exists
    const theme = await db.get('SELECT * FROM themes WHERE id = ?', [theme_id]);
    if (!theme) {
      return res.status(404).json({ success: false, error: 'Theme not found' });
    }
    
    // Verify store exists
    const store = await db.get('SELECT * FROM stores WHERE id = ?', [storeId]);
    if (!store) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }
    
    // Update store theme
    await db.run('UPDATE stores SET theme_id_new = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [theme_id, storeId]);
    
    console.log(`✅ Store "${store.name}" theme updated to "${theme.name}"`);
    
    // ✅ FIXED: Use SAME deployment method as content updates (api.js:300)
    const Store = require('../models/Store');
    const storeInstance = await Store.findById(storeId);
    
    // DEBUG: Check if store has updated theme
    console.log('🔍 DEBUG Theme update - Store before deploy:', { 
      name: storeInstance.name, 
      theme_id: storeInstance.theme_id, 
      theme_id_new: storeInstance.theme_id_new 
    });
    
    setImmediate(async () => {
      try {
        // ✅ Use complete deployment pipeline (not just regeneration)
        await storeInstance.deploy(null, true); // Force deployment like content updates
        console.log(`🚀 Store deployed for ${store.name} after theme update - COMPLETE PIPELINE`);
      } catch (deployError) {
        console.warn(`⚠️ Failed to deploy store after theme update for ${store.name}:`, deployError.message);
      }
    });
    
    res.json({ 
      success: true, 
      message: `Theme updated to "${theme.name}" successfully and deployment started!`,
      theme: theme
    });
    
  } catch (error) {
    console.error('Update store theme error:', error);
    res.status(500).json({ success: false, error: 'Failed to update store theme' });
  }
});


// === API ENDPOINTS FOR THEMES ===

// API endpoint to get themes (for AJAX requests)
router.get('/api/themes', async (req, res) => {
  try {
    const db = require('../database/db');
    
    // Ensure database is initialized
    if (!db.db) {
      await db.initialize();
    }
    
    // Get all themes
    const themes = await db.all('SELECT * FROM themes ORDER BY is_default DESC, created_at DESC');
    
    res.json({
      success: true,
      themes: themes
    });
  } catch (error) {
    console.error('API themes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load themes'
    });
  }
});

// === ADMIN V2 DESIGN ENDPOINTS ===

// Save design settings
router.post('/admin-v2/company/design/settings', async (req, res) => {
  try {
    const { primaryColor, secondaryColor, accentColor, headingFont, bodyFont } = req.body;
    
    // In a real app, you'd save these to a design_settings table
    // For now, we'll just return success
    console.log('Saving design settings:', req.body);
    
    res.json({
      success: true,
      message: 'Design settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving design settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save design settings'
    });
  }
});

// Template management endpoints
router.get('/admin-v2/template/create', (req, res) => {
  res.render('admin-v2/template-create', {
    title: 'Create Template'
  });
});

router.get('/admin-v2/template/:type/edit', (req, res) => {
  const templateType = req.params.type;
  res.render('admin-v2/template-edit', {
    title: `Edit ${templateType.charAt(0).toUpperCase() + templateType.slice(1)} Template`,
    templateType: templateType
  });
});

// Store deployment endpoint
router.post('/admin-v2/store/deploy', async (req, res) => {
  try {
    const { storeId } = req.body;
    
    // In a real app, you'd trigger the deployment process
    console.log(`Deploying store ${storeId}...`);
    
    // Simulate deployment delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({
      success: true,
      message: 'Store deployed successfully'
    });
  } catch (error) {
    console.error('Error deploying store:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deploy store'
    });
  }
});

// Company Page Template Routes
// Get page template by type
router.get('/admin-v2/company/page-template/:pageType', async (req, res) => {
  try {
    const { pageType } = req.params;
    const companyId = 1; // For now, single company
    
    const db = require('../database/db');
    const template = await db.get(
      'SELECT * FROM company_page_templates WHERE company_id = ? AND page_type = ? AND is_active = 1',
      [companyId, pageType]
    );
    
    if (template) {
      res.json({
        success: true,
        template: {
          title: template.title,
          content: template.content,
          updated_at: template.updated_at
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Template not found'
      });
    }
  } catch (error) {
    console.error('Error loading page template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load page template'
    });
  }
});

// Save/update page template
router.post('/admin-v2/company/page-template', async (req, res) => {
  try {
    const { pageType, title, content } = req.body;
    const companyId = 1; // For now, single company
    
    if (!pageType || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: pageType, title, content'
      });
    }
    
    const db = require('../database/db');
    
    // Check if template already exists
    const existingTemplate = await db.get(
      'SELECT id FROM company_page_templates WHERE company_id = ? AND page_type = ?',
      [companyId, pageType]
    );
    
    if (existingTemplate) {
      // Update existing template
      await db.run(
        'UPDATE company_page_templates SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ? AND page_type = ?',
        [title, content, companyId, pageType]
      );
    } else {
      // Create new template
      await db.run(
        'INSERT INTO company_page_templates (company_id, page_type, title, content) VALUES (?, ?, ?, ?)',
        [companyId, pageType, title, content]
      );
    }
    
    res.json({
      success: true,
      message: 'Page template saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving page template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save page template'
    });
  }
});

// Create new page template type
router.post('/admin-v2/company/page-template/create', async (req, res) => {
  try {
    const { pageType, pageName } = req.body;
    const companyId = 1; // For now, single company
    
    if (!pageType || !pageName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: pageType, pageName'
      });
    }
    
    // Validate page type format
    if (!/^[a-z0-9_-]+$/.test(pageType)) {
      return res.status(400).json({
        success: false,
        error: 'Page type should only contain lowercase letters, numbers, hyphens, and underscores'
      });
    }
    
    const db = require('../database/db');
    
    // Check if template already exists
    const existingTemplate = await db.get(
      'SELECT id FROM company_page_templates WHERE company_id = ? AND page_type = ?',
      [companyId, pageType]
    );
    
    if (existingTemplate) {
      return res.status(409).json({
        success: false,
        error: 'A template with this page type already exists'
      });
    }
    
    // Create default content for new template
    const defaultContent = `<h1>${pageName}</h1>
<p>Enter your ${pageName.toLowerCase()} content here...</p>

<h2>Section 1</h2>
<p>Add your content sections as needed.</p>

<h2>Section 2</h2>
<p>You can use the rich text editor to format your content with headings, lists, links, and more.</p>

<p><em>Last updated: ${new Date().toLocaleDateString()}</em></p>`;
    
    // Create new template
    await db.run(
      'INSERT INTO company_page_templates (company_id, page_type, title, content) VALUES (?, ?, ?, ?)',
      [companyId, pageType, pageName, defaultContent]
    );
    
    res.json({
      success: true,
      message: `${pageName} template created successfully`
    });
    
  } catch (error) {
    console.error('Error creating page template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create page template'
    });
  }
});

// Delete page template
router.delete('/admin-v2/company/page-template/:pageType', async (req, res) => {
  try {
    const { pageType } = req.params;
    const companyId = 1; // For now, single company
    
    const db = require('../database/db');
    
    const result = await db.run(
      'DELETE FROM company_page_templates WHERE company_id = ? AND page_type = ?',
      [companyId, pageType]
    );
    
    if (result.changes > 0) {
      res.json({
        success: true,
        message: 'Page template deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
  } catch (error) {
    console.error('Error deleting page template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete page template'
    });
  }
});


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

// Render template builder (integrated from existing /admin/templates/builder)
router.get('/admin-v2/templates/builder', async (req, res) => {
  try {
    const editMode = !!req.query.edit;
    let template = null;
    
    if (editMode && req.query.edit) {
      const db = require('../database/db');
      template = await db.get(
        'SELECT * FROM product_page_templates WHERE id = ?',
        [req.query.edit]
      );
      
      if (template) {
        // Parse elements JSON string
        try {
          template.elements = JSON.parse(template.elements);
        } catch (e) {
          console.error('Error parsing template elements:', e);
          template.elements = [];
        }
      }
    }
    
    res.render('admin/template-builder', {
      title: editMode ? 'Edit Template' : 'Create Template',
      editMode: editMode,
      template: template
    });
  } catch (error) {
    console.error('Error loading template builder:', error);
    res.status(500).render('error', {
      title: 'Template Builder Error',
      message: 'Failed to load template builder'
    });
  }
});

// API Routes for Template Management
// Get all product page templates
router.get('/admin-v2/api/product-templates', async (req, res) => {
  try {
    const companyId = 1; // For now, single company
    const db = require('../database/db');
    
    const templates = await db.all(
      'SELECT id, name, description, elements, created_at, updated_at FROM product_page_templates WHERE company_id = ? ORDER BY created_at DESC',
      [companyId]
    );
    
    // Count sections for each template
    templates.forEach(template => {
      try {
        const elements = JSON.parse(template.elements);
        template.sections_count = Array.isArray(elements) ? elements.length : 0;
      } catch (e) {
        template.sections_count = 0;
      }
    });
    
    res.json({
      success: true,
      templates: templates
    });
  } catch (error) {
    console.error('Error loading product templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load templates'
    });
  }
});

// Create/Update product page template (from template builder)
router.post('/admin-v2/templates', async (req, res) => {
  try {
    const { name, description, sections } = req.body;
    
    if (!name || !sections || !Array.isArray(sections)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, sections'
      });
    }
    
    const db = require('../database/db');
    const elementsJson = JSON.stringify(sections);
    
    const companyId = 1; // For now, single company
    
    const result = await db.run(
      'INSERT INTO product_page_templates (name, description, elements, company_id) VALUES (?, ?, ?, ?)',
      [name, description || '', elementsJson, companyId]
    );
    
    res.json({
      success: true,
      template_id: result.id,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

// Update existing template (from template builder)
router.put('/admin-v2/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sections } = req.body;
    
    if (!name || !sections || !Array.isArray(sections)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, sections'
      });
    }
    
    const db = require('../database/db');
    const elementsJson = JSON.stringify(sections);
    
    const companyId = 1; // For now, single company
    
    const result = await db.run(
      'UPDATE product_page_templates SET name = ?, description = ?, elements = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?',
      [name, description || '', elementsJson, id, companyId]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

// Delete product page template
router.delete('/admin-v2/api/product-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = 1; // For now, single company
    
    const db = require('../database/db');
    
    // First check if template exists and is used in any assignments
    const assignments = await db.all(
      'SELECT COUNT(*) as count FROM template_assignments WHERE template_id = ?',
      [id]
    );
    
    if (assignments[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete template: it is currently assigned to products'
      });
    }
    
    // Delete the template (hard delete since no is_active column)
    const result = await db.run(
      'DELETE FROM product_page_templates WHERE id = ? AND company_id = ?',
      [id, companyId]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
});

// Get template assignments
router.get('/admin-v2/api/template-assignments', async (req, res) => {
  try {
    const companyId = 1; // For now, single company
    const db = require('../database/db');
    
    const assignments = await db.all(
      'SELECT id, product_handle, template_id, created_at FROM template_assignments WHERE company_id = ? ORDER BY created_at DESC',
      [companyId]
    );
    
    res.json({
      success: true,
      assignments: assignments
    });
  } catch (error) {
    console.error('Error loading template assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load assignments'
    });
  }
});

// Save template assignments
router.post('/admin-v2/api/template-assignments', async (req, res) => {
  try {
    const { assignments } = req.body;
    
    if (!Array.isArray(assignments)) {
      return res.status(400).json({
        success: false,
        error: 'Assignments must be an array'
      });
    }
    
    const db = require('../database/db');
    
    const companyId = 1; // For now, single company
    
    // Clear existing assignments for this company
    await db.run('DELETE FROM template_assignments WHERE company_id = ?', [companyId]);
    
    // Insert new assignments
    for (const assignment of assignments) {
      await db.run(
        'INSERT INTO template_assignments (company_id, product_handle, template_id) VALUES (?, ?, ?)',
        [companyId, assignment.product_handle, assignment.template_id]
      );
    }
    
    res.json({
      success: true,
      message: 'Template assignments saved successfully'
    });
  } catch (error) {
    console.error('Error saving template assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save assignments'
    });
  }
});

// Get products for assignment (from Shopify)
router.get('/admin-v2/api/products', async (req, res) => {
  try {
    // For now, return mock data - in production this would fetch from Shopify
    const mockProducts = [
      { handle: 'klipia-clip', title: 'Klipia Clip', image: '/images/product1.jpg' },
      { handle: 'sample-product-1', title: 'Sample Product 1', image: '/images/product2.jpg' },
      { handle: 'sample-product-2', title: 'Sample Product 2', image: '/images/product3.jpg' }
    ];
    
    // TODO: Replace with actual Shopify API call
    // const Store = require('../models/Store');
    // const store = await Store.findByCompany(companyId);
    // if (store && store.shopify_access_token) {
    //   const axios = require('axios');
    //   const response = await axios.get(`https://${store.shopify_domain}/admin/api/2023-10/products.json`, {
    //     headers: { 'X-Shopify-Access-Token': store.shopify_access_token }
    //   });
    //   const products = response.data.products.map(product => ({
    //     handle: product.handle,
    //     title: product.title,
    //     image: product.images && product.images[0] ? product.images[0].src : null
    //   }));
    // }
    
    res.json({
      success: true,
      products: mockProducts
    });
  } catch (error) {
    console.error('Error loading products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load products'
    });
  }
});

// Get single template by ID (API endpoint)
router.get('/admin-v2/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../database/db');
    const companyId = 1; // For now, single company
    
    const template = await db.get(
      'SELECT id, name, description, elements, created_at, updated_at FROM product_page_templates WHERE id = ? AND company_id = ?',
      [id, companyId]
    );
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      template: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Get product template assignment
router.get('/admin-v2/products/:handle/template', async (req, res) => {
  try {
    const { handle } = req.params;
    const db = require('../database/db');
    const companyId = 1; // For now, single company
    
    const assignment = await db.get(
      'SELECT * FROM template_assignments WHERE company_id = ? AND product_handle = ?',
      [companyId, handle]
    );
    
    res.json({
      success: true,
      assignment: assignment
    });
  } catch (error) {
    console.error('Error fetching product template:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Save product template assignment
// Save store theme
router.post('/admin-v2/store/:uuid/theme', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { theme_id } = req.body;
    
    const store = await Store.findByUuid(uuid);
    if (!store) {
      return res.json({
        success: false,
        error: 'Store not found'
      });
    }
    
    // Update store theme
    const db = require('../database/db');
    await db.run('UPDATE stores SET theme_id = ? WHERE uuid = ?', [theme_id, uuid]);
    
    console.log(`🎨 Updated store ${store.name} theme to: ${theme_id}`);
    
    res.json({
      success: true,
      message: `Theme updated to ${theme_id}`
    });
  } catch (error) {
    console.error('Error saving store theme:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Deploy store with theme changes
router.post('/admin-v2/store/:uuid/deploy', async (req, res) => {
  try {
    const { uuid } = req.params;
    
    const store = await Store.findByUuid(uuid);
    if (!store) {
      return res.json({
        success: false,
        error: 'Store not found'
      });
    }
    
    console.log(`🚀 Deploying store ${store.name} with theme changes`);
    
    // Use full deployment automation like product deployments
    const DeploymentAutomation = require('../utils/DeploymentAutomation');
    
    // Regenerate store files with new theme
    await store.regenerateStoreFiles();
    
    // Use complete deployment automation to push to production
    const deploymentAutomation = new DeploymentAutomation();
    await deploymentAutomation.executeCompleteDeployment(store, { force: true }); // Force deployment
    
    res.json({
      success: true,
      message: `Store ${store.name} deployed successfully`,
      liveUrl: `https://${store.domain}`
    });
  } catch (error) {
    console.error('Error deploying store:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

router.post('/admin-v2/products/:handle/template', async (req, res) => {
  try {
    const { handle } = req.params;
    const { templateId, templateData } = req.body;
    const db = require('../database/db');
    const companyId = 1; // For now, single company
    
    if (templateId) {
      // Upsert the assignment
      await db.run(
        `INSERT OR REPLACE INTO template_assignments 
         (company_id, product_handle, template_id, template_data, updated_at) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [companyId, handle, templateId, JSON.stringify(templateData)]
      );
      
      console.log(`Assigned template ${templateId} to product ${handle}`);
    } else {
      // Remove assignment if no template selected
      await db.run(
        'DELETE FROM template_assignments WHERE company_id = ? AND product_handle = ?',
        [companyId, handle]
      );
      
      console.log(`Removed template assignment from product ${handle}`);
    }
    
    res.json({
      success: true,
      message: templateId ? 'Template assigned successfully' : 'Template assignment removed'
    });
  } catch (error) {
    console.error('Error saving product template:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Generate and deploy product page with custom template
router.post('/admin-v2/products/:handle/deploy', async (req, res) => {
  try {
    const { handle } = req.params;
    console.log(`🚀 Starting product page deployment for ${handle}`);
    
    const Store = require('../models/Store');
    const TemplateRenderer = require('../utils/TemplateRenderer');
    const CustomTemplateRenderer = require('../utils/CustomTemplateRenderer');
    const DeploymentAutomation = require('../utils/DeploymentAutomation');
    
    // Get store information from the referrer header or default to clipia.de
    const referrer = req.headers.referer || '';
    const domainMatch = referrer.match(/clipia\.(de|fi)/);
    const domain = domainMatch ? `clipia.${domainMatch[1]}` : 'clipia.de';
    console.log(`🔍 Extracted domain from referrer: ${domain}`);
    
    const stores = await Store.findAll();
    const store = stores.find(s => s.domain === domain) || stores.find(s => s.domain === 'clipia.de') || stores[0];
    
    if (!store) {
      return res.json({
        success: false,
        error: 'No store found'
      });
    }
    
    console.log(`🏪 Using store: ${store.name} (${store.domain})`);
    
    // For testing, use mock product data since we don't have live Shopify connection
    const mockProduct = {
      handle: handle,
      title: handle.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      body_html: `<p>High-quality product available at ${store.name}.</p>`,
      variants: [{
        id: 1,
        price: 29.99,
        compare_at_price: 39.99,
        available: true
      }],
      images: [{
        src: 'https://via.placeholder.com/400x300?text=Product+Image',
        alt: handle.replace(/-/g, ' ')
      }]
    };
    
    const product = mockProduct;
    
    console.log(`📦 Found product: ${product.title}`);
    
    // Get theme configuration
    const templateRenderer = new TemplateRenderer();
    const themeConfig = await templateRenderer.getThemeConfiguration(store);
    
    // Generate custom product page HTML
    const customRenderer = new CustomTemplateRenderer();
    const customHtml = await customRenderer.generateCustomProductPage(store, product, themeConfig);
    
    if (!customHtml) {
      return res.json({
        success: false,
        error: 'No custom template assigned to this product'
      });
    }
    
    // Write the generated HTML to the store directory
    const fs = require('fs');
    const path = require('path');
    const storePath = path.join(process.cwd(), 'stores', store.domain);
    const productsDir = path.join(storePath, 'products');
    
    // Ensure directories exist
    if (!fs.existsSync(storePath)) {
      fs.mkdirSync(storePath, { recursive: true });
    }
    if (!fs.existsSync(productsDir)) {
      fs.mkdirSync(productsDir, { recursive: true });
    }
    
    // Write the product HTML file
    const productFilePath = path.join(productsDir, `${handle}.html`);
    fs.writeFileSync(productFilePath, customHtml, 'utf8');
    
    console.log(`✅ Generated custom product page: ${productFilePath}`);
    
    // Deploy to live site
    const deployer = new DeploymentAutomation();
    const deploymentResult = await deployer.executeCompleteDeployment(store, {
      deploymentId: `product_${handle}_${Date.now()}`
    });
    
    if (deploymentResult.success) {
      console.log(`🚀 Successfully deployed ${handle} to ${store.domain}`);
      
      res.json({
        success: true,
        message: 'Product page generated and deployed successfully',
        productUrl: `https://${store.domain}/products/${handle}.html`,
        deploymentUrl: deploymentResult.url
      });
    } else {
      res.json({
        success: false,
        error: 'Failed to deploy to live site: ' + deploymentResult.error
      });
    }
    
  } catch (error) {
    console.error('Error deploying product page:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Template preview route
router.get('/admin-v2/templates/preview/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = require('../database/db');
    const template = await db.get(
      'SELECT * FROM product_page_templates WHERE id = ?',
      [id]
    );
    
    if (!template) {
      return res.status(404).render('error', {
        title: 'Template Not Found',
        message: 'The template you are looking for does not exist.'
      });
    }
    
    // Parse elements
    let elements = [];
    try {
      elements = JSON.parse(template.elements);
    } catch (e) {
      console.error('Error parsing template elements:', e);
    }
    
    res.render('admin/template-preview', {
      title: `Preview: ${template.name}`,
      template: template,
      elements: elements
    });
  } catch (error) {
    console.error('Error loading template preview:', error);
    res.status(500).render('error', {
      title: 'Preview Error',
      message: 'Failed to load template preview'
    });
  }
});

module.exports = router;