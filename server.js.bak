const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('config-ecominter'));

// Serve template files
app.use('/template', express.static('template'));

// API endpoint to deploy landing page
app.post('/api/deploy', async (req, res) => {
    try {
        const { siteName, backgroundColor } = req.body;
        
        // Validate input
        if (!siteName || !backgroundColor) {
            return res.status(400).json({ 
                success: false, 
                message: 'Site name and background color are required' 
            });
        }
        
        // Sanitize site name (remove special characters)
        const safeSiteName = siteName.replace(/[^a-zA-Z0-9.-]/g, '');
        if (!safeSiteName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid site name' 
            });
        }
        
        // Read template file
        const templatePath = path.join(__dirname, 'template', 'index.html');
        if (!fs.existsSync(templatePath)) {
            return res.status(500).json({ 
                success: false, 
                message: 'Template file not found' 
            });
        }
        
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        
        // Replace placeholder with background color
        const processedContent = templateContent.replace(/{{BACKGROUND_COLOR}}/g, backgroundColor);
        
        // Create directory for the site
        const siteDir = path.join(__dirname, 'stores', safeSiteName);
        if (!fs.existsSync(siteDir)) {
            fs.mkdirSync(siteDir, { recursive: true });
        }
        
        // Write the processed file
        const outputPath = path.join(siteDir, 'index.html');
        fs.writeFileSync(outputPath, processedContent, 'utf8');
        
        res.json({ 
            success: true, 
            message: `Landing page for "${siteName}" deployed successfully`,
            path: `stores/${safeSiteName}/index.html`
        });
        
    } catch (error) {
        console.error('Deploy error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error: ' + error.message 
        });
    }
});

// Serve deployed sites
app.use('/sites', express.static('stores'));

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Config interface available at http://localhost:3000');
});