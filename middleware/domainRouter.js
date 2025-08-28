const Store = require('../models/Store');
const path = require('path');
const fs = require('fs');

/**
 * Domain routing middleware for Express
 * This handles serving store files based on the hostname
 */
const domainRouter = async (req, res, next) => {
  try {
    // Skip for admin and API routes
    if (req.path.startsWith('/admin') || req.path.startsWith('/api') || req.path.startsWith('/public')) {
      return next();
    }

    // Get the hostname
    const hostname = req.get('host') || req.hostname;
    console.log(`🌐 Domain router: ${hostname} requesting ${req.path}`);
    
    if (!hostname) {
      return next();
    }

    // Clean domain (remove www prefix and port)
    const cleanDomain = hostname.replace(/^www\./, '').split(':')[0];
    
    // Skip localhost and known development domains
    if (cleanDomain === 'localhost' || cleanDomain.includes('127.0.0.1') || cleanDomain.includes('.local')) {
      return next();
    }

    // Try to find the store by domain
    const store = await Store.findByDomain(cleanDomain);
    
    if (!store) {
      // No store found for this domain - let Express handle normally
      return next();
    }

    // Check if store is deployed
    if (store.deployment_status !== 'deployed') {
      return res.status(503).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Store Deploying - ${store.name}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: linear-gradient(135deg, ${store.primary_color || '#007cba'}, ${store.secondary_color || '#f8f9fa'}); 
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              max-width: 600px; 
              background: white; 
              padding: 40px; 
              border-radius: 15px; 
              box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
            }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; margin-bottom: 15px; }
            .spinner { 
              border: 4px solid #f3f3f3;
              border-top: 4px solid ${store.primary_color || '#007cba'};
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
          <meta http-equiv="refresh" content="10">
        </head>
        <body>
          <div class="container">
            <h1>${store.name}</h1>
            <div class="spinner"></div>
            <p>Your store is being deployed and will be available shortly.</p>
            <p>Status: <strong>${store.deployment_status}</strong></p>
            <p>This page will refresh automatically.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Determine which file to serve
    let requestedPath = req.path;
    const storePath = path.join(process.cwd(), 'stores', cleanDomain);
    
    // Check if store directory exists
    if (!fs.existsSync(storePath)) {
      console.warn(`Store directory not found: ${storePath}`);
      return next();
    }

    let filePath;
    
    if (!requestedPath || requestedPath === '/' || requestedPath === '') {
      // Serve homepage
      filePath = path.join(storePath, 'index.html');
    } else {
      // Clean the path
      const cleanPath = requestedPath.replace(/^\/+/, '').replace(/\/+$/, '');
      
      // Check if this is a product detail request
      if (cleanPath.startsWith('products/') && cleanPath.split('/').length === 2) {
        const productHandle = cleanPath.split('/')[1];
        console.log(`🛒 Domain router: Attempting to render product ${productHandle} for ${hostname}`);
        
        // Dynamically render product detail page
        try {
          const product = await store.getShopifyProduct(productHandle);
          if (product) {
            // Get all pages for navigation
            const storePages = await store.getPages();
            
            // Render product detail page
            const ejs = require('ejs');
            const templatePath = path.join(process.cwd(), 'views', 'product-detail.ejs');
            const html = await ejs.renderFile(templatePath, {
              title: `${product.title} - ${store.name}`,
              store: store,
              product: product,
              allPages: storePages,
              metaDescription: product.description ? 
                product.description.replace(/<[^>]*>/g, '').substring(0, 160) + '...' :
                `${product.title} - Available at ${store.name}`
            });
            
            // Set appropriate headers
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('X-Store-Name', store.name);
            res.setHeader('X-Store-Domain', store.domain);
            res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
            
            return res.status(200).send(html);
          }
        } catch (productError) {
          console.warn(`Failed to render product ${productHandle}:`, productError.message);
          // Fall through to 404
        }
      }
      
      if (cleanPath.includes('.')) {
        // Direct file request (CSS, JS, images, etc.)
        filePath = path.join(storePath, cleanPath);
      } else {
        // Page request - try to find corresponding HTML file
        const possiblePaths = [
          path.join(storePath, cleanPath, 'index.html'),
          path.join(storePath, `${cleanPath}.html`),
          path.join(storePath, cleanPath)
        ];
        
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            filePath = possiblePath;
            break;
          }
        }
        
        // If no file found, serve 404
        if (!filePath) {
          return res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Page Not Found - ${store.name}</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 50px; 
                  background: ${store.secondary_color || '#f8f9fa'}; 
                }
                .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background: white; 
                  padding: 40px; 
                  border-radius: 10px; 
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
                }
                h1 { color: ${store.primary_color || '#007cba'}; margin-bottom: 20px; }
                p { color: #666; line-height: 1.6; }
                a { color: ${store.primary_color || '#007cba'}; text-decoration: none; }
                a:hover { text-decoration: underline; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Page Not Found</h1>
                <p>The page <strong>${cleanPath}</strong> could not be found on ${store.name}.</p>
                <p><a href="/">Return to homepage</a></p>
              </div>
            </body>
            </html>
          `);
        }
      }
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>File Not Found - ${store.name}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: ${store.secondary_color || '#f8f9fa'}; 
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white; 
              padding: 40px; 
              border-radius: 10px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            }
            h1 { color: ${store.primary_color || '#007cba'}; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
            a { color: ${store.primary_color || '#007cba'}; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>File Not Found</h1>
            <p>The requested file could not be found on ${store.name}.</p>
            <p><a href="/">Return to homepage</a></p>
          </div>
        </body>
        </html>
      `);
    }

    // Get file stats and set appropriate headers
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();
    
    // Set content type based on file extension
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.pdf': 'application/pdf',
      '.xml': 'application/xml',
      '.txt': 'text/plain'
    };
    
    const contentType = contentTypes[fileExtension] || 'application/octet-stream';
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Last-Modified', stats.mtime.toUTCString());
    
    // Set caching headers for static assets
    if (['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(fileExtension)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (fileExtension === '.html') {
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes for HTML
    }
    
    // Add store-specific headers
    res.setHeader('X-Store-Name', store.name);
    res.setHeader('X-Store-Domain', store.domain);
    
    // Read and serve the file
    const fileContent = fs.readFileSync(filePath);
    return res.status(200).send(fileContent);
    
  } catch (error) {
    console.error('Domain router error:', error);
    
    // Fall back to normal Express routing
    return next();
  }
};

module.exports = domainRouter;