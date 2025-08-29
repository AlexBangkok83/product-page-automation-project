const fs = require('fs');
const path = require('path');
const db = require('../database/db');

class TemplateRenderer {
  constructor() {
    this.templatesPath = path.join(__dirname, '..', 'templates');
  }

  /**
   * Generate all store files from database content
   */
  async generateStoreFiles(store, pages) {
    try {
      console.log(`🎨 Generating store files for ${store.name} (${store.domain})`);
      
      // Create store directory
      const storePath = path.join(process.cwd(), 'stores', store.domain);
      this.ensureDirectoryExists(storePath);

      // Get theme configuration
      const themeConfig = await this.getThemeConfiguration(store);
      console.log(`🎨 Using theme configuration:`, { theme_id: store.theme_id, theme_id_new: store.theme_id_new });

      // Generate main pages
      const generatedFiles = [];
      
      for (const page of pages) {
        try {
          const fileName = this.getPageFileName(page);
          const filePath = path.join(storePath, fileName);
          
          console.log(`📄 Generating ${fileName} for ${page.page_type} page...`);
          
          // Generate HTML content based on page type
          let htmlContent;
          
          if (page.page_type === 'products') {
            // Fetch products from Shopify and generate product pages
            htmlContent = await this.generateProductsPage(store, page, themeConfig);
          } else {
            // Generate regular page
            htmlContent = await this.generatePage(store, page, themeConfig);
          }
          
          // Write file
          fs.writeFileSync(filePath, htmlContent, 'utf8');
          generatedFiles.push(fileName);
          
          console.log(`✅ Generated ${fileName} (${this.formatFileSize(htmlContent.length)})`);
          
        } catch (pageError) {
          console.error(`❌ Error generating ${page.page_type} page:`, pageError.message);
          // Continue with other pages
        }
      }

      // Generate additional static files
      await this.generateStaticFiles(store, storePath, themeConfig);

      console.log(`✅ Generated ${generatedFiles.length} pages for ${store.name}`);
      return storePath;

    } catch (error) {
      console.error(`❌ Error generating store files for ${store.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Get theme configuration from database or fallback to defaults
   */
  async getThemeConfiguration(store) {
    try {
      // First try to get theme from new theme system
      if (store.theme_id_new) {
        const theme = await db.get('SELECT * FROM themes WHERE id = ? AND is_active = 1', [store.theme_id_new]);
        if (theme) {
          console.log(`🎨 Using new theme system: ${theme.name} (ID: ${theme.id})`);
          
          let cssVariables = {};
          try {
            cssVariables = JSON.parse(theme.css_variables || '{}');
          } catch (parseError) {
            console.warn('⚠️ Failed to parse theme CSS variables, using defaults');
            cssVariables = {};
          }
          
          return {
            id: theme.id,
            name: theme.name,
            description: theme.description,
            primary: cssVariables.primary || store.primary_color || '#007cba',
            secondary: cssVariables.secondary || store.secondary_color || '#f8f9fa',
            accent: cssVariables.accent || '#007cba',
            background: cssVariables.background || '#ffffff',
            surface: cssVariables.surface || '#f8f9fa',
            ...cssVariables
          };
        } else {
          console.log(`⚠️ Theme ID ${store.theme_id_new} not found in database, falling back to legacy`);
        }
      }

      // Fallback to legacy theme system
      console.log(`🔄 Using legacy theme system: ${store.theme_id}`);
      return this.getLegacyThemeConfiguration(store);

    } catch (error) {
      console.error('❌ Error getting theme configuration:', error.message);
      return this.getLegacyThemeConfiguration(store);
    }
  }

  /**
   * Get theme configuration from legacy system
   */
  getLegacyThemeConfiguration(store) {
    return {
      id: store.theme_id || 'default',
      name: 'Legacy Theme',
      description: 'Fallback legacy theme',
      primary: store.primary_color || '#007cba',
      secondary: store.secondary_color || '#f8f9fa',
      accent: store.primary_color || '#007cba',
      background: '#ffffff',
      surface: '#f8f9fa'
    };
  }

  /**
   * Generate HTML for a single page
   */
  async generatePage(store, page, themeConfig) {
    const templateName = this.getTemplateName(page);
    const template = await this.loadTemplate(templateName);
    
    // Prepare template variables
    const variables = {
      // Store information
      store_name: store.name,
      store_domain: store.domain,
      store_country: store.country,
      store_language: store.language,
      store_currency: store.currency,
      support_email: store.support_email || `support@${store.domain}`,
      support_phone: store.support_phone || '',
      business_address: store.business_address || '',
      business_orgnr: store.business_orgnr || '',
      
      // Page content
      page_title: page.title,
      page_subtitle: page.subtitle || '',
      page_content: this.processPageContent(page.content),
      meta_title: page.meta_title || page.title,
      meta_description: page.meta_description || '',
      
      // Theme variables
      theme_primary: themeConfig.primary,
      theme_secondary: themeConfig.secondary,
      theme_accent: themeConfig.accent || themeConfig.primary,
      theme_background: themeConfig.background || '#ffffff',
      theme_surface: themeConfig.surface || '#f8f9fa',
      
      // Additional styling
      logo_url: store.logo_url || '',
      favicon_url: store.favicon_url || '',
      
      // Navigation and footer
      nav_links: this.generateNavLinks(store, page.page_type),
      footer_content: this.generateFooterContent(store)
    };

    // Replace template variables
    let html = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value);
    }

    return html;
  }

  /**
   * Generate products page with Shopify integration
   */
  async generateProductsPage(store, page, themeConfig) {
    try {
      // Fetch products from store
      const products = await store.fetchShopifyProducts(50);
      
      // Get selected products
      let selectedProductHandles = [];
      if (store.selected_products) {
        try {
          selectedProductHandles = typeof store.selected_products === 'string' 
            ? JSON.parse(store.selected_products)
            : store.selected_products;
        } catch (parseError) {
          console.warn('⚠️ Failed to parse selected_products, showing all products');
          selectedProductHandles = [];
        }
      }

      // Filter products if selection exists
      let displayProducts = products;
      if (selectedProductHandles.length > 0) {
        displayProducts = products.filter(product => selectedProductHandles.includes(product.handle));
        console.log(`🛒 Showing ${displayProducts.length} selected products out of ${products.length} total`);
      } else {
        console.log(`🛒 Showing all ${displayProducts.length} products (no selection configured)`);
      }

      // Generate product HTML
      const productsHtml = displayProducts.map(product => this.generateProductCard(product, store, themeConfig)).join('\n');

      // Load products page template
      const template = await this.loadTemplate('products');
      
      // Prepare variables
      const variables = {
        // Store information
        store_name: store.name,
        store_domain: store.domain,
        support_email: store.support_email || `support@${store.domain}`,
        
        // Page content
        page_title: page.title || 'Our Products',
        page_subtitle: page.subtitle || 'Discover our amazing collection',
        meta_title: page.meta_title || `Products - ${store.name}`,
        meta_description: page.meta_description || `Shop our products at ${store.name}`,
        
        // Products
        products_html: productsHtml,
        products_count: displayProducts.length,
        
        // Theme variables
        theme_primary: themeConfig.primary,
        theme_secondary: themeConfig.secondary,
        theme_accent: themeConfig.accent || themeConfig.primary,
        theme_background: themeConfig.background || '#ffffff',
        theme_surface: themeConfig.surface || '#f8f9fa',
        
        // Navigation and footer
        nav_links: this.generateNavLinks(store, 'products'),
        footer_content: this.generateFooterContent(store)
      };

      // Replace template variables
      let html = template;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, value);
      }

      return html;

    } catch (error) {
      console.error(`❌ Error generating products page:`, error.message);
      
      // Fallback to basic products page
      return await this.generatePage(store, {
        ...page,
        title: 'Products',
        content: '<p>Products are being loaded. Please check back soon!</p>'
      }, themeConfig);
    }
  }

  /**
   * Generate HTML for a single product card
   */
  generateProductCard(product, store, themeConfig) {
    const primaryVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    const primaryImage = product.images && product.images.length > 0 ? product.images[0] : null;
    
    const price = primaryVariant ? `${primaryVariant.price.toFixed(2)} ${store.currency}` : 'Price unavailable';
    const compareAtPrice = primaryVariant && primaryVariant.compare_at_price 
      ? `${primaryVariant.compare_at_price.toFixed(2)} ${store.currency}`
      : null;
    
    const imageHtml = primaryImage 
      ? `<img src="${primaryImage.src}" alt="${primaryImage.alt}" class="product-image" loading="lazy">`
      : `<div class="product-image-placeholder">No Image</div>`;
    
    const priceHtml = compareAtPrice && primaryVariant.compare_at_price > primaryVariant.price
      ? `<span class="product-price-sale">${price}</span> <span class="product-price-original">${compareAtPrice}</span>`
      : `<span class="product-price">${price}</span>`;

    const availabilityClass = primaryVariant && primaryVariant.available ? 'product-available' : 'product-unavailable';
    const availabilityText = primaryVariant && primaryVariant.available ? 'In Stock' : 'Out of Stock';

    return `
    <div class="product-card ${availabilityClass}">
      <div class="product-image-container">
        ${imageHtml}
        ${!primaryVariant || !primaryVariant.available ? '<div class="product-overlay">Out of Stock</div>' : ''}
      </div>
      <div class="product-info">
        <h3 class="product-title">${product.title}</h3>
        <p class="product-vendor">${product.vendor || ''}</p>
        <div class="product-price-container">
          ${priceHtml}
        </div>
        <p class="product-availability ${availabilityClass}">${availabilityText}</p>
        <div class="product-actions">
          ${primaryVariant && primaryVariant.available 
            ? `<button class="btn btn-primary" onclick="viewProduct('${product.handle}')">View Product</button>`
            : `<button class="btn btn-secondary" disabled>Out of Stock</button>`
          }
        </div>
      </div>
    </div>`;
  }

  /**
   * Process page content (handle JSON blocks or HTML)
   */
  processPageContent(content) {
    if (!content) return '';

    // If content looks like JSON (content blocks), process it
    if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
      try {
        const blocks = JSON.parse(content);
        if (Array.isArray(blocks)) {
          return blocks.map(block => this.renderContentBlock(block)).join('\n');
        } else {
          return this.renderContentBlock(blocks);
        }
      } catch (error) {
        console.warn('⚠️ Failed to parse content as JSON, treating as HTML');
        return content;
      }
    }

    // Otherwise treat as HTML
    return content;
  }

  /**
   * Render a content block to HTML
   */
  renderContentBlock(block) {
    switch (block.type) {
      case 'text':
        return `<div class="content-block text-block">${block.content}</div>`;
      
      case 'hero':
        return `
        <div class="content-block hero-block">
          <h1>${block.title}</h1>
          ${block.subtitle ? `<p class="hero-subtitle">${block.subtitle}</p>` : ''}
          ${block.cta ? `<a href="#" class="btn btn-primary">${block.cta}</a>` : ''}
        </div>`;
      
      case 'features':
        const featuresHtml = block.items ? block.items.map(item => 
          `<div class="feature-item">
            <h4>${item.title}</h4>
            <p>${item.description}</p>
          </div>`
        ).join('') : '';
        return `<div class="content-block features-block">${featuresHtml}</div>`;
      
      default:
        return `<div class="content-block unknown-block">${block.content || ''}</div>`;
    }
  }

  /**
   * Generate navigation links
   */
  generateNavLinks(store, currentPageType) {
    const links = [
      { href: '/', text: 'Home', type: 'home' },
      { href: '/products.html', text: 'Products', type: 'products' },
      { href: '/about.html', text: 'About', type: 'about' },
      { href: '/contact.html', text: 'Contact', type: 'contact' }
    ];

    return links.map(link => {
      const activeClass = link.type === currentPageType ? ' class="active"' : '';
      return `<a href="${link.href}"${activeClass}>${link.text}</a>`;
    }).join('\n');
  }

  /**
   * Generate footer content
   */
  generateFooterContent(store) {
    return `
    <div class="footer-content">
      <div class="footer-section">
        <h4>${store.name}</h4>
        <p>Quality products and exceptional service.</p>
        ${store.support_email ? `<p>Email: <a href="mailto:${store.support_email}">${store.support_email}</a></p>` : ''}
        ${store.support_phone ? `<p>Phone: ${store.support_phone}</p>` : ''}
      </div>
      <div class="footer-section">
        <h4>Quick Links</h4>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/products.html">Products</a></li>
          <li><a href="/about.html">About</a></li>
          <li><a href="/contact.html">Contact</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h4>Legal</h4>
        <ul>
          <li><a href="/terms.html">Terms of Service</a></li>
          <li><a href="/privacy.html">Privacy Policy</a></li>
        </ul>
      </div>
    </div>`;
  }

  /**
   * Generate static files (CSS, JS, etc.)
   */
  async generateStaticFiles(store, storePath, themeConfig) {
    try {
      // Generate main CSS file with theme colors
      const cssContent = this.generateCSS(themeConfig);
      fs.writeFileSync(path.join(storePath, 'styles.css'), cssContent, 'utf8');

      // Generate basic JavaScript
      const jsContent = this.generateJavaScript(store);
      fs.writeFileSync(path.join(storePath, 'scripts.js'), jsContent, 'utf8');

      // Generate robots.txt
      const robotsContent = this.generateRobotsTxt(store);
      fs.writeFileSync(path.join(storePath, 'robots.txt'), robotsContent, 'utf8');

      console.log('✅ Generated static files (CSS, JS, robots.txt)');

    } catch (error) {
      console.error('❌ Error generating static files:', error.message);
    }
  }

  /**
   * Generate CSS with theme colors
   */
  generateCSS(themeConfig) {
    return `
/* Generated CSS for theme: ${themeConfig.name} */
:root {
  --theme-primary: ${themeConfig.primary};
  --theme-secondary: ${themeConfig.secondary};
  --theme-accent: ${themeConfig.accent};
  --theme-background: ${themeConfig.background};
  --theme-surface: ${themeConfig.surface};
}

/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: var(--theme-background);
}

/* Header styles */
header {
  background: var(--theme-primary);
  color: white;
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

nav a {
  color: white;
  text-decoration: none;
  margin: 0 1rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.3s;
}

nav a:hover,
nav a.active {
  background-color: rgba(255, 255, 255, 0.1);
}

/* Main content */
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* Content blocks */
.content-block {
  margin: 2rem 0;
}

.hero-block {
  text-align: center;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
  color: white;
  border-radius: 8px;
}

.hero-block h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.hero-subtitle {
  font-size: 1.2rem;
  margin-bottom: 2rem;
}

.features-block {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin: 3rem 0;
}

.feature-item {
  padding: 2rem;
  background: var(--theme-surface);
  border-radius: 8px;
  text-align: center;
}

/* Product grid */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}

.product-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.product-image-container {
  position: relative;
  height: 250px;
  overflow: hidden;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-image-placeholder {
  width: 100%;
  height: 100%;
  background: var(--theme-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.product-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.product-info {
  padding: 1.5rem;
}

.product-title {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.product-vendor {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.product-price-container {
  margin: 1rem 0;
}

.product-price {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--theme-primary);
}

.product-price-sale {
  font-size: 1.2rem;
  font-weight: bold;
  color: #e74c3c;
}

.product-price-original {
  text-decoration: line-through;
  color: #666;
  margin-left: 0.5rem;
}

.product-availability {
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

.product-available {
  color: #27ae60;
}

.product-unavailable {
  color: #e74c3c;
}

/* Buttons */
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  text-decoration: none;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 1rem;
}

.btn-primary {
  background: var(--theme-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--theme-accent);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--theme-secondary);
  color: #333;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Footer */
footer {
  background: #333;
  color: white;
  padding: 3rem 0 1rem;
  margin-top: 4rem;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.footer-section h4 {
  margin-bottom: 1rem;
  color: var(--theme-primary);
}

.footer-section ul {
  list-style: none;
}

.footer-section ul li {
  margin: 0.5rem 0;
}

.footer-section a {
  color: #ccc;
  text-decoration: none;
}

.footer-section a:hover {
  color: var(--theme-primary);
}

/* Responsive design */
@media (max-width: 768px) {
  .hero-block h1 {
    font-size: 2rem;
  }
  
  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  nav {
    flex-direction: column;
    gap: 1rem;
  }
}
`;
  }

  /**
   * Generate basic JavaScript
   */
  generateJavaScript(store) {
    return `
// Generated JavaScript for ${store.name}

// Product view function
function viewProduct(handle) {
  // For now, just show an alert
  // In the future, this could open a product modal or redirect to a product page
  alert('Product details for: ' + handle + '\\n\\nThis feature will be enhanced in future updates.');
}

// Basic smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth'
      });
    }
  });
});

// Basic form handling
document.addEventListener('DOMContentLoaded', function() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      alert('Form submission is not yet implemented. Coming soon!');
    });
  });
});

