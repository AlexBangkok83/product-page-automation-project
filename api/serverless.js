const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Simple domain router for serverless environment
const simpleDomainRouter = (req, res, next) => {
  try {
    // Skip for API routes
    if (req.path.startsWith('/api')) {
      return next();
    }

    // Get the hostname
    const hostname = req.get('host') || req.hostname;
    if (!hostname) {
      return next();
    }

    // Clean domain (remove www prefix and port)
    const cleanDomain = hostname.replace(/^www\./, '').split(':')[0];
    
    // Skip localhost and development domains
    if (cleanDomain === 'localhost' || cleanDomain.includes('127.0.0.1') || cleanDomain.includes('.local') || cleanDomain.includes('vercel.app')) {
      return next();
    }

    // Check if we have a store directory for this domain (case-insensitive)
    let storePath = path.join(process.cwd(), 'stores', cleanDomain);
    
    if (!fs.existsSync(storePath)) {
      // Try with capitalized domain (e.g., clipia.fi -> Clipia.fi)
      const capitalizedDomain = cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
      const capitalizedStorePath = path.join(process.cwd(), 'stores', capitalizedDomain);
      
      if (fs.existsSync(capitalizedStorePath)) {
        storePath = capitalizedStorePath;
      } else {
        console.log(`Store directory not found for ${cleanDomain}: ${storePath}`);
        return next();
      }
    }

    // Determine which file to serve
    let requestedPath = req.path;
    let filePath;
    
    // Processing path for domain routing
    
    if (!requestedPath || requestedPath === '/' || requestedPath === '') {
      // Serve homepage
      filePath = path.join(storePath, 'index.html');
      // Serving homepage
    } else {
      // Clean the path
      const cleanPath = requestedPath.replace(/^\/+/, '').replace(/\/+$/, '');
      
      if (cleanPath.includes('.')) {
        // Direct file request
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
              <title>Page Not Found - Clipia</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                  text-align: center; 
                  padding: 50px; 
                  background: #f8f9fa;
                  color: #333;
                }
                .container { max-width: 500px; margin: 0 auto; }
                h1 { color: #007cba; margin-bottom: 1rem; }
                a { color: #007cba; text-decoration: none; }
                a:hover { text-decoration: underline; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Page Not Found</h1>
                <p>The page you're looking for could not be found.</p>
                <p><a href="/">← Return to homepage</a></p>
              </div>
            </body>
            </html>
          `);
        }
      }
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
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
    
    // Read and serve the file
    try {
      const fileContent = fs.readFileSync(filePath);
      return res.status(200).send(fileContent);
    } catch (readError) {
      console.error('File read error:', readError.message);
      return res.status(500).send(`File read error: ${readError.message}`);
    }
    
  } catch (error) {
    console.error('Domain router error:', error.message, error.stack);
    return res.status(500).send(`Server Error: ${error.message}`);
  }
};

// Apply the simple domain router
app.use(simpleDomainRouter);

// Fallback for unmatched routes
app.use('*', (req, res) => {
  res.status(404).send('Not Found');
});

module.exports = app;