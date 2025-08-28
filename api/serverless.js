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

    // Check if we have a store directory for this domain
    const storePath = path.join(process.cwd(), 'stores', cleanDomain);
    
    if (!fs.existsSync(storePath)) {
      console.log(`Store directory not found for ${cleanDomain}: ${storePath}`);
      return next();
    }

    // Determine which file to serve
    let requestedPath = req.path;
    let filePath;
    
    console.log(`[${cleanDomain}] Processing path: ${requestedPath}`);
    
    if (!requestedPath || requestedPath === '/' || requestedPath === '') {
      // Serve homepage
      filePath = path.join(storePath, 'index.html');
      console.log(`[${cleanDomain}] Serving homepage: ${filePath}`);
    } else {
      // Clean the path
      const cleanPath = requestedPath.replace(/^\/+/, '').replace(/\/+$/, '');
      console.log(`[${cleanDomain}] Clean path: ${cleanPath}`);
      
      if (cleanPath.includes('.')) {
        // Direct file request
        filePath = path.join(storePath, cleanPath);
        console.log(`[${cleanDomain}] Direct file request: ${filePath}`);
      } else {
        // Page request - try to find corresponding HTML file
        const possiblePaths = [
          path.join(storePath, cleanPath, 'index.html'),
          path.join(storePath, `${cleanPath}.html`),
          path.join(storePath, cleanPath)
        ];
        
        console.log(`[${cleanDomain}] Trying paths:`, possiblePaths);
        
        for (const possiblePath of possiblePaths) {
          console.log(`[${cleanDomain}] Checking ${possiblePath}: exists=${fs.existsSync(possiblePath)}`);
          if (fs.existsSync(possiblePath)) {
            filePath = possiblePath;
            console.log(`[${cleanDomain}] Found file: ${filePath}`);
            break;
          }
        }
        
        // If no file found, serve 404
        if (!filePath) {
          console.log(`[${cleanDomain}] No file found for path: ${cleanPath}`);
          return res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Page Not Found</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 50px; 
                  background: #f8f9fa; 
                }
              </style>
            </head>
            <body>
              <h1>Page Not Found</h1>
              <p>The page "${cleanPath}" could not be found.</p>
              <p>Store path: ${storePath}</p>
              <p><a href="/">Return to homepage</a></p>
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