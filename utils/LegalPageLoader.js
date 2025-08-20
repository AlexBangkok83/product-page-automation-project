const fs = require('fs');
const path = require('path');

class LegalPageLoader {
  constructor() {
    this.legalPagesDir = path.join(process.cwd(), 'legal_pages');
    this.cache = new Map();
  }

  /**
   * Load and parse all legal pages from legal_pages folder
   */
  async loadAllLegalPages() {
    try {
      console.log('📄 Loading localized legal pages...');
      
      if (!fs.existsSync(this.legalPagesDir)) {
        console.warn('⚠️ Legal pages directory not found:', this.legalPagesDir);
        return {};
      }

      const files = fs.readdirSync(this.legalPagesDir);
      const legalPages = {};

      for (const filename of files) {
        if (!filename.endsWith('.html')) continue;

        try {
          const { language, pageType, slug, content, title } = await this.parseFile(filename);
          
          if (!legalPages[language]) {
            legalPages[language] = {};
          }

          legalPages[language][pageType] = {
            slug,
            content,
            title,
            filename
          };

          console.log(`✅ Loaded ${language}-${pageType}: ${slug}`);
          
        } catch (error) {
          console.warn(`⚠️ Could not parse ${filename}:`, error.message);
        }
      }

      console.log('📊 Legal pages loaded:', Object.keys(legalPages).length, 'languages');
      this.cache.set('allPages', legalPages);
      return legalPages;
      
    } catch (error) {
      console.error('❌ Error loading legal pages:', error);
      return {};
    }
  }

  /**
   * Parse individual legal page file
   */
  async parseFile(filename) {
    const filePath = path.join(this.legalPagesDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');

    // Parse filename: {language}-{localized-slug}.html
    const match = filename.match(/^([a-z]{2})-(.+)\.html$/);
    if (!match) {
      throw new Error(`Invalid filename format: ${filename}`);
    }

    const [, language, slug] = match;
    
    // Map localized slugs to standard page types
    const pageType = this.getPageTypeFromSlug(slug, language);
    
    // Extract title from HTML
    const title = this.extractTitle(content) || this.generateTitle(pageType, language);

    return {
      language,
      pageType,
      slug,
      content,
      title,
      filename
    };
  }

  /**
   * Map localized slugs to standard page types
   */
  getPageTypeFromSlug(slug, language) {
    const mapping = {
      // Privacy policy
      'integritetspolicy': 'privacy',
      'datenschutzerklaerung': 'privacy', 
      'tietosuojaseloste': 'privacy',
      
      // Terms and conditions
      'anvandarvillkor': 'terms',
      'nutzungsbedingungen': 'terms',
      'kayttoehdot': 'terms',
      
      // Refund policy
      'aterbetalningspolicy': 'refund',
      'rueckerstattungsrichtlinie': 'refund',
      'palautus-hyvityskaytanto': 'refund',
      
      // Shipping/delivery policy
      'leveranspolicy': 'delivery',
      'versandrichtlinie': 'delivery',
      'toimitusehdot': 'delivery'
    };

    const pageType = mapping[slug];
    if (!pageType) {
      console.warn(`⚠️ Unknown slug '${slug}' for language '${language}'`);
      return slug; // Use slug as fallback page type
    }

    return pageType;
  }

  /**
   * Extract title from HTML content
   */
  extractTitle(content) {
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    // Try to find h1 tag
    const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      return h1Match[1].trim();
    }

    return null;
  }

  /**
   * Generate fallback title
   */
  generateTitle(pageType, language) {
    const titles = {
      se: {
        privacy: 'Integritetspolicy',
        terms: 'Användarvillkor', 
        refund: 'Återbetalningspolicy',
        delivery: 'Leveranspolicy'
      },
      de: {
        privacy: 'Datenschutzerklärung',
        terms: 'Nutzungsbedingungen',
        refund: 'Rückerstattungsrichtlinie', 
        delivery: 'Versandrichtlinie'
      },
      fi: {
        privacy: 'Tietosuojaseloste',
        terms: 'Käyttöehdot',
        refund: 'Palautus- ja hyvityskäytäntö',
        delivery: 'Toimitusehdot'
      }
    };

    return titles[language]?.[pageType] || `${pageType} (${language})`;
  }

  /**
   * Get legal page for specific language and page type
   */
  getLegalPage(language, pageType) {
    const allPages = this.cache.get('allPages') || {};
    return allPages[language]?.[pageType] || null;
  }

  /**
   * Get all available languages
   */
  getAvailableLanguages() {
    const allPages = this.cache.get('allPages') || {};
    return Object.keys(allPages);
  }

  /**
   * Get localized slug for page type and language
   */
  getLocalizedSlug(pageType, language) {
    const page = this.getLegalPage(language, pageType);
    return page?.slug || null;
  }
}

module.exports = LegalPageLoader;