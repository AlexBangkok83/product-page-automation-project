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
          
          // Create store with COMPLETE deployment automation
          console.log('🚀 EXECUTING COMPLETE AUTOMATION PIPELINE');
          console.log('📋 Pipeline: Database → Files → Git → Vercel → Live Domain');
          
          // Create store first
          const store = await Store.create(storeData);
          
          // Then deploy it
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

// Product Template Builder
router.get('/admin/product-template', (req, res) => {
  res.render('admin/product-template', { 
    title: 'Product Template Builder'
  });
});

// Agent system works in Claude Code - no web dashboard needed

// Company Profile - Manage Shopify stores
router.get('/admin/company-profile', (req, res) => {
  res.render('admin/company-profile', { 
    title: 'Company Profile - Manage Shopify Stores'
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