console.log('🏪 Store: ${store.name} | Domain: ${store.domain} | Generated with Claude Code');
`;
  }

  /**
   * Generate robots.txt
   */
  generateRobotsTxt(store) {
    return `User-agent: *
Allow: /

Sitemap: https://${store.domain}/sitemap.xml

# Generated for ${store.name}`;
  }

  /**
   * Load HTML template from templates directory
   */
  async loadTemplate(templateName) {
    const templatePath = path.join(this.templatesPath, `${templateName}.html`);
    
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf8');
    } else {
      console.warn(`⚠️ Template ${templateName}.html not found, using default template`);
      return this.getDefaultTemplate();
    }
  }

  /**
   * Get default HTML template
   */
  getDefaultTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{meta_title}}</title>
    <meta name="description" content="{{meta_description}}">
    ${`{{favicon_url}}` ? `<link rel="icon" href="{{favicon_url}}">` : ''}
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav>
            <div class="nav-brand">
                {{#if logo_url}}
                <img src="{{logo_url}}" alt="{{store_name}}" class="logo">
                {{else}}
                <h1>{{store_name}}</h1>
                {{/if}}
            </div>
            <div class="nav-links">
                {{nav_links}}
            </div>
        </nav>
    </header>

    <main>
        {{#if page_subtitle}}
        <div class="page-header">
            <h1>{{page_title}}</h1>
            <p class="page-subtitle">{{page_subtitle}}</p>
        </div>
        {{else}}
        <h1>{{page_title}}</h1>
        {{/if}}

        <div class="page-content">
            {{page_content}}
        </div>

        {{#if products_html}}
        <div class="products-section">
            <h2>Our Products</h2>
            <div class="products-grid">
                {{products_html}}
            </div>
        </div>
        {{/if}}
    </main>

    <footer>
        {{footer_content}}
        <div class="footer-bottom">
            <p>&copy; {{new Date().getFullYear()}} {{store_name}}. All rights reserved.</p>
        </div>
    </footer>

    <script src="scripts.js"></script>
</body>
</html>`;
  }

  /**
   * Determine template name based on page type
   */
  getTemplateName(page) {
    const templateMap = {
      'home': 'home',
      'products': 'products',
      'about': 'about',
      'contact': 'contact',
      'terms': 'legal',
      'privacy': 'legal',
      'refund': 'legal',
      'delivery': 'legal'
    };

    return templateMap[page.page_type] || 'default';
  }

  /**
   * Get file name for page
   */
  getPageFileName(page) {
    if (page.page_type === 'home') {
      return 'index.html';
    }
    
    // Use slug if available, otherwise use page_type
    const slug = page.slug || page.page_type;
    return `${slug}.html`;
  }

  /**
   * Ensure directory exists
   */
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Format file size for logging
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

module.exports = TemplateRenderer;