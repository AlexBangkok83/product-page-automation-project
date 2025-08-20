const TemplateRenderer = require('../../utils/TemplateRenderer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

jest.mock('fs');
jest.mock('path');
jest.mock('child_process');

describe('TemplateRenderer', () => {
  let renderer;
  let mockStore;
  let mockPages;

  beforeEach(() => {
    renderer = new TemplateRenderer();
    
    mockStore = createMockStore({
      name: 'Test Store',
      domain: 'test.com',
      primary_color: '#007cba',
      secondary_color: '#f8f9fa',
      support_email: 'support@test.com'
    });

    mockPages = [
      createMockPage({
        page_type: 'home',
        slug: '',
        title: 'Welcome Home',
        content: JSON.stringify([{
          type: 'hero',
          title: 'Welcome to Test Store',
          subtitle: 'Amazing products await'
        }])
      }),
      createMockPage({
        page_type: 'products',
        slug: 'products',
        title: 'Our Products'
      })
    ];

    // Setup path mocks
    path.join = jest.fn()
      .mockImplementation((...args) => {
        if (args.includes('templates')) return '/project/templates';
        if (args.includes('stores') && args.length === 2) return '/project/stores';
        return '/fake/path';
      });
    
    process.cwd = jest.fn().mockReturnValue('/project');
    
    // Setup fs mocks
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.mkdirSync = jest.fn();
    fs.writeFileSync = jest.fn();
    fs.readFileSync = jest.fn().mockReturnValue('<footer>{{STORE_NAME}}</footer>');
    fs.rmSync = jest.fn();
    
    // Setup execSync mock
    execSync.mockImplementation(() => {});
  });

  describe('Constructor', () => {
    test('should initialize with correct paths', () => {
      expect(renderer.templatesPath).toBe('/project/templates');
      expect(renderer.storesPath).toBe('/project/stores');
      expect(renderer.footerTemplate).toBeNull();
    });
  });

  describe('generateStoreFiles', () => {
    test('should create store directory and generate all files', async () => {
      const mockAutoCommit = jest.fn().mockResolvedValue();
      const mockGenerateAssets = jest.fn().mockResolvedValue();
      const mockGeneratePage = jest.fn().mockResolvedValue();
      
      renderer.autoCommitAndPush = mockAutoCommit;
      renderer.generateAssets = mockGenerateAssets;
      renderer.generatePage = mockGeneratePage;

      const result = await renderer.generateStoreFiles(mockStore, mockPages);

      expect(fs.mkdirSync).toHaveBeenCalledWith('/project/stores', { recursive: true });
      expect(fs.mkdirSync).toHaveBeenCalledWith('/fake/path', { recursive: true });
      expect(mockGeneratePage).toHaveBeenCalledTimes(2);
      expect(mockGenerateAssets).toHaveBeenCalledWith(mockStore, '/fake/path');
      expect(mockAutoCommit).toHaveBeenCalledWith(mockStore, '/fake/path');
      expect(result).toBe('/fake/path');
    });

    test('should skip directory creation when it already exists', async () => {
      renderer.autoCommitAndPush = jest.fn().mockResolvedValue();
      renderer.generateAssets = jest.fn().mockResolvedValue();
      renderer.generatePage = jest.fn().mockResolvedValue();

      await renderer.generateStoreFiles(mockStore, mockPages);

      expect(fs.mkdirSync).toHaveBeenCalledWith('/project/stores', { recursive: true });
      expect(fs.mkdirSync).toHaveBeenCalledWith('/fake/path', { recursive: true });
    });

    test('should handle errors during file generation', async () => {
      renderer.generatePage = jest.fn().mockRejectedValue(new Error('Page generation failed'));

      await expect(renderer.generateStoreFiles(mockStore, mockPages))
        .rejects.toThrow('Page generation failed');
    });
  });

  describe('loadFooterTemplate', () => {
    test('should load and cache footer template', () => {
      const mockTemplate = '<footer>{{STORE_NAME}}</footer>';
      fs.readFileSync.mockReturnValue(mockTemplate);

      const template1 = renderer.loadFooterTemplate();
      const template2 = renderer.loadFooterTemplate();

      expect(template1).toBe(mockTemplate);
      expect(template2).toBe(mockTemplate);
      expect(fs.readFileSync).toHaveBeenCalledTimes(1); // Cached
    });

    test('should fallback to basic footer when template not found', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      jest.spyOn(renderer, 'getBasicFooter').mockReturnValue('<footer>Basic</footer>');

      const template = renderer.loadFooterTemplate();

      expect(template).toBe('<footer>Basic</footer>');
      expect(renderer.getBasicFooter).toHaveBeenCalled();
    });
  });

  describe('generateFooter', () => {
    test('should generate footer with store data and navigation', async () => {
      const mockTemplate = '<footer>{{STORE_NAME}} - {{QUICK_LINKS}}</footer>';
      renderer.loadFooterTemplate = jest.fn().mockReturnValue(mockTemplate);

      const result = await renderer.generateFooter(mockStore, mockPages);

      expect(result).toContain('Test Store');
      expect(result).toContain('<li><a href="/">Welcome Home</a></li>');
      expect(result).toContain('<li><a href="/products">Our Products</a></li>');
    });

    test('should handle conditional blocks for logo', async () => {
      const templateWithLogo = '<footer>{{#if STORE_LOGO_URL}}<img src="{{STORE_LOGO_URL}}">{{else}}{{STORE_NAME}}{{/if}}</footer>';
      renderer.loadFooterTemplate = jest.fn().mockReturnValue(templateWithLogo);

      // Test with logo URL
      const storeWithLogo = { ...mockStore, logo_url: 'https://example.com/logo.png' };
      const resultWithLogo = await renderer.generateFooter(storeWithLogo, mockPages);
      expect(resultWithLogo).toContain('<img src="https://example.com/logo.png">');
      expect(resultWithLogo).not.toContain('Test Store');

      // Test without logo URL
      const resultWithoutLogo = await renderer.generateFooter(mockStore, mockPages);
      expect(resultWithoutLogo).toContain('Test Store');
      expect(resultWithoutLogo).not.toContain('<img');
    });

    test('should handle prefooter content when enabled', async () => {
      const templateWithPrefooter = '<footer>{{#if PREFOOTER_ENABLED}}{{PREFOOTER_CARD1_TITLE}}{{/if}}</footer>';
      renderer.loadFooterTemplate = jest.fn().mockReturnValue(templateWithPrefooter);

      const storeWithPrefooter = {
        ...mockStore,
        prefooter_enabled: true,
        prefooter_card1_title: 'Card 1 Title'
      };

      const result = await renderer.generateFooter(storeWithPrefooter, mockPages);
      expect(result).toContain('Card 1 Title');
    });
  });

  describe('generatePage', () => {
    test('should generate page with correct filename', async () => {
      const mockRenderPageHTML = jest.fn().mockResolvedValue('<html>Test</html>');
      renderer.renderPageHTML = mockRenderPageHTML;

      await renderer.generatePage(mockStore, mockPages[0], '/store/path', mockPages);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/fake/path/index.html',
        '<html>Test</html>',
        'utf8'
      );
      expect(mockRenderPageHTML).toHaveBeenCalledWith(mockStore, mockPages[0], mockPages);
    });

    test('should use correct filename for non-home pages', async () => {
      renderer.renderPageHTML = jest.fn().mockResolvedValue('<html>Products</html>');

      await renderer.generatePage(mockStore, mockPages[1], '/store/path', mockPages);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/fake/path/products.html',
        '<html>Products</html>',
        'utf8'
      );
    });

    test('should handle page generation errors', async () => {
      renderer.renderPageHTML = jest.fn().mockRejectedValue(new Error('Render failed'));

      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await expect(renderer.generatePage(mockStore, mockPages[0], '/store/path', mockPages))
        .rejects.toThrow('Render failed');
        
      consoleSpy.mockRestore();
    });
  });

  describe('renderPageHTML', () => {
    test('should parse content blocks correctly', async () => {
      const pageWithContent = {
        ...mockPages[0],
        content: JSON.stringify([{
          type: 'hero',
          title: 'Test Hero'
        }])
      };

      const mockRenderHomePage = jest.fn().mockResolvedValue('<html>Home</html>');
      renderer.renderHomePage = mockRenderHomePage;

      await renderer.renderPageHTML(mockStore, pageWithContent, mockPages);

      expect(mockRenderHomePage).toHaveBeenCalledWith(
        mockStore,
        pageWithContent,
        [{ type: 'hero', title: 'Test Hero' }],
        {},
        mockPages
      );
    });

    test('should handle malformed JSON content gracefully', async () => {
      const pageWithBadJSON = {
        ...mockPages[0],
        content: 'invalid-json'
      };

      renderer.renderHomePage = jest.fn().mockResolvedValue('<html>Home</html>');

      await renderer.renderPageHTML(mockStore, pageWithBadJSON, mockPages);

      expect(renderer.renderHomePage).toHaveBeenCalledWith(
        mockStore,
        pageWithBadJSON,
        [{ type: 'text', content: 'invalid-json' }],
        {},
        mockPages
      );
    });

    test('should route to correct page renderer based on page type', async () => {
      const mockRenderProductsPage = jest.fn().mockResolvedValue('<html>Products</html>');
      renderer.renderProductsPage = mockRenderProductsPage;

      await renderer.renderPageHTML(mockStore, mockPages[1], mockPages);

      expect(mockRenderProductsPage).toHaveBeenCalled();
    });
  });

  describe('generateAssets', () => {
    test('should generate robots.txt with correct content', async () => {
      await renderer.generateAssets(mockStore, '/store/path');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/fake/path',
        expect.stringContaining('User-agent: *\nAllow: /\n\nSitemap: https://test.com/sitemap.xml'),
        'utf8'
      );
    });

    test('should generate sitemap.xml with store URLs', async () => {
      await renderer.generateAssets(mockStore, '/store/path');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/fake/path',
        expect.stringContaining('<loc>https://test.com/</loc>'),
        'utf8'
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/fake/path',
        expect.stringContaining('<loc>https://test.com/products</loc>'),
        'utf8'
      );
    });
  });

  describe('autoCommitAndPush', () => {
    test('should execute git commands in correct order', async () => {
      path.relative.mockReturnValue('stores/test.com');
      
      await renderer.autoCommitAndPush(mockStore, '/store/path');

      expect(execSync).toHaveBeenCalledWith('git add "stores/test.com"', { cwd: '/project' });
      expect(execSync).toHaveBeenCalledWith('git add database/multistore.db', { cwd: '/project' });
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git commit -m'),
        { cwd: '/project' }
      );
      expect(execSync).toHaveBeenCalledWith('git push', { cwd: '/project' });
    });

    test('should handle git command failures gracefully', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      // Should not throw - git failures are handled gracefully
      await expect(renderer.autoCommitAndPush(mockStore, '/store/path'))
        .resolves.toBeUndefined();
    });

    test('should include correct commit message format', async () => {
      await renderer.autoCommitAndPush(mockStore, '/store/path');

      const commitCall = execSync.mock.calls.find(call => 
        call[0].includes('git commit')
      );
      
      expect(commitCall[0]).toContain('Add Test Store store files and deployment');
      expect(commitCall[0]).toContain('Domain: test.com');
      expect(commitCall[0]).toContain('Country: US');
      expect(commitCall[0]).toContain('🤖 Generated with Claude Code');
    });
  });

  describe('Page Rendering', () => {
    beforeEach(() => {
      renderer.generateFooter = jest.fn().mockResolvedValue('<footer>Test Footer</footer>');
    });

    describe('renderHomePage', () => {
      test('should render home page with hero section', async () => {
        const contentBlocks = [
          {
            type: 'hero',
            title: 'Welcome to Our Store',
            subtitle: 'Best products ever',
            cta: 'Shop Now'
          }
        ];

        const result = await renderer.renderHomePage(mockStore, mockPages[0], contentBlocks, {}, mockPages);

        expect(result).toContain('Welcome to Our Store');
        expect(result).toContain('Best products ever');
        expect(result).toContain('Shop Now');
        expect(result).toContain('--primary-color: #007cba');
        expect(result).toContain('<footer>Test Footer</footer>');
      });

      test('should use default hero content when not provided', async () => {
        const result = await renderer.renderHomePage(mockStore, mockPages[0], [], {}, mockPages);

        expect(result).toContain('Welcome Home'); // From page title
        expect(result).toContain('Welcome to our store'); // Default subtitle
        expect(result).toContain('Shop Now'); // Default CTA
      });

      test('should render features section', async () => {
        const contentBlocks = [
          {
            type: 'features',
            items: [
              { title: 'Fast Shipping', description: 'Quick delivery' },
              { title: 'Quality Products', description: 'Best quality' }
            ]
          }
        ];

        const result = await renderer.renderHomePage(mockStore, mockPages[0], contentBlocks, {}, mockPages);

        expect(result).toContain('Fast Shipping');
        expect(result).toContain('Quick delivery');
        expect(result).toContain('Quality Products');
        expect(result).toContain('Best quality');
      });
    });

    describe('renderProductsPage', () => {
      test('should render products page with Shopify integration status', async () => {
        const storeWithShopify = {
          ...mockStore,
          shopify_connected: true,
          shopify_shop_name: 'Test Shop'
        };

        const result = await renderer.renderProductsPage(storeWithShopify, mockPages[1], [], {}, mockPages);

        expect(result).toContain('Products Loading');
        expect(result).toContain('Test Shop');
        expect(result).toContain('Our Products'); // Page title
      });

      test('should show coming soon message when Shopify not connected', async () => {
        const result = await renderer.renderProductsPage(mockStore, mockPages[1], [], {}, mockPages);

        expect(result).toContain('Products Coming Soon');
        expect(result).toContain('check back soon');
      });
    });

    describe('renderContactPage', () => {
      test('should render contact form and info', async () => {
        const result = await renderer.renderContactPage(mockStore, mockPages[1], [], {}, mockPages);

        expect(result).toContain('<form action="#" method="POST">');
        expect(result).toContain('type="email"');
        expect(result).toContain('support@test.com');
        expect(result).toContain('Send Message');
      });

      test('should handle missing contact information gracefully', async () => {
        const storeWithoutContact = {
          ...mockStore,
          support_email: null,
          support_phone: null,
          business_address: null
        };

        const result = await renderer.renderContactPage(storeWithoutContact, mockPages[1], [], {}, mockPages);

        expect(result).toContain('<form');
        expect(result).not.toContain('mailto:');
        expect(result).not.toContain('tel:');
      });
    });

    describe('renderGenericPage', () => {
      test('should render generic page with content blocks', async () => {
        const genericPage = createMockPage({
          page_type: 'about',
          title: 'About Us',
          content: JSON.stringify([{
            type: 'text',
            content: 'This is our story'
          }])
        });

        const contentBlocks = [{ type: 'text', content: 'This is our story' }];

        const result = await renderer.renderGenericPage(mockStore, genericPage, contentBlocks, {}, mockPages);

        expect(result).toContain('About Us');
        expect(result).toContain('This is our story');
      });

      test('should render default content when no blocks provided', async () => {
        const genericPage = createMockPage({
          page_type: 'faq',
          title: 'FAQ'
        });

        const result = await renderer.renderGenericPage(mockStore, genericPage, [], {}, mockPages);

        expect(result).toContain('FAQ');
        expect(result).toContain('Welcome to the faq page of Test Store');
        expect(result).toContain('currently being built');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors during directory creation', async () => {
      fs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(renderer.generateStoreFiles(mockStore, mockPages))
        .rejects.toThrow('Permission denied');
    });

    test('should handle template rendering errors', async () => {
      renderer.renderPageHTML = jest.fn().mockRejectedValue(new Error('Template error'));

      await expect(renderer.generatePage(mockStore, mockPages[0], '/path', mockPages))
        .rejects.toThrow('Template error');
    });
  });

  describe('CSS Variable Generation', () => {
    test('should inject store colors into CSS variables', async () => {
      const storeWithColors = {
        ...mockStore,
        primary_color: '#ff0000',
        secondary_color: '#00ff00'
      };

      const result = await renderer.renderHomePage(storeWithColors, mockPages[0], [], {}, mockPages);

      expect(result).toContain('--primary-color: #ff0000');
      expect(result).toContain('--secondary-color: #00ff00');
    });

    test('should use default colors when not specified', async () => {
      const storeWithoutColors = {
        ...mockStore,
        primary_color: null,
        secondary_color: null
      };

      const result = await renderer.renderHomePage(storeWithoutColors, mockPages[0], [], {}, mockPages);

      expect(result).toContain('--primary-color: #007cba');
      expect(result).toContain('--secondary-color: #f8f9fa');
    });
  });
});