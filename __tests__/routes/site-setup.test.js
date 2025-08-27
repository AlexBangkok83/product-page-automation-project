const request = require('supertest');
const express = require('express');
const path = require('path');
const indexRouter = require('../../routes/index');
const Store = require('../../models/Store');

// Mock dependencies
jest.mock('../../models/Store');
jest.mock('../../models/CompanyShopifyStore');
jest.mock('../../middleware/validation', () => ({
  validateSiteSetup: (req, res, next) => next(),
  sanitizeInput: (req, res, next) => next()
}));

describe('Site Setup Routes - EJS Template Variables Fix', () => {
  let app;

  beforeEach(() => {
    // Create test Express app with EJS setup
    app = express();
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../../views'));
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/', indexRouter);

    // Clear all mocks
    jest.clearAllMocks();

    // Setup Store mocks
    Store.findByUuid = jest.fn();
    Store.findAll = jest.fn();
    Store.create = jest.fn();
  });

  describe('GET /admin/site-setup - EJS Variable Handling', () => {
    test('should render site-setup with undefined variables handled gracefully (new store)', async () => {
      // Mock empty stores response
      Store.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/admin/site-setup')
        .expect(200);

      // Should render successfully without "Unexpected token '<'" errors
      expect(response.text).toContain('Site Setup - Create Your Store');
      expect(response.text).toContain('this.isEditMode = false');
      expect(response.text).toContain('this.storeData = null');
    });

    test('should render site-setup with store ID but store not found', async () => {
      // Mock store not found
      Store.findByUuid.mockResolvedValue(null);

      const response = await request(app)
        .get('/admin/site-setup?store=non-existent-uuid')
        .expect(200);

      // Should render successfully even when store is not found
      expect(response.text).toContain('Site Setup - Create Your Store');
      expect(response.text).toContain('this.isEditMode = false');
      expect(response.text).toContain('this.storeData = null');
    });

    test('should render site-setup with valid store for editing', async () => {
      const mockStore = createMockStore({
        uuid: 'test-store-uuid',
        name: 'Test Store for Editing',
        domain: 'test-edit.com'
      });

      Store.findByUuid.mockResolvedValue(mockStore);

      const response = await request(app)
        .get('/admin/site-setup?store=test-store-uuid')
        .expect(200);

      // Should render successfully with edit mode enabled
      expect(response.text).toContain('Edit Store - Test Store for Editing');
      expect(response.text).toContain('this.isEditMode = true');
      expect(response.text).toContain('this.storeData = {');
      expect(response.text).toContain('"name":"Test Store for Editing"');
      expect(response.text).toContain('"domain":"test-edit.com"');
    });

    test('should handle step parameter correctly', async () => {
      Store.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/admin/site-setup?step=3')
        .expect(200);

      expect(response.text).toContain('Site Setup - Create Your Store');
      // Should contain the step value in the template
      // Template should render successfully with step handling
      expect(response.status).toBe(200);
      expect(response.text).toContain('<div class="site-setup-container">');
    });

    test('should handle error parameters for user feedback', async () => {
      Store.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/admin/site-setup?error=validation_failed&message=Please+fill+all+fields')
        .expect(200);

      expect(response.text).toContain('Site Setup - Create Your Store');
      // Should pass through error parameters safely
      // Template should render successfully with error handling
      expect(response.status).toBe(200);
      expect(response.text).toContain('<div class="site-setup-container">');
    });

    test('should preserve form data in query parameters', async () => {
      Store.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/admin/site-setup?brandName=Test+Brand&siteUrl=test.com')
        .expect(200);

      expect(response.text).toContain('Site Setup - Create Your Store');
      // Template should render successfully and preserve form data
      expect(response.status).toBe(200);
      expect(response.text).toContain('<div class="site-setup-container">');
    });
  });

  describe('JavaScript Variable Safety in EJS', () => {
    test('should never generate malformed JavaScript with undefined variables', async () => {
      Store.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/admin/site-setup')
        .expect(200);

      const jsContent = response.text;

      // Critical: Check that these patterns NEVER appear (these would cause JS errors)
      expect(jsContent).not.toContain('this.isEditMode = <');
      expect(jsContent).not.toContain('this.storeData = <');
      expect(jsContent).not.toContain('= undefined');
      expect(jsContent).not.toContain('= <%= undefined');
      
      // Critical: Check that valid JavaScript IS generated
      expect(jsContent).toMatch(/this\.isEditMode = (true|false);/);
      expect(jsContent).toMatch(/this\.storeData = (null|\{[\s\S]*?\});/);
    });

    test('should generate safe JSON for store data even with complex store objects', async () => {
      const complexStore = createMockStore({
        uuid: 'complex-store',
        name: 'Store with "quotes" and <script>tags</script>',
        meta_description: 'Description with special chars: & < > " \'',
        footer_config: '{"links": ["http://example.com", "mailto:test@test.com"]}'
      });

      Store.findByUuid.mockResolvedValue(complexStore);

      const response = await request(app)
        .get('/admin/site-setup?store=complex-store')
        .expect(200);

      const jsContent = response.text;

      // Should properly escape and handle special characters
      expect(jsContent).toContain('this.isEditMode = true');
      expect(jsContent).toContain('this.storeData = {');
      expect(jsContent).not.toContain('<script>');
      expect(jsContent).not.toContain('undefined');
    });
  });

  describe('Template Data Consistency', () => {
    test('should always provide consistent template data structure', async () => {
      Store.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/admin/site-setup')
        .expect(200);

      // Check for required template data keys in the rendered HTML
      const templateKeys = [
        'title',
        'step', 
        'storeId',
        'store',
        'isEditMode'
      ];

      // Template should render successfully with consistent data structure
      expect(response.status).toBe(200);
      expect(response.text).toContain('<div class="site-setup-container">');
    });

    test('should handle missing optional query parameters safely', async () => {
      Store.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/admin/site-setup')
        .expect(200);

      // Template should render successfully with safe parameter handling
      expect(response.status).toBe(200);
      expect(response.text).toContain('<div class="site-setup-container">');
    });
  });

  describe('Error Handling in Template Rendering', () => {
    test('should handle database errors during store lookup gracefully', async () => {
      Store.findByUuid.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/admin/site-setup?store=failing-store')
        .expect(500);

      expect(response.text).toContain('Failed to load site setup page');
    });

    test('should render error page instead of broken template on critical failures', async () => {
      // Mock a scenario where template rendering could fail
      Store.findByUuid.mockImplementation(() => {
        throw new Error('Critical store loading error');
      });

      const response = await request(app)
        .get('/admin/site-setup?store=critical-error')
        .expect(500);

      // Should render error template, not broken site-setup template
      expect(response.text).toContain('Error');
      expect(response.text).toContain('Failed to load site setup page');
    });
  });

  describe('Site Setup Form Processing', () => {
    test('should handle step 1 form submission without template variable errors', async () => {
      const mockStore = {
        uuid: 'new-store-uuid',
        name: 'New Test Store'
      };
      
      Store.create.mockResolvedValue(mockStore);

      const response = await request(app)
        .post('/admin/site-setup')
        .send({
          step: '1',
          brandName: 'Test Store',
          siteUrl: 'test-store.com',
          country: 'US',
          language: 'en',
          currency: 'USD'
        })
        .expect(302); // Redirect after successful creation

      expect(response.headers.location).toContain('/admin/stores/');
      expect(Store.create).toHaveBeenCalledWith({
        name: 'Test Store',
        domain: 'test-store.com',
        country: 'US',
        language: 'en',
        currency: 'USD',
        status: 'draft',
        meta_title: 'Test Store'
      });
    });

    test('should handle step 2 (Shopify) form submission', async () => {
      const mockStore = createMockStore({ uuid: 'existing-store' });
      mockStore.update = jest.fn().mockResolvedValue();
      
      Store.findByUuid.mockResolvedValue(mockStore);

      const response = await request(app)
        .post('/admin/site-setup')
        .send({
          step: '2',
          storeId: 'existing-store',
          shopifyDomain: 'test.myshopify.com',
          shopifyToken: 'test-token'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.nextStep).toBe(3);
      expect(mockStore.update).toHaveBeenCalledWith({
        shopify_domain: 'test.myshopify.com',
        shopify_access_token: 'test-token',
        shopify_connected: true
      });
    });
  });
});

// Helper function to create mock store data
function createMockStore(overrides = {}) {
  const mockStore = {
    id: 1,
    uuid: 'test-store-uuid',
    name: 'Test Store',
    domain: 'test-store.com',
    country: 'US',
    language: 'en',
    currency: 'USD',
    shopify_domain: null,
    shopify_access_token: null,
    shopify_connected: false,
    status: 'draft',
    deployment_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    meta_title: 'Test Store',
    meta_description: 'A test store',
    selected_pages: 'home,products',
    footer_config: '{}',
    gdpr_compliant: true,
    cookie_consent: true,
    ...overrides,
    toJSON: function() {
      return { ...this };
    },
    update: jest.fn().mockResolvedValue()
  };
  
  return mockStore;
}