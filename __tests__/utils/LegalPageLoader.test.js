const LegalPageLoader = require('../../utils/LegalPageLoader');
const fs = require('fs');
const path = require('path');

jest.mock('fs');
jest.mock('path');

describe('LegalPageLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new LegalPageLoader();
    
    // Setup path mocks
    path.join = jest.fn().mockImplementation((...args) => args.join('/'));
    process.cwd = jest.fn().mockReturnValue('/project');
    
    // Setup fs mocks
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readdirSync = jest.fn().mockReturnValue([
      'fi-kayttoehdot.html',
      'fi-tietosuojaseloste.html',
      'de-nutzungsbedingungen.html',
      'de-datenschutzerklaerung.html'
    ]);
    
    // Mock file content
    fs.readFileSync = jest.fn().mockImplementation((filePath) => {
      if (filePath.includes('fi-kayttoehdot')) {
        return '<h1>Käyttöehdot</h1><p>Finnish terms content</p>';
      }
      if (filePath.includes('fi-tietosuojaseloste')) {
        return '<h1>Tietosuojaseloste</h1><p>Finnish privacy content</p>';
      }
      if (filePath.includes('de-nutzungsbedingungen')) {
        return '<h1>Nutzungsbedingungen</h1><p>German terms content</p>';
      }
      if (filePath.includes('de-datenschutzerklaerung')) {
        return '<h1>Datenschutzerklärung</h1><p>German privacy content</p>';
      }
      return '<h1>Default</h1>';
    });
  });

  describe('Constructor', () => {
    test('should initialize with empty legal pages cache', () => {
      expect(loader.legalPages).toEqual({});
      expect(loader.legalPagesPath).toBe('/project/legal_pages');
    });
  });

  describe('loadAllLegalPages', () => {
    test('should load and parse all legal page files', async () => {
      await loader.loadAllLegalPages();

      expect(fs.readdirSync).toHaveBeenCalledWith('/project/legal_pages');
      expect(fs.readFileSync).toHaveBeenCalledTimes(4);
      
      // Check Finnish pages
      expect(loader.legalPages.fi).toBeDefined();
      expect(loader.legalPages.fi.terms).toEqual({
        title: 'Käyttöehdot',
        content: '<h1>Käyttöehdot</h1><p>Finnish terms content</p>',
        slug: 'kayttoehdot'
      });
      expect(loader.legalPages.fi.privacy).toEqual({
        title: 'Tietosuojaseloste',
        content: '<h1>Tietosuojaseloste</h1><p>Finnish privacy content</p>',
        slug: 'tietosuojaseloste'
      });

      // Check German pages
      expect(loader.legalPages.de).toBeDefined();
      expect(loader.legalPages.de.terms).toEqual({
        title: 'Nutzungsbedingungen',
        content: '<h1>Nutzungsbedingungen</h1><p>German terms content</p>',
        slug: 'nutzungsbedingungen'
      });
      expect(loader.legalPages.de.privacy).toEqual({
        title: 'Datenschutzerklärung',
        content: '<h1>Datenschutzerklärung</h1><p>German privacy content</p>',
        slug: 'datenschutzerklaerung'
      });
    });

    test('should handle missing legal_pages directory', async () => {
      fs.existsSync.mockReturnValue(false);

      await loader.loadAllLegalPages();

      expect(loader.legalPages).toEqual({});
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    test('should handle file reading errors gracefully', async () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(loader.loadAllLegalPages()).resolves.toBeUndefined();
      expect(loader.legalPages).toEqual({});
    });

    test('should skip invalid filenames', async () => {
      fs.readdirSync.mockReturnValue([
        'fi-kayttoehdot.html',
        'invalid-filename.html',
        'missing-language.html',
        'de-nutzungsbedingungen.html'
      ]);

      await loader.loadAllLegalPages();

      expect(fs.readFileSync).toHaveBeenCalledTimes(2); // Only valid files
      expect(loader.legalPages.fi).toBeDefined();
      expect(loader.legalPages.de).toBeDefined();
    });
  });

  describe('parseFilename', () => {
    test('should parse valid Finnish filenames', () => {
      expect(loader.parseFilename('fi-kayttoehdot.html')).toEqual({
        language: 'fi',
        pageType: 'terms'
      });
      expect(loader.parseFilename('fi-tietosuojaseloste.html')).toEqual({
        language: 'fi',
        pageType: 'privacy'
      });
      expect(loader.parseFilename('fi-palautus-hyvityskaytanto.html')).toEqual({
        language: 'fi',
        pageType: 'refund'
      });
      expect(loader.parseFilename('fi-toimitusehdot.html')).toEqual({
        language: 'fi',
        pageType: 'delivery'
      });
    });

    test('should parse valid German filenames', () => {
      expect(loader.parseFilename('de-nutzungsbedingungen.html')).toEqual({
        language: 'de',
        pageType: 'terms'
      });
      expect(loader.parseFilename('de-datenschutzerklaerung.html')).toEqual({
        language: 'de',
        pageType: 'privacy'
      });
      expect(loader.parseFilename('de-rueckerstattungsrichtlinie.html')).toEqual({
        language: 'de',
        pageType: 'refund'
      });
      expect(loader.parseFilename('de-versandrichtlinie.html')).toEqual({
        language: 'de',
        pageType: 'delivery'
      });
    });

    test('should parse valid Swedish filenames', () => {
      expect(loader.parseFilename('se-anvandarvillkor.html')).toEqual({
        language: 'se',
        pageType: 'terms'
      });
      expect(loader.parseFilename('se-integritetspolicy.html')).toEqual({
        language: 'se',
        pageType: 'privacy'
      });
    });

    test('should return null for invalid filenames', () => {
      expect(loader.parseFilename('invalid.html')).toBeNull();
      expect(loader.parseFilename('fi-unknown-page.html')).toBeNull();
      expect(loader.parseFilename('missing-extension')).toBeNull();
      expect(loader.parseFilename('no-language-prefix.html')).toBeNull();
    });

    test('should handle edge cases', () => {
      expect(loader.parseFilename('')).toBeNull();
      expect(loader.parseFilename(null)).toBeNull();
      expect(loader.parseFilename(undefined)).toBeNull();
      expect(loader.parseFilename('fi-.html')).toBeNull();
      expect(loader.parseFilename('-kayttoehdot.html')).toBeNull();
    });
  });

  describe('extractTitleFromHTML', () => {
    test('should extract title from h1 tag', () => {
      const html = '<div><h1>Page Title</h1><p>Content</p></div>';
      const title = loader.extractTitleFromHTML(html);
      expect(title).toBe('Page Title');
    });

    test('should extract title from nested h1 tag', () => {
      const html = '<html><body><div><h1>Nested Title</h1></div></body></html>';
      const title = loader.extractTitleFromHTML(html);
      expect(title).toBe('Nested Title');
    });

    test('should handle h1 with attributes', () => {
      const html = '<h1 class="title" id="main">Title with Attributes</h1>';
      const title = loader.extractTitleFromHTML(html);
      expect(title).toBe('Title with Attributes');
    });

    test('should return fallback when no h1 found', () => {
      const html = '<div><h2>Not H1</h2><p>Content</p></div>';
      const title = loader.extractTitleFromHTML(html);
      expect(title).toBe('Legal Page');
    });

    test('should handle empty or malformed HTML', () => {
      expect(loader.extractTitleFromHTML('')).toBe('Legal Page');
      expect(loader.extractTitleFromHTML('<html>')).toBe('Legal Page');
      expect(loader.extractTitleFromHTML(null)).toBe('Legal Page');
      expect(loader.extractTitleFromHTML(undefined)).toBe('Legal Page');
    });

    test('should handle multiple h1 tags (return first)', () => {
      const html = '<h1>First Title</h1><h1>Second Title</h1>';
      const title = loader.extractTitleFromHTML(html);
      expect(title).toBe('First Title');
    });
  });

  describe('generateSlug', () => {
    test('should generate slug from Finnish legal terms', () => {
      expect(loader.generateSlug('fi', 'terms')).toBe('kayttoehdot');
      expect(loader.generateSlug('fi', 'privacy')).toBe('tietosuojaseloste');
      expect(loader.generateSlug('fi', 'refund')).toBe('palautus-hyvityskaytanto');
      expect(loader.generateSlug('fi', 'delivery')).toBe('toimitusehdot');
    });

    test('should generate slug from German legal terms', () => {
      expect(loader.generateSlug('de', 'terms')).toBe('nutzungsbedingungen');
      expect(loader.generateSlug('de', 'privacy')).toBe('datenschutzerklaerung');
      expect(loader.generateSlug('de', 'refund')).toBe('rueckerstattungsrichtlinie');
      expect(loader.generateSlug('de', 'delivery')).toBe('versandrichtlinie');
    });

    test('should generate slug from Swedish legal terms', () => {
      expect(loader.generateSlug('se', 'terms')).toBe('anvandarvillkor');
      expect(loader.generateSlug('se', 'privacy')).toBe('integritetspolicy');
      expect(loader.generateSlug('se', 'refund')).toBe('aterbetalningspolicy');
      expect(loader.generateSlug('se', 'delivery')).toBe('leveranspolicy');
    });

    test('should fallback to English for unknown languages', () => {
      expect(loader.generateSlug('unknown', 'terms')).toBe('terms');
      expect(loader.generateSlug('unknown', 'privacy')).toBe('privacy');
      expect(loader.generateSlug('fr', 'terms')).toBe('terms');
    });

    test('should handle unknown page types', () => {
      expect(loader.generateSlug('fi', 'unknown')).toBe('unknown');
      expect(loader.generateSlug('de', 'custom')).toBe('custom');
    });
  });

  describe('getLegalPage', () => {
    beforeEach(async () => {
      await loader.loadAllLegalPages();
    });

    test('should return legal page for valid language and type', () => {
      const page = loader.getLegalPage('fi', 'terms');
      
      expect(page).toEqual({
        title: 'Käyttöehdot',
        content: '<h1>Käyttöehdot</h1><p>Finnish terms content</p>',
        slug: 'kayttoehdot'
      });
    });

    test('should return null for invalid language', () => {
      const page = loader.getLegalPage('invalid', 'terms');
      expect(page).toBeNull();
    });

    test('should return null for invalid page type', () => {
      const page = loader.getLegalPage('fi', 'invalid');
      expect(page).toBeNull();
    });

    test('should return null when pages not loaded', () => {
      const freshLoader = new LegalPageLoader();
      const page = freshLoader.getLegalPage('fi', 'terms');
      expect(page).toBeNull();
    });
  });

  describe('getAvailableLanguages', () => {
    test('should return available languages after loading', async () => {
      await loader.loadAllLegalPages();
      
      const languages = loader.getAvailableLanguages();
      expect(languages).toEqual(['fi', 'de']);
    });

    test('should return empty array when no pages loaded', () => {
      const languages = loader.getAvailableLanguages();
      expect(languages).toEqual([]);
    });
  });

  describe('getAvailablePageTypes', () => {
    test('should return page types for specific language', async () => {
      await loader.loadAllLegalPages();
      
      const pageTypes = loader.getAvailablePageTypes('fi');
      expect(pageTypes).toEqual(['terms', 'privacy']);
    });

    test('should return empty array for invalid language', async () => {
      await loader.loadAllLegalPages();
      
      const pageTypes = loader.getAvailablePageTypes('invalid');
      expect(pageTypes).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    test('should handle file system permission errors', async () => {
      fs.readdirSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      await expect(loader.loadAllLegalPages()).resolves.toBeUndefined();
      expect(loader.legalPages).toEqual({});
    });

    test('should handle corrupted HTML files', async () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File corrupted');
      });

      await loader.loadAllLegalPages();
      expect(loader.legalPages).toEqual({});
    });

    test('should handle missing directory gracefully', async () => {
      fs.existsSync.mockReturnValue(false);

      await loader.loadAllLegalPages();

      expect(loader.legalPages).toEqual({});
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });
  });

  describe('Content Processing', () => {
    test('should preserve HTML structure in content', async () => {
      const complexHTML = `
        <div class="legal-content">
          <h1>Complex Title</h1>
          <p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
          <ul>
            <li>List item 1</li>
            <li>List item 2</li>
          </ul>
        </div>
      `;
      
      fs.readFileSync.mockReturnValue(complexHTML);
      fs.readdirSync.mockReturnValue(['fi-kayttoehdot.html']);

      await loader.loadAllLegalPages();

      const page = loader.getLegalPage('fi', 'terms');
      expect(page.content).toContain('<strong>bold</strong>');
      expect(page.content).toContain('<ul>');
      expect(page.content).toContain('<li>List item 1</li>');
    });

    test('should handle HTML without h1 tag', async () => {
      const htmlWithoutH1 = '<div><p>Content without title</p></div>';
      fs.readFileSync.mockReturnValue(htmlWithoutH1);
      fs.readdirSync.mockReturnValue(['fi-kayttoehdot.html']);

      await loader.loadAllLegalPages();

      const page = loader.getLegalPage('fi', 'terms');
      expect(page.title).toBe('Legal Page'); // Fallback title
      expect(page.content).toBe(htmlWithoutH1);
    });
  });

  describe('Integration Tests', () => {
    test('should handle full workflow from loading to retrieval', async () => {
      // Simulate real file structure
      fs.readdirSync.mockReturnValue([
        'fi-kayttoehdot.html',
        'fi-tietosuojaseloste.html',
        'de-nutzungsbedingungen.html'
      ]);

      await loader.loadAllLegalPages();

      // Test retrieval of all loaded pages
      expect(loader.getLegalPage('fi', 'terms')).toBeTruthy();
      expect(loader.getLegalPage('fi', 'privacy')).toBeTruthy();
      expect(loader.getLegalPage('de', 'terms')).toBeTruthy();
      
      // Test missing combinations
      expect(loader.getLegalPage('de', 'privacy')).toBeNull();
      expect(loader.getLegalPage('en', 'terms')).toBeNull();
    });

    test('should support multiple load operations (idempotent)', async () => {
      await loader.loadAllLegalPages();
      const firstLoad = { ...loader.legalPages };
      
      await loader.loadAllLegalPages();
      const secondLoad = { ...loader.legalPages };

      expect(firstLoad).toEqual(secondLoad);
      expect(fs.readdirSync).toHaveBeenCalledTimes(2); // Called again
    });
  });
});