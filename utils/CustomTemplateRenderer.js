const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

class CustomTemplateRenderer {
  /**
   * Generate custom product page using template system
   */
  async generateCustomProductPage(store, product, themeConfig) {
    try {
      const db = require('../database/db');
      const companyId = 1; // For now, single company
      
      // Get template assignment for this product
      const assignment = await db.get(
        'SELECT * FROM template_assignments WHERE company_id = ? AND product_handle = ?',
        [companyId, product.handle]
      );
      
      if (!assignment) {
        console.log(`📄 No custom template assigned for product ${product.handle}`);
        return null;
      }
      
      console.log(`🎨 Generating custom product page for ${product.handle} with template ID ${assignment.template_id}`);
      
      // Get the template configuration
      const template = await db.get(
        'SELECT * FROM product_page_templates WHERE id = ? AND company_id = ?',
        [assignment.template_id, companyId]
      );
      
      if (!template) {
        console.warn(`⚠️ Template ${assignment.template_id} not found`);
        return null;
      }
      
      // Parse template elements and field data
      const elements = JSON.parse(template.elements);
      const fieldData = assignment.template_data ? JSON.parse(assignment.template_data) : {};
      
      console.log(`📝 Using template "${template.name}" with ${elements.length} sections`);
      console.log(`🔧 Custom field data:`, Object.keys(fieldData).length, 'fields');
      
      // Generate the custom HTML
      return await this.renderCustomProductTemplate(store, product, themeConfig, elements, fieldData, template);
      
    } catch (error) {
      console.error(`❌ Error generating custom product page for ${product.handle}:`, error.message);
      return null;
    }
  }

  /**
   * Render custom product template with sections and field data
   */
  async renderCustomProductTemplate(store, product, themeConfig, elements, fieldData, template) {
    // Generate each section HTML based on template elements
    let sectionsHtml = '';
    
    elements.forEach(elementType => {
      sectionsHtml += this.generateSectionHtml(elementType, product, store, fieldData, themeConfig);
    });
    
    // Prepare base template variables
    const primaryVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    const price = primaryVariant ? `${primaryVariant.price.toFixed(2)} ${store.currency}` : 'Price unavailable';
    
    // Generate navigation and footer (using basic versions for now)
    const navLinks = await this.generateBasicNavLinks(store);
    const footerContent = await this.generateBasicFooterContent(store);
    
    const variables = {
      // Store information
      store_name: store.name,
      store_domain: store.domain,
      support_email: store.support_email || `support@${store.domain}`,
      
      // Page meta
      page_title: product.title,
      meta_title: `${product.title} - ${store.name}`,
      meta_description: product.body_html ? product.body_html.substring(0, 160).replace(/<[^>]*>/g, '') : `Buy ${product.title} at ${store.name}`,
      
      // Product information
      product_title: product.title,
      product_price: price,
      product_handle: product.handle,
      
      // Custom template content
      template_sections: sectionsHtml,
      template_name: template.name,
      
      // Theme variables
      theme_primary: themeConfig.primary,
      theme_secondary: themeConfig.secondary,
      theme_accent: themeConfig.accent || themeConfig.primary,
      theme_background: themeConfig.background || '#ffffff',
      theme_surface: themeConfig.surface || '#f8f9fa',
      
      // Navigation and footer
      nav_links: navLinks,
      footer_content: footerContent,
      
      // Utility variables
      current_year: new Date().getFullYear(),
      
      // Path variables for subdirectory
      css_path: '../styles.css',
      js_path: '../scripts.js'
    };
    
    // Use custom product template
    const templateHtml = this.getCustomProductTemplate();
    const compiledTemplate = handlebars.compile(templateHtml);
    return compiledTemplate(variables);
  }

