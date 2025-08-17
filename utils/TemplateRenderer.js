const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TemplateRenderer {
  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
    this.storesPath = path.join(process.cwd(), 'stores');
  }

  /**
   * Generate all store files for a given store
   */
  async generateStoreFiles(store, pages) {
    try {
      console.log(`🎨 Generating store files for ${store.name} (${store.domain})`);
      
      const storePath = path.join(this.storesPath, store.domain);
      
      // Create store directory if it doesn't exist
      if (!fs.existsSync(storePath)) {
        fs.mkdirSync(storePath, { recursive: true });
        console.log(`✅ Created directory: ${storePath}`);
      }

      // Generate each page
      for (const page of pages) {
        await this.generatePage(store, page, storePath);
      }

      // Generate additional assets
      await this.generateAssets(store, storePath);
      
      console.log(`✅ All files generated for ${store.name}`);
      
      // 🚀 GIT AUTOMATION: Add, commit, and push to GitHub
      await this.autoCommitAndPush(store, storePath);
      
      return storePath;
      
    } catch (error) {
      console.error(`❌ Error generating store files for ${store.name}:`, error);
      throw error;
    }
  }

  /**
   * Generate a single page HTML file
   */
  async generatePage(store, page, storePath) {
    try {
      console.log(`📄 Generating page: ${page.page_type}`);
      
      // Determine file name
      let fileName;
      if (page.page_type === 'home' || page.slug === '') {
        fileName = 'index.html';
      } else {
        fileName = `${page.slug || page.page_type}.html`;
      }

      // Generate HTML content
      const htmlContent = await this.renderPageHTML(store, page);
      
      // Write file
      const filePath = path.join(storePath, fileName);
      fs.writeFileSync(filePath, htmlContent, 'utf8');
      
      console.log(`✅ Generated: ${fileName}`);
      
    } catch (error) {
      console.error(`❌ Error generating page ${page.page_type}:`, error);
      throw error;
    }
  }

  /**
   * Render HTML content for a page
   */
  async renderPageHTML(store, page) {
    try {
      // Parse content blocks
      let contentBlocks = [];
      if (page.content) {
        try {
          contentBlocks = JSON.parse(page.content);
        } catch (parseError) {
          console.warn(`Warning: Could not parse content blocks for ${page.page_type}`);
          contentBlocks = [{ type: 'text', content: page.content }];
        }
      }

      // Parse template data
      let templateData = {};
      if (page.template_data) {
        try {
          templateData = JSON.parse(page.template_data);
        } catch (parseError) {
          console.warn(`Warning: Could not parse template data for ${page.page_type}`);
        }
      }

      // Generate page based on page type
      switch (page.page_type) {
        case 'home':
          return this.renderHomePage(store, page, contentBlocks, templateData);
        case 'products':
          return this.renderProductsPage(store, page, contentBlocks, templateData);
        case 'about':
          return this.renderAboutPage(store, page, contentBlocks, templateData);
        case 'contact':
          return this.renderContactPage(store, page, contentBlocks, templateData);
        default:
          return this.renderGenericPage(store, page, contentBlocks, templateData);
      }
      
    } catch (error) {
      console.error(`Error rendering page HTML for ${page.page_type}:`, error);
      throw error;
    }
  }

  /**
   * Render homepage HTML
   */
  renderHomePage(store, page, contentBlocks, templateData) {
    const heroSection = contentBlocks.find(block => block.type === 'hero') || {};
    const featuresSection = contentBlocks.find(block => block.type === 'features') || {};
    
    return `<!DOCTYPE html>
<html lang="${store.language || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.meta_title || page.title || store.name}</title>
    <meta name="description" content="${page.meta_description || page.subtitle || ''}">
    <link rel="icon" href="${store.favicon_url || '/favicon.ico'}">
    
    <style>
        :root {
            --primary-color: ${store.primary_color || '#007cba'};
            --secondary-color: ${store.secondary_color || '#f8f9fa'};
            --text-primary: #1a1a1a;
            --text-secondary: #666;
            --background: #ffffff;
            --border-light: #e1e1e1;
            --spacing-sm: 1rem;
            --spacing-md: 1.5rem;
            --spacing-lg: 2rem;
            --spacing-xl: 3rem;
            --container-max: 1200px;
            --border-radius: 8px;
            --box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--background);
        }
        
        .container {
            max-width: var(--container-max);
            margin: 0 auto;
            padding: 0 var(--spacing-sm);
        }
        
        /* Header */
        .header {
            background: white;
            box-shadow: var(--box-shadow);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--spacing-sm) 0;
        }
        
        .logo {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--primary-color);
            text-decoration: none;
        }
        
        .logo img {
            height: 40px;
            width: auto;
        }
        
        .nav {
            display: flex;
            gap: var(--spacing-md);
        }
        
        .nav a {
            color: var(--text-primary);
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: var(--border-radius);
            transition: all 0.3s ease;
        }
        
        .nav a:hover {
            background: var(--secondary-color);
            color: var(--primary-color);
        }
        
        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            padding: var(--spacing-xl) 0;
            text-align: center;
            color: white;
        }
        
        .hero h1 {
            font-size: 3rem;
            margin-bottom: var(--spacing-md);
            font-weight: 700;
        }
        
        .hero p {
            font-size: 1.2rem;
            margin-bottom: var(--spacing-lg);
            opacity: 0.9;
        }
        
        .cta-button {
            display: inline-block;
            background: white;
            color: var(--primary-color);
            padding: 1rem 2rem;
            border-radius: var(--border-radius);
            text-decoration: none;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-shadow: var(--box-shadow);
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        
        /* Features Section */
        .features {
            padding: var(--spacing-xl) 0;
            background: var(--secondary-color);
        }
        
        .features h2 {
            text-align: center;
            margin-bottom: var(--spacing-lg);
            font-size: 2.5rem;
            color: var(--text-primary);
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: var(--spacing-lg);
            margin-top: var(--spacing-lg);
        }
        
        .feature-card {
            background: white;
            padding: var(--spacing-lg);
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
            text-align: center;
            transition: transform 0.3s ease;
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
        }
        
        .feature-card h3 {
            color: var(--primary-color);
            margin-bottom: var(--spacing-sm);
            font-size: 1.3rem;
        }
        
        .feature-card p {
            color: var(--text-secondary);
        }
        
        /* Footer */
        .footer {
            background: var(--text-primary);
            color: white;
            text-align: center;
            padding: var(--spacing-lg) 0;
        }
        
        .footer p {
            opacity: 0.8;
        }
        
        .footer a {
            color: var(--primary-color);
            text-decoration: none;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2rem;
            }
            
            .nav {
                display: none;
            }
            
            .features-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <div class="header-content">
                ${store.logo_url 
                  ? `<a href="/" class="logo"><img src="${store.logo_url}" alt="${store.name}"></a>`
                  : `<a href="/" class="logo">${store.name}</a>`
                }
                <nav class="nav">
                    <a href="/">Home</a>
                    <a href="/products">Products</a>
                    <a href="/about">About</a>
                    <a href="/contact">Contact</a>
                </nav>
            </div>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <h1>${heroSection.title || page.title || `Welcome to ${store.name}`}</h1>
            <p>${heroSection.subtitle || page.subtitle || 'Discover amazing products crafted just for you'}</p>
            <a href="/products" class="cta-button">${heroSection.cta || 'Shop Now'}</a>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features">
        <div class="container">
            <h2>Why Choose ${store.name}?</h2>
            <div class="features-grid">
                ${(featuresSection.items || [
                    { title: 'Quality Products', description: 'Carefully curated selection of premium items' },
                    { title: 'Fast Shipping', description: 'Quick and reliable delivery worldwide' },
                    { title: 'Great Support', description: '24/7 customer service and support' }
                ]).map(feature => `
                    <div class="feature-card">
                        <h3>${feature.title}</h3>
                        <p>${feature.description}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} ${store.name}. All rights reserved.</p>
            ${store.support_email ? `<p>Contact us: <a href="mailto:${store.support_email}">${store.support_email}</a></p>` : ''}
        </div>
    </footer>
