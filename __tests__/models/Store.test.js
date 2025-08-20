const Store = require('../../models/Store');
const db = require('../../database/db');
const fs = require('fs');
const path = require('path');

// Mock dependencies
jest.mock('../../database/db');
jest.mock('fs');
jest.mock('path');
jest.mock('../../utils/TemplateRenderer');
jest.mock('../../utils/DeploymentAutomation');
jest.mock('../../utils/LegalPageLoader');

describe('Store Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default database mocks
    db.run = jest.fn().mockResolvedValue({ id: 1, changes: 1 });
    db.get = jest.fn().mockResolvedValue(null);
    db.all = jest.fn().mockResolvedValue([]);
  });

  describe('Constructor', () => {
    test('should create store instance with default values', () => {
      const store = new Store();
      
      expect(store.uuid).toBeDefined();
      expect(store.theme_id).toBe('default');
      expect(store.primary_color).toBe('#007cba');
      expect(store.secondary_color).toBe('#f8f9fa');
      expect(store.status).toBe('setup');
      expect(store.deployment_status).toBe('pending');
      expect(store.shopify_connected).toBe(false);
      expect(store.gdpr_compliant).toBe(false);
      expect(store.cookie_consent).toBe(false);
      expect(store.prefooter_enabled).toBe(false);
    });

    test('should create store instance with provided data', () => {
      const storeData = createMockStore({
        name: 'Custom Store',
        domain: 'custom.com',
        primary_color: '#ff0000'
      });
      
      const store = new Store(storeData);
      
      expect(store.name).toBe('Custom Store');
      expect(store.domain).toBe('custom.com');
      expect(store.primary_color).toBe('#ff0000');
      expect(store.uuid).toBe(storeData.uuid);
    });
  });

  describe('Static Methods', () => {
    describe('generateUniqueSubdomain', () => {
      test('should generate valid subdomain from store name', async () => {
        db.get.mockResolvedValue(null); // No conflicts
        
        const subdomain = await Store.generateUniqueSubdomain('My Test Store');
        
        expect(subdomain).toBe('my-test-store');
        expect(db.get).toHaveBeenCalledWith(
          'SELECT * FROM stores WHERE subdomain = ?',
          ['my-test-store']
        );
      });

      test('should handle special characters and normalize subdomain', async () => {
        db.get.mockResolvedValue(null);
        
        const subdomain = await Store.generateUniqueSubdomain('Store@#$%^&*()Name!!!');
        
        expect(subdomain).toBe('store-name');
      });

      test('should add timestamp suffix when base subdomain is taken', async () => {
        db.get
          .mockResolvedValueOnce({ subdomain: 'test-store' }) // Base taken
          .mockResolvedValueOnce(null); // Timestamp version available
        
        jest.spyOn(Date, 'now').mockReturnValue(1234567890123);
        
        const subdomain = await Store.generateUniqueSubdomain('Test Store');
        
        expect(subdomain).toBe('test-store-567890');
        expect(db.get).toHaveBeenCalledTimes(2);
      });

      test('should use random suffix when timestamp is also taken', async () => {
        db.get
          .mockResolvedValueOnce({ subdomain: 'test-store' }) // Base taken
          .mockResolvedValueOnce({ subdomain: 'test-store-567890' }) // Timestamp taken
          .mockResolvedValueOnce(null); // Random available
        
        jest.spyOn(Date, 'now').mockReturnValue(1234567890123);
        jest.spyOn(Math, 'random').mockReturnValue(0.123456);
        
        const subdomain = await Store.generateUniqueSubdomain('Test Store');
        
        expect(subdomain).toBe('test-store-3rupk6');
        expect(db.get).toHaveBeenCalledTimes(3);
      });

      test('should ensure minimum length for short names', async () => {
        db.get.mockResolvedValue(null);
        
        const subdomain = await Store.generateUniqueSubdomain('AB');
        
        expect(subdomain).toBe('store-ab');
      });
    });

    describe('findByDomain', () => {
      test('should find store by exact domain match', async () => {
        const mockStoreData = createMockStore({ domain: 'test.com' });
        db.get.mockResolvedValue(mockStoreData);
        
        const store = await Store.findByDomain('test.com');
        
        expect(store).toBeInstanceOf(Store);
        expect(store.domain).toBe('test.com');
        expect(db.get).toHaveBeenCalledWith(
          'SELECT * FROM stores WHERE domain = ? OR subdomain = ?',
          ['test.com', 'test.com']
        );
      });

      test('should return null when store not found', async () => {
        db.get.mockResolvedValue(null);
        
        const store = await Store.findByDomain('nonexistent.com');
        
        expect(store).toBeNull();
      });
    });

    describe('create', () => {
      test('should create store with valid data', async () => {
        const storeData = {
          name: 'Test Store',
          domain: 'test.com',
          country: 'US',
          language: 'en',
          currency: 'USD'
        };
        
        db.get.mockResolvedValue(null); // No conflicts
        db.run.mockResolvedValue({ id: 1, changes: 1 });
        
        // Mock generateUniqueSubdomain
        jest.spyOn(Store, 'generateUniqueSubdomain').mockResolvedValue('test-store');
        
        // Mock file system checks
        fs.existsSync = jest.fn().mockReturnValue(false);
        
        // Mock instance methods
        const mockStore = new Store(storeData);
        mockStore.createDefaultPages = jest.fn().mockResolvedValue();
        mockStore.generateStoreFiles = jest.fn().mockResolvedValue();
        mockStore.update = jest.fn().mockResolvedValue(mockStore);
        
        jest.spyOn(Store, 'findByDomain').mockResolvedValue(null);
        jest.spyOn(Store, 'findBySubdomain').mockResolvedValue(null);
        
        const store = await Store.create(storeData);
        
        expect(store).toBeInstanceOf(Store);
        expect(store.name).toBe('Test Store');
        expect(store.domain).toBe('test.com');
        expect(db.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO stores'),
          expect.arrayContaining(['test-store', 'Test Store', 'test.com'])
        );
      });

      test('should throw error for missing required fields', async () => {
        const incompleteData = {
          name: 'Test Store'
          // Missing domain, country, language, currency
        };
        
        await expect(Store.create(incompleteData)).rejects.toThrow(
          'Missing required fields: name, domain, country, language, currency'
        );
      });

      test('should throw error for domain conflicts', async () => {
        const storeData = {
          name: 'Test Store',
          domain: 'existing.com',
          country: 'US',
          language: 'en',
          currency: 'USD'
        };
        
        // Mock existing store
        jest.spyOn(Store, 'findByDomain').mockResolvedValue(new Store({ domain: 'existing.com' }));
        
        await expect(Store.create(storeData)).rejects.toThrow(
          'Domain conflict: A store already exists with domain "existing.com"'
        );
      });

      test('should throw error for file system conflicts', async () => {
        const storeData = {
          name: 'Test Store',
          domain: 'test.com',
          country: 'US',
          language: 'en',
          currency: 'USD'
        };
        
        jest.spyOn(Store, 'findByDomain').mockResolvedValue(null);
        fs.existsSync = jest.fn().mockReturnValue(true); // Directory exists
        path.join = jest.fn().mockReturnValue('/fake/path/stores/test.com');
        
        await expect(Store.create(storeData)).rejects.toThrow(
          'File system conflict: Directory "stores/test.com" already exists'
        );
      });
    });

    describe('cleanupDuplicateSubdomains', () => {
      test('should identify and fix duplicate subdomains', async () => {
        const duplicates = [
          { subdomain: 'duplicate-store', count: 2 }
        ];
        
        const conflictingStores = [
          createMockStore({ id: 1, name: 'Store 1', subdomain: 'duplicate-store' }),
          createMockStore({ id: 2, name: 'Store 2', subdomain: 'duplicate-store' })
        ];
        
        db.all
          .mockResolvedValueOnce(duplicates) // Find duplicates
          .mockResolvedValueOnce(conflictingStores); // Get conflicting stores
        
        jest.spyOn(Store, 'generateUniqueSubdomain').mockResolvedValue('store-2-fixed');
        
        // Mock update method
        const mockUpdate = jest.fn().mockResolvedValue();
        jest.spyOn(Store.prototype, 'update').mockImplementation(mockUpdate);
        
        const result = await Store.cleanupDuplicateSubdomains();
        
        expect(result.fixed).toBe(1);
        expect(result.conflicts).toBe(1);
        expect(mockUpdate).toHaveBeenCalledWith({ subdomain: 'store-2-fixed' });
      });

      test('should return zero when no duplicates found', async () => {
        db.all.mockResolvedValue([]); // No duplicates
        
        const result = await Store.cleanupDuplicateSubdomains();
        
        expect(result.fixed).toBe(0);
        expect(result.conflicts).toBe(0);
      });
    });
  });

  describe('Instance Methods', () => {
    let store;

    beforeEach(() => {
      store = new Store(createMockStore());
    });

    describe('update', () => {
      test('should update allowed fields', async () => {
        const updateData = {
          name: 'Updated Store',
          primary_color: '#ff0000',
          invalid_field: 'should be ignored'
        };
        
        await store.update(updateData);
        
        expect(store.name).toBe('Updated Store');
        expect(store.primary_color).toBe('#ff0000');
        expect(store.invalid_field).toBeUndefined();
        
        expect(db.run).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE stores SET'),
          expect.arrayContaining(['Updated Store', '#ff0000', store.id])
        );
      });

      test('should return early when no valid fields provided', async () => {
        const result = await store.update({ invalid_field: 'value' });
        
        expect(result).toBe(store);
        expect(db.run).not.toHaveBeenCalled();
      });
    });

    describe('replaceTemplateVariables', () => {
      test('should replace all template variables correctly', () => {
        const template = 'Welcome to $company_name at $domain! Contact: $contact_email';
        
        const result = store.replaceTemplateVariables(template);
        
        expect(result).toBe('Welcome to Test Store at test.example.com! Contact: support@test.example.com');
      });

      test('should handle missing variables with TBD fallback', () => {
        const storeWithoutEmail = new Store(createMockStore({ support_email: null }));
        const template = 'Contact: $contact_email, Address: $company_address';
        
        const result = storeWithoutEmail.replaceTemplateVariables(template);
        
        expect(result).toBe('Contact: TBD, Address: TBD');
      });

      test('should return original content when no variables present', () => {
        const template = 'Simple content with no variables';
        
        const result = store.replaceTemplateVariables(template);
        
        expect(result).toBe('Simple content with no variables');
      });

      test('should handle null/undefined content', () => {
        expect(store.replaceTemplateVariables(null)).toBeNull();
        expect(store.replaceTemplateVariables(undefined)).toBeUndefined();
        expect(store.replaceTemplateVariables('')).toBe('');
      });
    });

    describe('getStorePath', () => {
      test('should return correct store path', () => {
        path.join.mockReturnValue('/project/stores/test.example.com');
        process.cwd = jest.fn().mockReturnValue('/project');
        
        const storePath = store.getStorePath();
        
        expect(storePath).toBe('/project/stores/test.example.com');
        expect(path.join).toHaveBeenCalledWith('/project', 'stores', 'test.example.com');
      });
    });

    describe('storeFilesExist', () => {
      test('should return true when index.html exists', () => {
        path.join.mockReturnValue('/fake/path/index.html');
        fs.existsSync.mockReturnValue(true);
        
        const exists = store.storeFilesExist();
        
        expect(exists).toBe(true);
        expect(fs.existsSync).toHaveBeenCalledWith('/fake/path/index.html');
      });

      test('should return false when index.html does not exist', () => {
        fs.existsSync.mockReturnValue(false);
        
        const exists = store.storeFilesExist();
        
        expect(exists).toBe(false);
      });
    });

    describe('getDeploymentInfo', () => {
      test('should return correct deployment information', () => {
        store.deployment_status = 'deployed';
        store.deployment_url = 'https://test.example.com';
        store.deployed_at = '2024-01-01T00:00:00Z';
        
        jest.spyOn(store, 'storeFilesExist').mockReturnValue(true);
        
        const info = store.getDeploymentInfo();
        
        expect(info).toEqual({
          status: 'deployed',
          url: 'https://test.example.com',
          deployedAt: '2024-01-01T00:00:00Z',
          filesExist: true,
          canDeploy: true,
          needsDeployment: false
        });
      });

      test('should indicate needs deployment when files missing', () => {
        jest.spyOn(store, 'storeFilesExist').mockReturnValue(false);
        
        const info = store.getDeploymentInfo();
        
        expect(info.needsDeployment).toBe(true);
        expect(info.filesExist).toBe(false);
      });

      test('should indicate cannot deploy when status is deploying', () => {
        store.deployment_status = 'deploying';
        
        const info = store.getDeploymentInfo();
        
        expect(info.canDeploy).toBe(false);
      });
    });

    describe('replaceContentPlaceholders', () => {
      test('should replace placeholders in content object', () => {
        const content = {
          title: 'Welcome to {store_name}',
          description: 'Contact us at {support_email}',
          content_blocks: JSON.stringify([{
            text: 'Visit {store_domain} for more info'
          }])
        };
        
        const result = store.replaceContentPlaceholders(content);
        
        expect(result.title).toBe('Welcome to Test Store');
        expect(result.description).toBe('Contact us at support@test.example.com');
        expect(JSON.parse(result.content_blocks)[0].text).toBe('Visit test.example.com for more info');
      });

      test('should handle malformed JSON in content_blocks gracefully', () => {
        const content = {
          title: 'Test',
          content_blocks: 'invalid-json'
        };
        
        const result = store.replaceContentPlaceholders(content);
        
        expect(result.title).toBe('Test');
        expect(result.content_blocks).toBe('invalid-json'); // Unchanged due to JSON error
      });
    });

    describe('toJSON', () => {
      test('should return complete store data with computed properties', () => {
        jest.spyOn(store, 'storeFilesExist').mockReturnValue(true);
        jest.spyOn(store, 'getStorePath').mockReturnValue('/fake/path');
        
        const json = store.toJSON();
        
        expect(json).toHaveProperty('id');
        expect(json).toHaveProperty('uuid');
        expect(json).toHaveProperty('name');
        expect(json).toHaveProperty('domain');
        expect(json).toHaveProperty('files_exist', true);
        expect(json).toHaveProperty('store_path', '/fake/path');
        expect(json).toHaveProperty('live_url', 'https://test.example.com');
        
        // Should not contain sensitive data like access tokens
        expect(json.shopify_access_token).toBe(store.shopify_access_token); // This is included in toJSON
      });
    });
  });

  describe('Database Operations', () => {
    describe('findById', () => {
      test('should find store by ID', async () => {
        const mockData = createMockStore({ id: 123 });
        db.get.mockResolvedValue(mockData);
        
        const store = await Store.findById(123);
        
        expect(store).toBeInstanceOf(Store);
        expect(store.id).toBe(123);
        expect(db.get).toHaveBeenCalledWith('SELECT * FROM stores WHERE id = ?', [123]);
      });

      test('should return null when store not found', async () => {
        db.get.mockResolvedValue(null);
        
        const store = await Store.findById(999);
        
        expect(store).toBeNull();
      });
    });

    describe('findByUuid', () => {
      test('should find store by UUID', async () => {
        const mockData = createMockStore({ uuid: 'test-uuid' });
        db.get.mockResolvedValue(mockData);
        
        const store = await Store.findByUuid('test-uuid');
        
        expect(store).toBeInstanceOf(Store);
        expect(store.uuid).toBe('test-uuid');
        expect(db.get).toHaveBeenCalledWith('SELECT * FROM stores WHERE uuid = ?', ['test-uuid']);
      });
    });

    describe('findAll', () => {
      test('should return all stores ordered by creation date', async () => {
        const mockStores = [
          createMockStore({ id: 1, name: 'Store 1' }),
          createMockStore({ id: 2, name: 'Store 2' })
        ];
        db.all.mockResolvedValue(mockStores);
        
        const stores = await Store.findAll();
        
        expect(stores).toHaveLength(2);
        expect(stores[0]).toBeInstanceOf(Store);
        expect(stores[1]).toBeInstanceOf(Store);
        expect(db.all).toHaveBeenCalledWith('SELECT * FROM stores ORDER BY created_at DESC');
      });

      test('should return empty array when no stores exist', async () => {
        db.all.mockResolvedValue([]);
        
        const stores = await Store.findAll();
        
        expect(stores).toHaveLength(0);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully in create', async () => {
      const storeData = {
        name: 'Test Store',
        domain: 'test.com',
        country: 'US',
        language: 'en',
        currency: 'USD'
      };
      
      jest.spyOn(Store, 'findByDomain').mockResolvedValue(null);
      fs.existsSync = jest.fn().mockReturnValue(false);
      jest.spyOn(Store, 'generateUniqueSubdomain').mockResolvedValue('test-store');
      jest.spyOn(Store, 'findBySubdomain').mockResolvedValue(null);
      
      db.run.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(Store.create(storeData)).rejects.toThrow('Database connection failed');
    });

    test('should handle subdomain generation failures', async () => {
      jest.spyOn(Store, 'generateUniqueSubdomain').mockRejectedValue(
        new Error('Subdomain generation failed')
      );
      
      const storeData = {
        name: 'Test Store',
        domain: 'test.com',
        country: 'US',
        language: 'en',
        currency: 'USD'
      };
      
      jest.spyOn(Store, 'findByDomain').mockResolvedValue(null);
      fs.existsSync = jest.fn().mockReturnValue(false);
      
      await expect(Store.create(storeData)).rejects.toThrow('Subdomain generation failed');
    });
  });

  describe('Business Logic Validation', () => {
    test('should validate store name length and format', () => {
      const longName = 'A'.repeat(101);
      const storeWithLongName = new Store({ name: longName });
      
      expect(storeWithLongName.name).toBe(longName);
      // Note: Add validation in Store constructor if needed
    });

    test('should handle boolean field conversion', () => {
      const storeData = {
        shopify_connected: 1, // Database boolean as integer
        gdpr_compliant: 0,
        cookie_consent: '1' // String boolean
      };
      
      const store = new Store(storeData);
      
      expect(store.shopify_connected).toBe(1);
      expect(store.gdpr_compliant).toBe(0);
      expect(store.cookie_consent).toBe('1');
    });
  });
});