  /**
   * Generate HTML for individual template sections
   */
  generateSectionHtml(elementType, product, store, fieldData, themeConfig) {
    const primaryVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    const primaryImage = product.images && product.images.length > 0 ? product.images[0] : null;
    const price = primaryVariant ? `${primaryVariant.price.toFixed(2)} ${store.currency}` : 'Price unavailable';
    const compareAtPrice = primaryVariant && primaryVariant.compare_at_price 
      ? `${primaryVariant.compare_at_price.toFixed(2)} ${store.currency}`
      : null;
    
    switch (elementType) {
      case 'FreeShippingBar':
        const shippingMessage = fieldData[`template_FreeShippingBar_message`] || 'Free shipping on all orders!';
        return `<div class="free-shipping-bar">${shippingMessage}</div>`;
      
      case 'ProductTitle':
        const subtitle = fieldData[`template_ProductTitle_subtitle`] || '';
        return `
          <div class="product-title-section">
            <h1>${product.title}</h1>
            ${subtitle ? `<p class="product-subtitle">${subtitle}</p>` : ''}
          </div>`;
      
      case 'PricingSection':
        const currencySymbol = fieldData[`template_PricingSection_currency_symbol`] || store.currency;
        const showSavings = fieldData[`template_PricingSection_show_savings`] || false;
        const savingsHtml = showSavings && compareAtPrice && primaryVariant.compare_at_price > primaryVariant.price
          ? `<span class="savings">Save ${currencySymbol}${(primaryVariant.compare_at_price - primaryVariant.price).toFixed(2)}</span>`
          : '';
        return `
          <div class="pricing-section">
            ${compareAtPrice && primaryVariant.compare_at_price > primaryVariant.price
              ? `<span class="price-sale">${currencySymbol}${primaryVariant.price.toFixed(2)}</span> <span class="price-original">${currencySymbol}${primaryVariant.compare_at_price.toFixed(2)}</span>`
              : `<span class="price">${currencySymbol}${primaryVariant ? primaryVariant.price.toFixed(2) : '0.00'}</span>`
            }
            ${savingsHtml}
          </div>`;
      
      case 'ProductImageGallery':
        const imageHtml = primaryImage 
          ? `<img src="${primaryImage.src}" alt="${primaryImage.alt}" class="product-main-image">`
          : `<div class="product-image-placeholder">No Image Available</div>`;
        return `<div class="product-image-gallery">${imageHtml}</div>`;
      
      case 'FreeTextField':
        const customText = fieldData[`template_FreeTextField_content`] || '';
        return customText ? `<div class="free-text-section">${customText}</div>` : '';
      
      case 'ListSection':
        const listTitle = fieldData[`template_ListSection_title`] || 'Features';
        const listItems = fieldData[`template_ListSection_items`] || '';
        const items = listItems.split('\n').filter(item => item.trim());
        const itemsHtml = items.map(item => `<li>${item.trim()}</li>`).join('');
        return items.length > 0 ? `
          <div class="list-section">
            <h3>${listTitle}</h3>
            <ul>${itemsHtml}</ul>
          </div>` : '';
      
      case 'GuaranteeBadge':
        const guaranteeText = fieldData[`template_GuaranteeBadge_guarantee_text`] || '30-Day Money Back Guarantee';
        return `<div class="guarantee-badge">${guaranteeText}</div>`;
      
      case 'ScarcityNotice':
        const scarcityMessage = fieldData[`template_ScarcityNotice_message`] || 'Limited stock available!';
        return `<div class="scarcity-notice">${scarcityMessage}</div>`;
      
      case 'ATCButton':
        return `
          <div class="atc-button-section">
            ${primaryVariant && primaryVariant.available
              ? `<button class="btn btn-primary btn-large atc-button">Add to Cart - ${price}</button>`
              : `<button class="btn btn-secondary btn-large" disabled>Out of Stock</button>`
            }
          </div>`;
      
      case 'QuickBuyButton':
        return `
          <div class="quick-buy-section">
            ${primaryVariant && primaryVariant.available
              ? `<button class="btn btn-accent btn-large quick-buy-button">Buy Now - ${price}</button>`
              : `<button class="btn btn-secondary btn-large" disabled>Out of Stock</button>`
            }
          </div>`;
      
      case 'TrustIndicators':
        return `
          <div class="trust-indicators">
            <div class="trust-item">🔒 Secure Checkout</div>
            <div class="trust-item">🚚 Fast Shipping</div>
            <div class="trust-item">↩️ Easy Returns</div>
          </div>`;
      
      default:
        console.log(`⚠️ Unknown section type: ${elementType}`);
        return '';
    }
  }