</body>
</html>`;
  }

  /**
   * Render products page HTML
   */
  renderProductsPage(store, page, contentBlocks, templateData) {
    return `<!DOCTYPE html>
<html lang="${store.language || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.meta_title || page.title || `Products - ${store.name}`}</title>
    <meta name="description" content="${page.meta_description || page.subtitle || ''}">
    <link rel="icon" href="${store.favicon_url || '/favicon.ico'}">
    
    <style>
        :root {
            --primary-color: ${store.primary_color || '#007cba'};
            --secondary-color: ${store.secondary_color || '#f8f9fa'};
            --text-primary: #1a1a1a;
            --text-secondary: #666;
            --background: #ffffff;
            --border-light: #e1e1e1;
            --spacing-sm: 1rem;
            --spacing-md: 1.5rem;
            --spacing-lg: 2rem;
            --spacing-xl: 3rem;
            --container-max: 1200px;
            --border-radius: 8px;
            --box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--background);
        }
        
        .container {
            max-width: var(--container-max);
            margin: 0 auto;
            padding: 0 var(--spacing-sm);
        }
        
        /* Header */
        .header {
            background: white;
            box-shadow: var(--box-shadow);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--spacing-sm) 0;
        }
        
        .logo {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--primary-color);
            text-decoration: none;
        }
        
        .logo img {
            height: 40px;
            width: auto;
        }
        
        .nav {
            display: flex;
            gap: var(--spacing-md);
        }
        
        .nav a {
            color: var(--text-primary);
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: var(--border-radius);
            transition: all 0.3s ease;
        }
        
        .nav a:hover,
        .nav a.active {
            background: var(--secondary-color);
            color: var(--primary-color);
        }
        
        /* Main Content */
        .main {
            padding: var(--spacing-xl) 0;
        }
        
        .page-title {
            text-align: center;
            margin-bottom: var(--spacing-lg);
        }
        
        .page-title h1 {
            font-size: 2.5rem;
            color: var(--text-primary);
            margin-bottom: var(--spacing-sm);
        }
        
        .page-title p {
            font-size: 1.1rem;
            color: var(--text-secondary);
        }
        
        /* Products Grid */
        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: var(--spacing-lg);
        }
        
        .product-card {
            background: white;
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
            overflow: hidden;
            transition: transform 0.3s ease;
        }
        
        .product-card:hover {
            transform: translateY(-5px);
        }
        
        .product-image {
            width: 100%;
            height: 250px;
            background: var(--secondary-color);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            font-size: 1.1rem;
        }
        
        .product-info {
            padding: var(--spacing-md);
        }
        
        .product-title {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: var(--spacing-sm);
            color: var(--text-primary);
        }
        
        .product-description {
            color: var(--text-secondary);
            margin-bottom: var(--spacing-sm);
            font-size: 0.9rem;
        }
        
        .product-price {
            font-size: 1.3rem;
            font-weight: bold;
            color: var(--primary-color);
        }
        
        /* Coming Soon Message */
        .coming-soon {
            text-align: center;
            padding: var(--spacing-xl);
            background: var(--secondary-color);
            border-radius: var(--border-radius);
            margin: var(--spacing-lg) 0;
        }
        
        .coming-soon h2 {
            color: var(--primary-color);
            margin-bottom: var(--spacing-sm);
        }
        
        .coming-soon p {
            color: var(--text-secondary);
        }
        
        /* Footer */
        .footer {
            background: var(--text-primary);
            color: white;
            text-align: center;
            padding: var(--spacing-lg) 0;
        }
        
        .footer p {
            opacity: 0.8;
        }
        
        .footer a {
            color: var(--primary-color);
            text-decoration: none;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
            .page-title h1 {
                font-size: 2rem;
            }
            
            .nav {
                display: none;
            }
            
            .products-grid {
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <div class="header-content">
                ${store.logo_url 
                  ? `<a href="/" class="logo"><img src="${store.logo_url}" alt="${store.name}"></a>`
                  : `<a href="/" class="logo">${store.name}</a>`
                }
                <nav class="nav">
                    <a href="/">Home</a>
                    <a href="/products" class="active">Products</a>
                    <a href="/about">About</a>
                    <a href="/contact">Contact</a>
                </nav>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main">
        <div class="container">
            <div class="page-title">
                <h1>${page.title || 'Our Products'}</h1>
                <p>${page.subtitle || 'Discover our amazing collection of products'}</p>
            </div>

            ${store.shopify_connected ? `
                <div class="coming-soon">
                    <h2>Products Loading</h2>
                    <p>Our products are being synced from Shopify. They will appear here soon!</p>
                    <p><strong>Store:</strong> ${store.shopify_shop_name || store.shopify_domain}</p>
                </div>
            ` : `
                <div class="coming-soon">
                    <h2>Products Coming Soon</h2>
                    <p>We're working hard to bring you an amazing selection of products.</p>
                    <p>Please check back soon or <a href="/contact">contact us</a> for more information.</p>
                </div>
            `}
        </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} ${store.name}. All rights reserved.</p>
            ${store.support_email ? `<p>Contact us: <a href="mailto:${store.support_email}">${store.support_email}</a></p>` : ''}
        </div>
    </footer>
</body>
</html>`;
  }

  /**
   * Render about page HTML
   */
  renderAboutPage(store, page, contentBlocks, templateData) {
    const textBlocks = contentBlocks.filter(block => block.type === 'text');
    
    return `<!DOCTYPE html>
<html lang="${store.language || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.meta_title || page.title || `About - ${store.name}`}</title>
    <meta name="description" content="${page.meta_description || page.subtitle || ''}">
    <link rel="icon" href="${store.favicon_url || '/favicon.ico'}">
    
    <style>
        :root {
            --primary-color: ${store.primary_color || '#007cba'};
            --secondary-color: ${store.secondary_color || '#f8f9fa'};
            --text-primary: #1a1a1a;
            --text-secondary: #666;
            --background: #ffffff;
            --border-light: #e1e1e1;
            --spacing-sm: 1rem;
            --spacing-md: 1.5rem;
            --spacing-lg: 2rem;
            --spacing-xl: 3rem;
            --container-max: 1200px;
            --border-radius: 8px;
            --box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--background);
        }
        
        .container {
            max-width: var(--container-max);
            margin: 0 auto;
            padding: 0 var(--spacing-sm);
        }
        
        /* Header */
        .header {
            background: white;
            box-shadow: var(--box-shadow);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--spacing-sm) 0;
        }
        
        .logo {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--primary-color);
            text-decoration: none;
        }
        
        .logo img {
            height: 40px;
            width: auto;
        }
        
        .nav {
            display: flex;
            gap: var(--spacing-md);
        }
        
        .nav a {
            color: var(--text-primary);
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: var(--border-radius);
            transition: all 0.3s ease;
        }
        
        .nav a:hover,
        .nav a.active {
            background: var(--secondary-color);
            color: var(--primary-color);
        }
        
        /* Main Content */
        .main {
            padding: var(--spacing-xl) 0;
        }
        
        .page-title {
            text-align: center;
            margin-bottom: var(--spacing-lg);
        }
        
        .page-title h1 {
            font-size: 2.5rem;
            color: var(--text-primary);
            margin-bottom: var(--spacing-sm);
        }
        
        .page-title p {
            font-size: 1.1rem;
            color: var(--text-secondary);
        }
        
        .content {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .content-block {
            background: white;
            padding: var(--spacing-lg);
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
            margin-bottom: var(--spacing-lg);
        }
        
        .content-block h2 {
            color: var(--primary-color);
            margin-bottom: var(--spacing-md);
            font-size: 1.5rem;
        }
        
        .content-block p {
            color: var(--text-secondary);
            margin-bottom: var(--spacing-sm);
            font-size: 1.1rem;
        }
        
        /* Footer */
        .footer {
            background: var(--text-primary);
            color: white;
            text-align: center;
            padding: var(--spacing-lg) 0;
        }
        
        .footer p {
            opacity: 0.8;
        }
        
        .footer a {
            color: var(--primary-color);
            text-decoration: none;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
            .page-title h1 {
                font-size: 2rem;
            }
            
            .nav {
                display: none;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <div class="header-content">
                ${store.logo_url 
                  ? `<a href="/" class="logo"><img src="${store.logo_url}" alt="${store.name}"></a>`
                  : `<a href="/" class="logo">${store.name}</a>`
                }
                <nav class="nav">
                    <a href="/">Home</a>
                    <a href="/products">Products</a>
                    <a href="/about" class="active">About</a>
                    <a href="/contact">Contact</a>
                </nav>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main">
        <div class="container">
            <div class="page-title">
                <h1>${page.title || `About ${store.name}`}</h1>
                <p>${page.subtitle || 'Learn more about our story and mission'}</p>
            </div>

            <div class="content">
                ${textBlocks.length > 0 ? textBlocks.map(block => `
                    <div class="content-block">
                        <p>${block.content}</p>
                    </div>
                `).join('') : `
                    <div class="content-block">
                        <h2>Our Story</h2>
                        <p>Welcome to ${store.name}! We are dedicated to providing you with the highest quality products and exceptional customer service.</p>
                        <p>Founded with a passion for excellence, our team works tirelessly to bring you carefully curated products that meet our strict standards for quality and value.</p>
                        <p>Thank you for choosing ${store.name}. We look forward to serving you!</p>
                    </div>
                `}
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} ${store.name}. All rights reserved.</p>
            ${store.support_email ? `<p>Contact us: <a href="mailto:${store.support_email}">${store.support_email}</a></p>` : ''}
        </div>
    </footer>
</body>
</html>`;
  }

  /**
   * Render contact page HTML
   */
  renderContactPage(store, page, contentBlocks, templateData) {
    return `<!DOCTYPE html>
<html lang="${store.language || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.meta_title || page.title || `Contact - ${store.name}`}</title>
    <meta name="description" content="${page.meta_description || page.subtitle || ''}">
    <link rel="icon" href="${store.favicon_url || '/favicon.ico'}">
    
    <style>
        :root {
            --primary-color: ${store.primary_color || '#007cba'};
            --secondary-color: ${store.secondary_color || '#f8f9fa'};
            --text-primary: #1a1a1a;
            --text-secondary: #666;
            --background: #ffffff;
            --border-light: #e1e1e1;
            --spacing-sm: 1rem;
            --spacing-md: 1.5rem;
            --spacing-lg: 2rem;
            --spacing-xl: 3rem;
            --container-max: 1200px;
            --border-radius: 8px;
            --box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--background);
        }
        
        .container {
            max-width: var(--container-max);
            margin: 0 auto;
            padding: 0 var(--spacing-sm);
        }
        
        /* Header */
        .header {
            background: white;
            box-shadow: var(--box-shadow);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--spacing-sm) 0;
        }
        
        .logo {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--primary-color);
            text-decoration: none;
        }
        
        .logo img {
            height: 40px;
            width: auto;
        }
        
        .nav {
            display: flex;
            gap: var(--spacing-md);
        }
        
        .nav a {
            color: var(--text-primary);
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: var(--border-radius);
            transition: all 0.3s ease;
        }
        
        .nav a:hover,
        .nav a.active {
            background: var(--secondary-color);
            color: var(--primary-color);
        }
        
        /* Main Content */
        .main {
            padding: var(--spacing-xl) 0;
        }
        
        .page-title {
            text-align: center;
            margin-bottom: var(--spacing-lg);
        }
        
        .page-title h1 {
            font-size: 2.5rem;
            color: var(--text-primary);
            margin-bottom: var(--spacing-sm);
        }
        
        .page-title p {
            font-size: 1.1rem;
            color: var(--text-secondary);
        }
        
        .contact-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--spacing-xl);
            margin-top: var(--spacing-lg);
        }
        
        .contact-form {
            background: white;
            padding: var(--spacing-lg);
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
        }
        
        .contact-info {
            background: var(--secondary-color);
            padding: var(--spacing-lg);
            border-radius: var(--border-radius);
        }
        
        .form-group {
            margin-bottom: var(--spacing-md);
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border-light);
            border-radius: var(--border-radius);
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--primary-color);
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 120px;
        }
        
        .submit-button {
            background: var(--primary-color);
            color: white;
            padding: 1rem 2rem;
            border: none;
            border-radius: var(--border-radius);
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
        }
        
        .submit-button:hover {
            background: color-mix(in srgb, var(--primary-color) 85%, black);
            transform: translateY(-2px);
        }
        
        .contact-info h3 {
            color: var(--primary-color);
            margin-bottom: var(--spacing-md);
            font-size: 1.3rem;
        }
        
        .contact-info p {
            color: var(--text-secondary);
            margin-bottom: var(--spacing-sm);
        }
        
        .contact-info a {
            color: var(--primary-color);
            text-decoration: none;
        }
        
        .contact-info a:hover {
            text-decoration: underline;
        }
        
        /* Footer */
        .footer {
            background: var(--text-primary);
            color: white;
            text-align: center;
            padding: var(--spacing-lg) 0;
        }
        
        .footer p {
            opacity: 0.8;
        }
        
        .footer a {
            color: var(--primary-color);
            text-decoration: none;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
            .page-title h1 {
                font-size: 2rem;
            }
            
            .nav {
                display: none;
            }
            
            .contact-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <div class="header-content">
                ${store.logo_url 
                  ? `<a href="/" class="logo"><img src="${store.logo_url}" alt="${store.name}"></a>`
                  : `<a href="/" class="logo">${store.name}</a>`
                }
                <nav class="nav">
                    <a href="/">Home</a>
                    <a href="/products">Products</a>
                    <a href="/about">About</a>
                    <a href="/contact" class="active">Contact</a>
                </nav>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main">
        <div class="container">
            <div class="page-title">
                <h1>${page.title || 'Contact Us'}</h1>
                <p>${page.subtitle || 'Get in touch with us - we\'d love to hear from you'}</p>
            </div>

            <div class="contact-grid">
                <div class="contact-form">
                    <form action="#" method="POST">
                        <div class="form-group">
                            <label for="name">Full Name</label>
                            <input type="text" id="name" name="name" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="email">Email Address</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="subject">Subject</label>
                            <input type="text" id="subject" name="subject" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="message">Message</label>
                            <textarea id="message" name="message" required placeholder="Tell us how we can help you..."></textarea>
                        </div>
                        
                        <button type="submit" class="submit-button">Send Message</button>
                    </form>
                </div>
                
                <div class="contact-info">
                    <h3>Get in Touch</h3>
                    <p>We're here to help and answer any questions you might have. We look forward to hearing from you!</p>
                    
                    ${store.support_email ? `
                        <p><strong>Email:</strong><br>
                        <a href="mailto:${store.support_email}">${store.support_email}</a></p>
                    ` : ''}
                    
                    ${store.support_phone ? `
                        <p><strong>Phone:</strong><br>
                        <a href="tel:${store.support_phone}">${store.support_phone}</a></p>
                    ` : ''}
                    
                    ${store.business_address ? `
                        <p><strong>Address:</strong><br>
                        ${store.business_address}</p>
                    ` : ''}
                    
                    <p><strong>Response Time:</strong><br>
                    We typically respond within 24 hours</p>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} ${store.name}. All rights reserved.</p>
            ${store.support_email ? `<p>Contact us: <a href="mailto:${store.support_email}">${store.support_email}</a></p>` : ''}
        </div>
    </footer>
