const Store = require('../models/Store');
const db = require('../database/db');

// Mock external dependencies
jest.mock('../utils/TemplateRenderer');
jest.mock('../utils/DeploymentAutomation');
jest.mock('../models/PageTemplate');
jest.mock('../utils/LegalPageLoader');

describe('Store Model', () => {
  beforeAll(async () => {
    // Initialize the test database
    await db.initialize();
  });

  beforeEach(async () => {
    // Clean up stores table before each test
    await db.run('DELETE FROM stores');
    await db.run('DELETE FROM store_pages');
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Store Creation', () => {
    test('should create a new store with valid data', async () => {
      const storeData = createMockStore({
        name: 'Test Store Creation',
        domain: 'test-creation.example.com',
        country: 'US',
        language: 'en',
        currency: 'USD'
      });

      const store = await Store.create(storeData);

      expect(store).toBeDefined();
      expect(store.id).toBeDefined();
      expect(store.name).toBe('Test Store Creation');
      expect(store.domain).toBe('test-creation.example.com');
      expect(store.uuid).toBeDefined();
    });

    test('should fail to create store with missing required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Store'
        // Missing domain, country, language, currency
      };

      await expect(Store.create(incompleteData)).rejects.toThrow('Missing required fields');
    });

    test('should fail to create store with duplicate domain', async () => {
      const storeData = createMockStore({
        name: 'First Store',
        domain: 'duplicate.example.com'
      });

      // Create first store
      await Store.create(storeData);

      // Try to create second store with same domain
      const duplicateData = createMockStore({
        name: 'Duplicate Store',
        domain: 'duplicate.example.com'
      });

      await expect(Store.create(duplicateData)).rejects.toThrow('Domain conflict');
    });
  });

  describe('Store Retrieval', () => {
    let testStore;

    beforeEach(async () => {
      const storeData = createMockStore({
        name: 'Retrieval Test Store',
        domain: 'retrieval.example.com'
      });
      testStore = await Store.create(storeData);
    });

    test('should find store by ID', async () => {
      const found = await Store.findById(testStore.id);
      
      expect(found).toBeDefined();
      expect(found.id).toBe(testStore.id);
      expect(found.name).toBe('Retrieval Test Store');
    });

    test('should find store by UUID', async () => {
      const found = await Store.findByUuid(testStore.uuid);
      
      expect(found).toBeDefined();
      expect(found.uuid).toBe(testStore.uuid);
      expect(found.name).toBe('Retrieval Test Store');
    });

    test('should find store by domain', async () => {
      const found = await Store.findByDomain(testStore.domain);
      
      expect(found).toBeDefined();
      expect(found.domain).toBe(testStore.domain);
    });

    test('should return null for non-existent store', async () => {
      const found = await Store.findById(99999);
      expect(found).toBeNull();
    });
  });

  describe('Store Updates', () => {
    let testStore;

    beforeEach(async () => {
      const storeData = createMockStore({
        name: 'Update Test Store',
        domain: 'update.example.com'
      });
      testStore = await Store.create(storeData);
    });

    test('should update store fields', async () => {
      const updateData = {
        name: 'Updated Store Name',
        primary_color: '#ff0000',
        theme_id_new: 2
      };

      const updated = await testStore.update(updateData);

      expect(updated.name).toBe('Updated Store Name');
      expect(updated.primary_color).toBe('#ff0000');
      expect(updated.theme_id_new).toBe(2);
    });

    test('should ignore non-allowed fields in update', async () => {
      const updateData = {
        name: 'Updated Name',
        id: 99999, // Should be ignored
        invalid_field: 'should be ignored'
      };

      const updated = await testStore.update(updateData);

      expect(updated.name).toBe('Updated Name');
      expect(updated.id).toBe(testStore.id); // Should not change
      expect(updated.invalid_field).toBeUndefined();
    });

    test('should return same store instance if no valid fields to update', async () => {
      const updateData = {
        invalid_field: 'should be ignored'
      };

      const updated = await testStore.update(updateData);
      expect(updated).toBe(testStore);
    });
  });

  describe('Subdomain Generation', () => {
    test('should generate unique subdomain from store name', async () => {
      const subdomain = await Store.generateUniqueSubdomain('Test Store');
      
      expect(subdomain).toBeDefined();
      expect(typeof subdomain).toBe('string');
      expect(subdomain.length).toBeGreaterThan(0);
      expect(subdomain).toMatch(/^[a-z0-9-]+$/); // Should only contain lowercase letters, numbers, and hyphens
    });

    test('should generate different subdomains for conflicting names', async () => {
      // Create first store with generated subdomain
      const storeData1 = createMockStore({
        name: 'Conflict Store',
        domain: 'conflict1.example.com'
      });
      const store1 = await Store.create(storeData1);

      // Generate subdomain that would conflict
      const subdomain = await Store.generateUniqueSubdomain('Conflict Store');
      
      // Should be different from the first store's subdomain
      expect(subdomain).not.toBe(store1.subdomain);
    });

    test('should handle short names by adding prefix', async () => {
      const subdomain = await Store.generateUniqueSubdomain('AB');
      
      expect(subdomain).toBeDefined();
      expect(subdomain.length).toBeGreaterThan(3);
      expect(subdomain.startsWith('store-')).toBe(true);
    });
  });

  describe('Store JSON Serialization', () => {
    let testStore;

    beforeEach(async () => {
      const storeData = createMockStore({
        name: 'JSON Test Store',
        domain: 'json.example.com'
      });
      testStore = await Store.create(storeData);
    });

    test('should serialize store to JSON with all required fields', () => {
      const json = testStore.toJSON();

      // Check required fields are present
      expect(json.id).toBeDefined();
      expect(json.uuid).toBeDefined();
      expect(json.name).toBe('JSON Test Store');
      expect(json.domain).toBe('json.example.com');
      expect(json.theme_id).toBeDefined();
      expect(json.theme_id_new).toBeDefined();
      expect(json.created_at).toBeDefined();

      // Check computed fields
      expect(json.files_exist).toBeDefined();
      expect(json.store_path).toBeDefined();
      expect(json.live_url).toBe('https://json.example.com');
    });

    test('should include theme_id_new in JSON output', () => {
      testStore.theme_id_new = 3;
      const json = testStore.toJSON();

      expect(json.theme_id_new).toBe(3);
    });
  });

  describe('Store File Operations', () => {
    let testStore;

    beforeEach(async () => {
      const storeData = createMockStore({
        name: 'File Test Store',
        domain: 'file.example.com'
      });
      testStore = await Store.create(storeData);
    });

    test('should get correct store path', () => {
      const storePath = testStore.getStorePath();
      
      expect(storePath).toContain('stores');
      expect(storePath).toContain('file.example.com');
    });

    test('should report files do not exist initially', () => {
      const filesExist = testStore.storeFilesExist();
      
      expect(filesExist).toBe(false);
    });

    test('should get deployment info', () => {
      const deploymentInfo = testStore.getDeploymentInfo();

      expect(deploymentInfo).toHaveProperty('status');
      expect(deploymentInfo).toHaveProperty('url');
      expect(deploymentInfo).toHaveProperty('filesExist');
      expect(deploymentInfo).toHaveProperty('canDeploy');
      expect(deploymentInfo).toHaveProperty('needsDeployment');
      
      expect(deploymentInfo.url).toBe('https://file.example.com');
    });
  });

  describe('Content Placeholder Replacement', () => {
    let testStore;

    beforeEach(async () => {
      const storeData = createMockStore({
        name: 'Placeholder Store',
        domain: 'placeholder.example.com',
        country: 'Sweden',
        currency: 'SEK',
        support_email: 'support@placeholder.example.com'
      });
      testStore = await Store.create(storeData);
    });

    test('should replace content placeholders correctly', () => {
      const content = {
        title: 'Welcome to {store_name}',
        description: 'Located in {store_country}, we accept {store_currency}',
        meta_description: 'Contact us at {support_email}'
      };

      const processed = testStore.replaceContentPlaceholders(content);

      expect(processed.title).toBe('Welcome to Placeholder Store');
      expect(processed.description).toBe('Located in Sweden, we accept SEK');
      expect(processed.meta_description).toBe('Contact us at support@placeholder.example.com');
    });

    test('should handle missing placeholders gracefully', () => {
      const content = {
        title: 'Welcome to {store_name}',
        description: 'Contact: {nonexistent_field}'
      };

      const processed = testStore.replaceContentPlaceholders(content);

      expect(processed.title).toBe('Welcome to Placeholder Store');
      expect(processed.description).toBe('Contact: '); // Should be empty string
    });
  });

  describe('Template Variable Replacement', () => {
    let testStore;

    beforeEach(async () => {
      const storeData = createMockStore({
        name: 'Template Store',
        domain: 'template.example.com',
        support_email: 'help@template.example.com',
        business_orgnr: '123456789',
        business_address: '123 Main St'
      });
      testStore = await Store.create(storeData);
    });

    test('should replace template variables with dollar syntax', () => {
      const content = 'Company: $company_name, Email: $contact_email, Org: $company_orgnr';
      
      const processed = testStore.replaceTemplateVariables(content);

      expect(processed).toContain('Company: Template Store');
      expect(processed).toContain('Email: help@template.example.com');
      expect(processed).toContain('Org: 123456789');
    });

    test('should replace undefined variables with TBD', () => {
      const storeData = createMockStore({
        name: 'Template Store 2',
        domain: 'template2.example.com'
        // No business_orgnr or business_address
      });
      const store = new Store(storeData);

      const content = 'Address: $company_address, Org: $company_orgnr';
      const processed = store.replaceTemplateVariables(content);

      expect(processed).toContain('Address: TBD');
      expect(processed).toContain('Org: TBD');
    });
  });
});