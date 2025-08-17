const Store = require('../models/Store');
const path = require('path');
const fs = require('fs');

// Dynamic domain routing handler for Vercel
module.exports = async (req, res) => {
  try {
    const { domain: hostDomain, path: requestPath = '' } = req.query;
    
    if (!hostDomain) {
      return res.status(400).json({ error: 'Domain parameter required' });
    }

    // Clean domain (remove www prefix if present)
    const cleanDomain = hostDomain.replace(/^www\./, '');
    
    // Try to find the store by domain
    const store = await Store.findByDomain(cleanDomain);
    
    if (!store) {
      // Return 404 if no store found for this domain
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Store Not Found</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: #f5f5f5; 
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white; 
              padding: 40px; 
              border-radius: 10px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Store Not Found</h1>
            <p>The domain <strong>${cleanDomain}</strong> is not configured for any store.</p>
            <p>Please check the domain name or contact support.</p>
          </div>
        </body>
        </html>
      `);
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

    // Determine which file to serve based on the request path
    let filePath;
    const storePath = path.join(process.cwd(), 'stores', cleanDomain);
    
    if (!requestPath || requestPath === '' || requestPath === '/') {
      // Serve homepage
      filePath = path.join(storePath, 'index.html');
    } else {
      // Clean the path and determine file
      const cleanPath = requestPath.replace(/^\/+/, '').replace(/\/+$/, '');
      
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
                <p>The page <strong>/${cleanPath}</strong> could not be found on ${store.name}.</p>
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

    // Get file stats to set appropriate headers
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
    
    // Read and serve the file
    const fileContent = fs.readFileSync(filePath);
    res.status(200).send(fileContent);
    
  } catch (error) {
    console.error('Store domain routing error:', error);
    
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Server Error</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f5f5f5; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
          }
          h1 { color: #d32f2f; margin-bottom: 20px; }
          p { color: #666; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Server Error</h1>
          <p>An error occurred while processing your request.</p>
          <p>Please try again later or contact support.</p>
        </div>
      </body>
      </html>
    `);
  }
};