  /**
   * Generate basic navigation links
   */
  async generateBasicNavLinks(store) {
    return `
      <a href="/">${store.name}</a>
      <a href="/products.html">Our Products</a>
      <a href="/about.html">About</a>
      <a href="/contact.html">Contact</a>
      <a href="/delivery.html">Shipping</a>
    `;
  }

  /**
   * Generate basic footer content
   */
  async generateBasicFooterContent(store) {
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
          <li><a href="/terms.html">Terms - ${store.name}</a></li>
          <li><a href="/privacy.html">Privacy Policy</a></li>
          <li><a href="/refund.html">Return Policy</a></li>
          <li><a href="/delivery.html">Shipping Policy</a></li>
        </ul>
      </div>
    </div>`;
  }

  /**
   * Get custom product template HTML structure
   */
  getCustomProductTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{meta_title}}</title>
    <meta name="description" content="{{meta_description}}">
    <link rel="icon" href="">
    <link rel="stylesheet" href="{{css_path}}">
    <style>
        /* Custom template styles */
        .free-shipping-bar {
            background: var(--theme-primary);
            color: white;
            text-align: center;
            padding: 0.5rem;
            font-weight: bold;
        }
        .product-title-section {
            text-align: center;
            margin: 2rem 0;
        }
        .product-subtitle {
            color: #666;
            font-size: 1.1rem;
            margin-top: 0.5rem;
        }
        .pricing-section {
            text-align: center;
            margin: 2rem 0;
            font-size: 1.5rem;
        }
        .price-sale {
            color: #e74c3c;
            font-weight: bold;
        }
        .price-original {
            text-decoration: line-through;
            color: #999;
            margin-left: 0.5rem;
        }
        .price {
            color: var(--theme-primary);
            font-weight: bold;
        }
        .savings {
            background: #27ae60;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            margin-left: 1rem;
        }
        .product-image-gallery {
            text-align: center;
            margin: 2rem 0;
        }
        .product-main-image {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
        }
        .free-text-section {
            margin: 2rem 0;
            padding: 1.5rem;
            background: var(--theme-surface);
            border-radius: 8px;
        }
        .list-section {
            margin: 2rem 0;
        }
        .list-section ul {
            list-style: none;
            padding: 0;
        }
        .list-section li {
            padding: 0.5rem 0;
            border-bottom: 1px solid #eee;
        }
        .list-section li:before {
            content: "✓";
            color: var(--theme-primary);
            font-weight: bold;
            margin-right: 0.5rem;
        }
        .guarantee-badge {
            background: #27ae60;
            color: white;
            text-align: center;
            padding: 1rem;
            border-radius: 8px;
            font-weight: bold;
            margin: 2rem 0;
        }
        .scarcity-notice {
            background: #e74c3c;
            color: white;
            text-align: center;
            padding: 1rem;
            border-radius: 8px;
            font-weight: bold;
            margin: 2rem 0;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
        .atc-button-section, .quick-buy-section {
            text-align: center;
            margin: 2rem 0;
        }
        .btn-accent {
            background: var(--theme-accent);
            color: white;
        }
        .trust-indicators {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin: 2rem 0;
            padding: 1rem;
            background: var(--theme-surface);
            border-radius: 8px;
        }
        .trust-item {
            text-align: center;
            font-size: 0.9rem;
            color: #666;
        }
        @media (max-width: 768px) {
            .trust-indicators {
                flex-direction: column;
                gap: 1rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <nav>
            <div class="nav-brand">
                <h1>{{store_name}}</h1>
            </div>
            <div class="nav-links">
                {{{nav_links}}}
            </div>
        </nav>
    </header>

    <main class="custom-product-page">
        <div class="container">
            <!-- Generated template sections -->
            {{{template_sections}}}
            
            <!-- Back to products link -->
            <div style="text-align: center; margin: 3rem 0;">
                <a href="../products.html" class="btn btn-outline">← Back to Products</a>
            </div>
        </div>
    </main>

    <footer>
        {{{footer_content}}}
        <div class="footer-bottom">
            <p>&copy; {{current_year}} {{store_name}}. All rights reserved.</p>
        </div>
    </footer>

    <script src="{{js_path}}"></script>
    <script>
        console.log('🎨 Custom product page generated with template: {{template_name}}');
    </script>
</body>
</html>`;
  }
}

module.exports = CustomTemplateRenderer;