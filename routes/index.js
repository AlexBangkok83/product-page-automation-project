const express = require('express');
const Store = require('../models/Store');
const CompanyShopifyStore = require('../models/CompanyShopifyStore');
const { validateSiteSetup, sanitizeInput } = require('../middleware/validation');
const { getAgentSystem } = require('../agent-automation-system');
const router = express.Router();

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Initialize agent system for all requests
router.use((req, res, next) => {
  // Auto-deploy agents for any technical work detected
  if (req.method === 'POST' && req.path.includes('site-setup')) {
    // Deploy agents for site setup work
    const agentSystem = getAgentSystem();
    agentSystem.autoDeployAgents('Site setup and store creation workflow', {
      type: 'store-creation',
      method: req.method,
      path: req.path
    }).catch(err => console.warn('Auto-agent deployment failed:', err));
  }
  next();
});

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
      activeStores: stores.filter(s => s.status === 'active').length
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Failed to load dashboard'
    });
  }
});

// Site Setup - Multi-step store creation wizard
router.get('/admin/site-setup', async (req, res) => {
  try {
    const step = req.query.step || '1';
    const storeId = req.query.store;
    let store = null;
    
    // If store ID is provided, fetch store data
    if (storeId) {
      store = await Store.findByUuid(storeId);
    }
    
    res.render('admin/site-setup', { 
      title: 'Site Setup - Create Your Store',
      step: step,
      storeId: storeId,
      store: store,
      // Error handling
      error: req.query.error,
      message: req.query.message,
      // Preserve form data
      siteUrl: req.query.siteUrl,
      brandName: req.query.brandName,
      shopifyDomain: req.query.shopifyDomain,
      shippingPolicy: req.query.shippingPolicy,
      returnPolicy: req.query.returnPolicy
    });
  } catch (error) {
    console.error('Site setup page error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Failed to load site setup page'
    });
  }
});

// Site Setup form processing
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
    
    if (step === 'create-store') {
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
        } catch (error) {
          console.warn('⚠️ Failed to save new Shopify store to company profile:', error.message);
          // Don't fail the entire process if company store creation fails
        }
      }

      // Create new store with form data
      const storeData = {
        name: req.body.brandName || req.body.storeName,
        domain: req.body.siteUrl || req.body.domain,
        country: req.body.country || 'US',
        language: req.body.language || 'en',
        currency: req.body.currency || 'USD',
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
      const store = await Store.create(storeData);
      console.log('✅ Store created successfully:', store.uuid);
      
      // Redirect to success page
      res.redirect(`/admin/site-setup?step=5&store=${store.uuid}&success=true`);
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

// Product Template Builder
router.get('/admin/product-template', (req, res) => {
  res.render('admin/product-template', { 
    title: 'Product Template Builder'
  });
});

// Agent Dashboard - Real-time agent monitoring and control
router.get('/admin/agents', async (req, res) => {
  try {
    const agentSystem = getAgentSystem();
    const dashboardData = {
      activeAgents: agentSystem.getActiveAgents(),
      taskProgress: agentSystem.getAllTasksProgress(),
      agentRegistry: agentSystem.getAgentRegistry(),
      systemStatus: {
        isRunning: agentSystem.isRunning,
        totalAgents: agentSystem.agentRegistry.size,
        activeTasks: agentSystem.progressTracker.size
      }
    };
    
    res.render('agent-dashboard', {
      title: 'Agent Automation Dashboard',
      dashboardData: dashboardData
    });
  } catch (error) {
    console.error('Agent dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load agent dashboard'
    });
  }
});

// Company Profile - Manage Shopify stores
router.get('/admin/company-profile', (req, res) => {
  res.render('admin/company-profile', { 
    title: 'Company Profile - Manage Shopify Stores'
  });
});

// Deploy agents for specific task (API endpoint)
router.post('/admin/agents/deploy', async (req, res) => {
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
      coordination: deployment.coordination
    });
  } catch (error) {
    console.error('Agent deployment error:', error);
    res.status(500).json({
      error: 'Failed to deploy agents',
      message: error.message
    });
  }
});

// Store management - View/edit individual store
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

module.exports = router;