</body>
</html>`;
  }

  /**
   * Render generic page HTML
   */
  renderGenericPage(store, page, contentBlocks, templateData) {
    return `<!DOCTYPE html>
<html lang="${store.language || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.meta_title || page.title || `${page.page_type} - ${store.name}`}</title>
    <meta name="description" content="${page.meta_description || page.subtitle || ''}">
    <link rel="icon" href="${store.favicon_url || '/favicon.ico'}">
    
    <style>
        :root {
            --primary-color: ${store.primary_color || '#007cba'};
            --secondary-color: ${store.secondary_color || '#f8f9fa'};
            --text-primary: #1a1a1a;
            --text-secondary: #666;
            --background: #ffffff;
            --border-light: #e1e1e1;
            --spacing-sm: 1rem;
            --spacing-md: 1.5rem;
            --spacing-lg: 2rem;
            --spacing-xl: 3rem;
            --container-max: 1200px;
            --border-radius: 8px;
            --box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--background);
        }
        
        .container {
            max-width: var(--container-max);
            margin: 0 auto;
            padding: 0 var(--spacing-sm);
        }
        
        /* Header */
        .header {
            background: white;
            box-shadow: var(--box-shadow);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--spacing-sm) 0;
        }
        
        .logo {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--primary-color);
            text-decoration: none;
        }
        
        .logo img {
            height: 40px;
            width: auto;
        }
        
        .nav {
            display: flex;
            gap: var(--spacing-md);
        }
        
        .nav a {
            color: var(--text-primary);
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: var(--border-radius);
            transition: all 0.3s ease;
        }
        
        .nav a:hover {
            background: var(--secondary-color);
            color: var(--primary-color);
        }
        
        /* Main Content */
        .main {
            padding: var(--spacing-xl) 0;
        }
        
        .page-title {
            text-align: center;
            margin-bottom: var(--spacing-lg);
        }
        
        .page-title h1 {
            font-size: 2.5rem;
            color: var(--text-primary);
            margin-bottom: var(--spacing-sm);
        }
        
        .page-title p {
            font-size: 1.1rem;
            color: var(--text-secondary);
        }
        
        .content {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: var(--spacing-lg);
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
        }
        
        .content p {
            color: var(--text-secondary);
            margin-bottom: var(--spacing-sm);
            font-size: 1.1rem;
        }
        
        /* Footer */
        .footer {
            background: var(--text-primary);
            color: white;
            text-align: center;
            padding: var(--spacing-lg) 0;
        }
        
        .footer p {
            opacity: 0.8;
        }
        
        .footer a {
            color: var(--primary-color);
            text-decoration: none;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
            .page-title h1 {
                font-size: 2rem;
            }
            
            .nav {
                display: none;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <div class="header-content">
                ${store.logo_url 
                  ? `<a href="/" class="logo"><img src="${store.logo_url}" alt="${store.name}"></a>`
                  : `<a href="/" class="logo">${store.name}</a>`
                }
                <nav class="nav">
                    <a href="/">Home</a>
                    <a href="/products">Products</a>
                    <a href="/about">About</a>
                    <a href="/contact">Contact</a>
                </nav>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main">
        <div class="container">
            <div class="page-title">
                <h1>${page.title || page.page_type.charAt(0).toUpperCase() + page.page_type.slice(1)}</h1>
                ${page.subtitle ? `<p>${page.subtitle}</p>` : ''}
            </div>

            <div class="content">
                ${contentBlocks.length > 0 ? contentBlocks.map(block => `
                    <p>${block.content || ''}</p>
                `).join('') : `
                    <p>Welcome to the ${page.page_type} page of ${store.name}.</p>
                    <p>This page is currently being built. Please check back soon for updates!</p>
                `}
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} ${store.name}. All rights reserved.</p>
            ${store.support_email ? `<p>Contact us: <a href="mailto:${store.support_email}">${store.support_email}</a></p>` : ''}
        </div>
    </footer>
</body>
</html>`;
  }

  /**
   * Generate additional assets (CSS, robots.txt, sitemap, etc.)
   */
  async generateAssets(store, storePath) {
    try {
      // Generate robots.txt
      const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://${store.domain}/sitemap.xml`;
      
      fs.writeFileSync(path.join(storePath, 'robots.txt'), robotsTxt, 'utf8');
      
      // Generate basic sitemap.xml
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${store.domain}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${store.domain}/products</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://${store.domain}/about</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://${store.domain}/contact</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;
      
      fs.writeFileSync(path.join(storePath, 'sitemap.xml'), sitemapXml, 'utf8');
      
      console.log('✅ Generated SEO assets (robots.txt, sitemap.xml)');
      
    } catch (error) {
      console.error('Error generating assets:', error);
      throw error;
    }
  }

  /**
   * Automatically commit and push store files to GitHub
   */
  async autoCommitAndPush(store, storePath) {
    try {
      console.log(`🔧 Auto-committing store files for ${store.name}...`);
      
      // Change to project root directory
      const projectRoot = process.cwd();
      
      // Add the store directory to git
      const relativePath = path.relative(projectRoot, storePath);
      execSync(`git add "${relativePath}"`, { cwd: projectRoot });
      console.log(`✅ Added store files to git: ${relativePath}`);
      
      // Also add database changes to the same commit
      execSync('git add database/multistore.db', { cwd: projectRoot });
      console.log('✅ Added database changes to git');
      
      // Create commit message
      const commitMessage = `Add ${store.name} store files and deployment

Domain: ${store.domain}
Country: ${store.country}
Language: ${store.language}
Currency: ${store.currency}

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>`;
      
      // Commit the changes using HEREDOC to handle multi-line messages properly
      execSync(`git commit -m "$(cat <<'EOF'
${commitMessage}
EOF
)"`, { cwd: projectRoot });
      console.log(`✅ Committed changes for ${store.name}`);
      
      // Push to GitHub
      execSync('git push', { cwd: projectRoot });
      console.log(`🚀 Pushed to GitHub successfully!`);
      
      console.log(`✅ Git automation completed for ${store.name}`);
      console.log(`🌐 Files should now appear on GitHub and trigger Vercel deployment`);
      
    } catch (error) {
      console.error(`❌ Git automation failed for ${store.name}:`, error.message);
      console.error('Full error details:', error);
      console.warn(`⚠️ Store files were created locally but not pushed to GitHub`);
      console.warn(`🔧 Manual push required:`);
      console.warn(`   git add stores/${store.domain}/`);
      console.warn(`   git add database/multistore.db`);
      console.warn(`   git commit -m "Add ${store.name} store files"`);
      console.warn(`   git push`);
      
      // Don't throw error - store creation should succeed even if git fails
      // throw error;
    }
  }
}

module.exports = TemplateRenderer;