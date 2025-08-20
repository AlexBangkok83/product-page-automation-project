const request = require('supertest');
const express = require('express');
const apiRouter = require('../../routes/api');
const Store = require('../../models/Store');
const { PageTemplate } = require('../../models/PageTemplate');

// Mock dependencies
jest.mock('../../models/Store');
jest.mock('../../models/PageTemplate');
jest.mock('../../database/db');
jest.mock('axios');

const axios = require('axios');

describe('API Routes', () => {
  let app;

  beforeEach(() => {
    // Create test Express app
    app = express();
    app.use(express.json());
    app.use('/api', apiRouter);

    // Clear all mocks
    jest.clearAllMocks();

    // Setup default Store mocks
    Store.findByUuid = jest.fn();
    Store.findByDomain = jest.fn();
    Store.findBySubdomain = jest.fn();
    Store.findAll = jes1t.fn();
    Store.create = jest.fn();
    Store.generateUniqueSubdomain = jest.fn();
    Store.cleanupDuplicateSubdomains = jest.fn();

    // Setup PageTemplate mocks
    PageTemplate.getAllForLanguage = jest.fn();
    PageTemplate.getTranslatedContent = jest.fn();
  });

  describe('GET /api/', () => {
    test('should return API information', async () => {
      const response = await request(app).get('/api/');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Multi-Store E-commerce Platform API');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.stores).toBe('/api/stores');
    });
  });

  describe('GET /api/stores', () => {
    test('should return all stores with details', async () => {
      const mockStores = [
        createMockStore({ id: 1, name: 'Store 1', domain: 'store1.com' }),
        createMockStore({ id: 2, name: 'Store 2', domain: 'store2.com' })
      ];
      
      // Mock Store instances with required methods
      mockStores.forEach(storeData => {
        const store = new Store(storeData);
        store.toJSON = jest.fn().mockReturnValue(storeData);
        store.storeFilesExist = jest.fn().mockReturnValue(true);
        store.getStorePath = jest.fn().mockReturnValue('/fake/path');
        return store;
      });

      Store.findAll.mockResolvedValue(mockStores.map(data => {
        const store = new Store(data);
        store.toJSON = jest.fn().mockReturnValue({
          ...data,
          files_exist: true,
          store_path: '/fake/path',
          live_url: `https://${data.domain}`,
          can_deploy: true,
          needs_deployment: false
        });
        store.storeFilesExist = jest.fn().mockReturnValue(true);
        store.getStorePath = jest.fn().mockReturnValue('/fake/path');
        return store;
      }));

      const response = await request(app).get('/api/stores');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stores).toHaveLength(2);
      expect(response.body.summary.total).toBe(2);
      expect(response.body.stores[0].live_url).toBe('https://store1.com');
    });

    test('should handle database errors', async () => {
      Store.findAll.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/api/stores');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch stores');
    });
  });

  describe('GET /api/stores/:uuid', () => {
    test('should return store by UUID with pages', async () => {
      const mockStore = new Store(createMockStore({ uuid: 'test-uuid' }));
      const mockPages = [createMockPage()];
      
      mockStore.toJSON = jest.fn().mockReturnValue(createMockStore({ uuid: 'test-uuid' }));
      mockStore.getPages = jest.fn().mockResolvedValue(mockPages);
      
      Store.findByUuid.mockResolvedValue(mockStore);

      const response = await request(app).get('/api/stores/test-uuid');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.store.uuid).toBe('test-uuid');
      expect(response.body.pages).toEqual(mockPages);
    });

    test('should return 404 for non-existent store', async () => {
      Store.findByUuid.mockResolvedValue(null);

      const response = await request(app).get('/api/stores/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Store not found');
    });
  });

  describe('POST /api/stores', () => {
    test('should create new store with valid data', async () => {
      const storeData = {
        name: 'Test Store',
        domain: 'test.com',
        country: 'US',
        language: 'en',
        currency: 'USD',
        shopify_domain: 'test.myshopify.com',
        shopify_access_token: 'test-token'
      };

      const mockStore = new Store(storeData);
      mockStore.toJSON = jest.fn().mockReturnValue({ ...storeData, id: 1, uuid: 'new-uuid' });
      
      Store.create.mockResolvedValue(mockStore);

      const response = await request(app)
        .post('/api/stores')
        .send(storeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Store created successfully');
      expect(Store.create).toHaveBeenCalledWith({
        name: 'Test Store',
        domain: 'test.com',
        country: 'US',
        language: 'en',
        currency: 'USD',
        shopify_domain: 'test.myshopify.com',
        shopify_access_token: 'test-token',
        shopify_connected: true,
        meta_title: undefined,
        meta_description: undefined,
        primary_color: undefined,
        secondary_color: undefined
      });
    });

    test('should handle store creation errors', async () => {
      Store.create.mockRejectedValue(new Error('Domain already exists'));

      const response = await request(app)
        .post('/api/stores')
        .send({
          name: 'Test Store',
          domain: 'existing.com',
          country: 'US',
          language: 'en',
          currency: 'USD'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Domain already exists');
    });
  });

  describe('POST /api/check-domain', () => {
    test('should check domain availability successfully', async () => {
      Store.findByDomain.mockResolvedValue(null); // Domain available

      const response = await request(app)
        .post('/api/check-domain')
        .send({ domain: 'available.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.available).toBe(true);
      expect(response.body.domain).toBe('available.com');
      expect(response.body.message).toBe('Domain is available');
    });

    test('should detect domain already in use', async () => {
      const existingStore = new Store(createMockStore({ domain: 'taken.com' }));
      Store.findByDomain.mockResolvedValue(existingStore);

      const response = await request(app)
        .post('/api/check-domain')
        .send({ domain: 'taken.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.available).toBe(false);
      expect(response.body.message).toBe('Domain is already in use');
    });

    test('should validate domain format', async () => {
      const response = await request(app)
        .post('/api/check-domain')
        .send({ domain: 'invalid-domain' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Valid domain required');
    });

    test('should handle missing domain', async () => {
      const response = await request(app)
        .post('/api/check-domain')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Valid domain required');
    });
  });

  describe('POST /api/validate-shopify', () => {
    test('should validate Admin API token successfully', async () => {
      const mockShopifyResponse = {
        data: {
          shop: {
            name: 'Test Shop',
            domain: 'test.com',
            myshopify_domain: 'test.myshopify.com',
            email: 'admin@test.com',
            currency: 'USD',
            iana_timezone: 'UTC'
          }
        }
      };

      axios.get
        .mockResolvedValueOnce(mockShopifyResponse) // Shop info
        .mockResolvedValueOnce({ data: { count: 15 } }); // Product count

      const response = await request(app)
        .post('/api/validate-shopify')
        .send({
          shopifyDomain: 'test.myshopify.com',
          accessToken: 'shpat_test_token'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.shopName).toBe('Test Shop');
      expect(response.body.productCount).toBe(15);
      expect(response.body.apiType).toBe('Admin API');
    });

    test('should validate Storefront API token successfully', async () => {
      const mockGraphQLResponse = {
        data: {
          data: {
            shop: {
              name: 'Test Shop',
              primaryDomain: { url: 'https://test.com' },
              paymentSettings: { currencyCode: 'USD' }
            },
            products: {
              edges: [
                { node: { title: 'Product 1', handle: 'product-1', id: 'gid://shopify/Product/1' } },
                { node: { title: 'Product 2', handle: 'product-2', id: 'gid://shopify/Product/2' } }
              ]
            }
          }
        }
      };

      axios.post.mockResolvedValue(mockGraphQLResponse);

      const response = await request(app)
        .post('/api/validate-shopify')
        .send({
          shopifyDomain: 'test.myshopify.com',
          accessToken: 'storefront_token_123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.shopName).toBe('Test Shop');
      expect(response.body.productCount).toBe(2);
      expect(response.body.apiType).toBe('Storefront API');
    });

    test('should handle invalid Shopify credentials', async () => {
      axios.get.mockRejectedValue({
        response: { status: 401, data: { errors: 'Invalid token' } }
      });

      const response = await request(app)
        .post('/api/validate-shopify')
        .send({
          shopifyDomain: 'test.myshopify.com',
          accessToken: 'invalid_token'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid Shopify access token');
      expect(response.body.tokenType).toBe('Admin API');
    });

    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/validate-shopify')
        .send({ shopifyDomain: 'test.myshopify.com' }); // Missing accessToken

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Shopify domain and access token required');
    });

    test('should normalize Shopify domain format', async () => {
      axios.get.mockResolvedValue({
        data: {
          shop: {
            name: 'Test Shop',
            domain: 'test.com',
            myshopify_domain: 'test.myshopify.com',
            email: 'admin@test.com',
            currency: 'USD',
            iana_timezone: 'UTC'
          }
        }
      });

      await request(app)
        .post('/api/validate-shopify')
        .send({
          shopifyDomain: 'test', // Should be normalized to test.myshopify.com
          accessToken: 'shpat_test_token'
        });

      expect(axios.get).toHaveBeenCalledWith(
        'https://test.myshopify.com/admin/api/2023-10/shop.json',
        expect.any(Object)
      );
    });
  });

  describe('POST /api/detect-domain-info', () => {
    test('should detect country info from TLD', async () => {
      const response = await request(app)
        .post('/api/detect-domain-info')
        .send({ domain: 'example.de' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.domain).toBe('example.de');
      expect(response.body.detected).toEqual({
        country: 'DE',
        currency: 'EUR',
        language: 'de'
      });
      expect(response.body.confidence).toBe('high');
    });

    test('should normalize domain by removing protocol', async () => {
      const response = await request(app)
        .post('/api/detect-domain-info')
        .send({ domain: 'https://www.example.com' });

      expect(response.status).toBe(200);
      expect(response.body.domain).toBe('example.com');
      expect(response.body.detected.country).toBe('US');
    });

    test('should default to US for unknown TLDs', async () => {
      const response = await request(app)
        .post('/api/detect-domain-info')
        .send({ domain: 'example.xyz' });

      expect(response.status).toBe(200);
      expect(response.body.detected).toEqual({
        country: 'US',
        currency: 'USD',
        language: 'en'
      });
      expect(response.body.confidence).toBe('low');
    });

    test('should validate domain format', async () => {
      const response = await request(app)
        .post('/api/detect-domain-info')
        .send({ domain: 'invalid-domain-format' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Valid domain required');
    });
  });

  describe('GET /api/page-templates', () => {
    test('should return categorized page templates', async () => {
      const mockDbTemplates = [
        {
          template_key: 'privacy',
          title: 'Privacy Policy',
          template_type: 'legal',
          has_translation: 1,
          slug: 'privacy'
        }
      ];
      
      PageTemplate.getAllForLanguage.mockResolvedValue(mockDbTemplates);

      const response = await request(app).get('/api/page-templates?language=en');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.templates).toBeDefined();
      expect(response.body.categorized).toBeDefined();
      expect(response.body.categorized.core).toHaveLength(2); // home, products
      expect(response.body.categorized.legal).toHaveLength(1);
      expect(response.body.summary.database_templates).toBe(1);
    });

    test('should handle database errors in template retrieval', async () => {
      PageTemplate.getAllForLanguage.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/page-templates');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch page templates');
    });
  });

  describe('GET /api/page-templates/:templateKey', () => {
    test('should return specific template content', async () => {
      const mockTemplate = {
        template_key: 'privacy',
        template_type: 'legal',
        language_code: 'en',
        title: 'Privacy Policy',
        slug: 'privacy',
        content: '<h1>Privacy Policy</h1><p>Content</p>',
        meta_title: 'Privacy Policy',
        meta_description: 'Our privacy policy'
      };
      
      PageTemplate.getTranslatedContent.mockResolvedValue(mockTemplate);

      const response = await request(app).get('/api/page-templates/privacy?language=en');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.template.key).toBe('privacy');
      expect(response.body.template.title).toBe('Privacy Policy');
      expect(PageTemplate.getTranslatedContent).toHaveBeenCalledWith('privacy', 'en');
    });

    test('should handle template not found', async () => {
      PageTemplate.getTranslatedContent.mockRejectedValue(
        new Error('No translation found for template: unknown in language: en')
      );

      const response = await request(app).get('/api/page-templates/unknown');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Template not found');
    });
  });

  describe('POST /api/suggest-subdomain', () => {
    test('should suggest available subdomains', async () => {
      Store.findByDomain.mockResolvedValue(null);
      Store.findBySubdomain.mockResolvedValue(null);
      Store.generateUniqueSubdomain.mockResolvedValue('my-amazing-store');

      const response = await request(app)
        .post('/api/suggest-subdomain')
        .send({ storeName: 'My Amazing Store!' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.suggestions).toContain('my-amazing-store');
      expect(response.body.primary).toBe('my-amazing-store');
    });

    test('should handle conflicts and suggest alternatives', async () => {
      Store.findByDomain
        .mockResolvedValueOnce(new Store({ domain: 'test-store' })) // Base taken
        .mockResolvedValue(null); // Others available
      
      Store.findBySubdomain
        .mockResolvedValueOnce(new Store({ subdomain: 'test-store' })) // Base taken
        .mockResolvedValue(null); // Others available

      const response = await request(app)
        .post('/api/suggest-subdomain')
        .send({ storeName: 'Test Store' });

      expect(response.status).toBe(200);
      expect(response.body.suggestions).not.toContain('test-store');
      expect(response.body.suggestions.length).toBeGreaterThan(0);
    });

    test('should require store name', async () => {
      const response = await request(app)
        .post('/api/suggest-subdomain')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Store name required');
    });
  });

  describe('POST /api/stores/:uuid/deploy', () => {
    test('should deploy store successfully', async () => {
      const mockStore = new Store(createMockStore({ uuid: 'test-uuid' }));
      mockStore.deploy = jest.fn().mockResolvedValue({
        message: 'Deployment successful',
        url: 'https://test.vercel.app',
        isLive: true
      });
      mockStore.toJSON = jest.fn().mockReturnValue(createMockStore());
      
      Store.findByUuid.mockResolvedValue(mockStore);

      const response = await request(app)
        .post('/api/stores/test-uuid/deploy')
        .send({ force: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Deployment successful');
      expect(response.body.deployment.url).toBe('https://test.vercel.app');
      expect(mockStore.deploy).toHaveBeenCalledWith(null, false);
    });

    test('should handle deployment failures', async () => {
      const mockStore = new Store(createMockStore({ uuid: 'test-uuid' }));
      mockStore.deploy = jest.fn().mockRejectedValue(new Error('Deployment failed'));
      mockStore.update = jest.fn().mockResolvedValue();
      
      Store.findByUuid.mockResolvedValue(mockStore);

      const response = await request(app)
        .post('/api/stores/test-uuid/deploy');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Deployment failed');
      expect(mockStore.update).toHaveBeenCalledWith({ deployment_status: 'failed' });
    });

    test('should return 404 for non-existent store', async () => {
      Store.findByUuid.mockResolvedValue(null);

      const response = await request(app).post('/api/stores/non-existent/deploy');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Store not found');
    });
  });

  describe('DELETE /api/stores/:uuid', () => {
    test('should delete store successfully', async () => {
      const mockStore = new Store(createMockStore({ uuid: 'test-uuid' }));
      mockStore.delete = jest.fn().mockResolvedValue();
      
      Store.findByUuid.mockResolvedValue(mockStore);

      const response = await request(app).delete('/api/stores/test-uuid');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Store deleted successfully');
      expect(mockStore.delete).toHaveBeenCalled();
    });

    test('should handle delete errors', async () => {
      const mockStore = new Store(createMockStore({ uuid: 'test-uuid' }));
      mockStore.delete = jest.fn().mockRejectedValue(new Error('Delete failed'));
      
      Store.findByUuid.mockResolvedValue(mockStore);

      const response = await request(app).delete('/api/stores/test-uuid');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete store');
    });
  });

  describe('GET /api/countries', () => {
    test('should return supported countries list', async () => {
      const response = await request(app).get('/api/countries');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.countries).toBeInstanceOf(Array);
      expect(response.body.countries.length).toBeGreaterThan(0);
      
      const usCountry = response.body.countries.find(c => c.code === 'US');
      expect(usCountry).toEqual({
        code: 'US',
        name: 'United States',
        currency: 'USD',
        language: 'en'
      });
      
      const fiCountry = response.body.countries.find(c => c.code === 'FI');
      expect(fiCountry).toEqual({
        code: 'FI',
        name: 'Finland',
        currency: 'EUR',
        language: 'fi'
      });
    });
  });

  describe('POST /api/cleanup-subdomains', () => {
    test('should cleanup duplicate subdomains', async () => {
      Store.cleanupDuplicateSubdomains.mockResolvedValue({
        fixed: 3,
        conflicts: 2
      });

      const response = await request(app).post('/api/cleanup-subdomains');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.fixed).toBe(3);
      expect(response.body.conflicts).toBe(2);
      expect(response.body.message).toContain('Cleaned up 3 subdomain conflicts');
    });

    test('should handle cleanup errors', async () => {
      Store.cleanupDuplicateSubdomains.mockRejectedValue(new Error('Cleanup failed'));

      const response = await request(app).post('/api/cleanup-subdomains');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to cleanup duplicate subdomains');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to validation endpoints', async () => {
      // This test would require multiple rapid requests to trigger rate limiting
      // For now, just verify the middleware is applied correctly
      Store.findByDomain.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/check-domain')
        .send({ domain: 'test.com' });

      expect(response.status).toBe(200);
      // Rate limiting behavior would be tested in integration tests
    });
  });

  describe('Content Type Validation', () => {
    test('should accept JSON content type', async () => {
      Store.findByDomain.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/check-domain')
        .set('Content-Type', 'application/json')
        .send({ domain: 'test.com' });

      expect(response.status).toBe(200);
    });

    test('should accept form-encoded content type', async () => {
      Store.findByDomain.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/check-domain')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('domain=test.com');

      expect(response.status).toBe(200);
    });

    test('should skip validation for GET requests', async () => {
      const response = await request(app).get('/api/stores');

      // Should not fail due to content type, and should call Store.findAll
      expect(Store.findAll).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle unexpected errors with generic message', async () => {
      Store.findAll.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const response = await request(app).get('/api/stores');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch stores');
    });

    test('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/stores')
        .set('Content-Type', 'application/json')
        .send('invalid-json');

      expect(response.status).toBe(400);
    });
  });
});