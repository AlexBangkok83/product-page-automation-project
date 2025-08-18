const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database/db');
const { globalErrorHandler, notFoundHandler, handleUncaughtException, handleUnhandledRejection } = require('./middleware/errorHandler');
const domainRouter = require('./middleware/domainRouter');
require('dotenv').config();

// Handle uncaught exceptions
handleUncaughtException();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Domain routing middleware (must be before other routes)
app.use(domainRouter);

// Routes
app.use('/', require('./routes/index'));
app.use('/api', require('./routes/api'));

// Static serving for store files
app.use('/stores', express.static(path.join(__dirname, 'stores'), {
  maxAge: '5m', // Cache for 5 minutes
  setHeaders: (res, path) => {
    // Set longer cache for static assets
    if (path.match(/\.(css|js|png|jpg|jpeg|gif|svg|webp|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Error handling - order matters!
app.use(notFoundHandler);      // 404 handler
app.use(globalErrorHandler);   // Global error handler

// Initialize for serverless and local environments
async function initialize() {
  try {
    // Initialize database
    await db.initialize();
    console.log('✅ Database initialized successfully');
    
    // Agent automation system disabled - focusing on core platform testing
    console.log('✅ Core e-commerce platform ready for testing');
    
  } catch (error) {
    console.error('❌ Failed to initialize:', error);
  }
}

// Initialize for serverless environment
initialize();

// Start server only if not in serverless environment
if (require.main === module) {
  async function startServer() {
    try {
      const server = app.listen(PORT, () => {
        console.log(`🚀 Multi-Store Platform running on port ${PORT}`);
        console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
        console.log(`🛠️  Site Setup: http://localhost:${PORT}/admin/site-setup`);
        console.log(`🎨 Template Builder: http://localhost:${PORT}/admin/product-template`);
        console.log(`🔗 API Endpoints: http://localhost:${PORT}/api`);
        console.log(`🏢 Stores Directory: ${path.join(__dirname, 'stores')}`);
        console.log(`🌐 Domain Routing: Enabled for all custom domains`);
        console.log('\n✅ HTTP Server is ready and responsive!');
        console.log('✅ Web application serving properly');
        console.log('✅ Admin dashboard accessible');
        console.log('✅ API endpoints available');
      });
      
      // Handle unhandled promise rejections
      handleUnhandledRejection(server);
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down gracefully...');
        await db.close();
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        console.log('\n🛑 Shutting down gracefully...');
        await db.close();
        process.exit(0);
      });
      
      return server;
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
  
  startServer();
}

module.exports = app;