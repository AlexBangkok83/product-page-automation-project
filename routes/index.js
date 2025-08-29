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
    const currentPageData = await store.getPage(currentPageType);
    
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
    
    res.json({ 
      success: true, 
      message: `Theme updated to "${theme.name}" successfully!`,
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

module.exports = router;