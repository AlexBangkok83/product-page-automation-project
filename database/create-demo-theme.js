const db = require('./db');

async function createDemoTheme() {
  try {
    console.log('🎨 Creating red demo theme for store connections...');
    
    // Initialize database connection
    await db.initialize();
    
    const redThemeConfig = {
      colors: {
        primary: '#dc2626', // Red primary
        secondary: '#991b1b', // Dark red secondary  
        accent: '#f59e0b', // Amber accent
        background: '#ffffff',
        surface: '#fef2f2', // Light red surface
        text: '#1f2937',
        textSecondary: '#6b7280'
      },
      fonts: {
        primary: 'Poppins, sans-serif', // Different font
        secondary: 'Playfair Display, serif' // Elegant serif
      },
      layout: {
        maxWidth: '1140px', // Slightly smaller
        padding: '1.5rem', // More padding
        borderRadius: '0.75rem' // Larger border radius
      }
    };
    
    const headerConfig = {
      style: 'bold', // Different style
      showLogo: true,
      showNavigation: true,
      showSearch: true,
      showCart: true,
      layout: 'centered', // Centered layout
      backgroundColor: '#dc2626'
    };
    
    const footerConfig = {
      showLinks: true,
      showSocial: true,
      showNewsletter: false, // Disable newsletter
      showCopyright: true,
      layout: 'simple', // Simpler layout
      backgroundColor: '#991b1b'
    };
    
    await db.run(`
      INSERT INTO themes (name, description, layout_config, css_variables, header_config, footer_config, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `, [
      'Bold Red Commerce',
      'Dynamic red theme perfect for bold brands and promotional stores with modern typography and centered layouts',
      JSON.stringify(redThemeConfig),
      JSON.stringify(redThemeConfig.colors),
      JSON.stringify(headerConfig),
      JSON.stringify(footerConfig)
    ]);
    
    console.log('✅ Bold Red Commerce theme created successfully');
    
    // Create another variant - Elegant Red
    const elegantRedConfig = {
      colors: {
        primary: '#b91c1c', // Slightly darker red
        secondary: '#7f1d1d', // Very dark red
        accent: '#d97706', // Orange accent
        background: '#fffbeb', // Warm background
        surface: '#fee2e2', // Pink surface
        text: '#0f172a', // Very dark text
        textSecondary: '#64748b'
      },
      fonts: {
        primary: 'Inter, system-ui, sans-serif',
        secondary: 'Georgia, serif'
      },
      layout: {
        maxWidth: '1200px',
        padding: '2rem', // Even more padding
        borderRadius: '1rem' // Large border radius
      }
    };
    
    const elegantHeaderConfig = {
      style: 'elegant',
      showLogo: true,
      showNavigation: true,
      showSearch: false, // No search
      showCart: true,
      layout: 'spread',
      backgroundColor: '#b91c1c'
    };
    
    const elegantFooterConfig = {
      showLinks: true,
      showSocial: false, // No social
      showNewsletter: true,
      showCopyright: true,
      layout: 'columns',
      backgroundColor: '#7f1d1d'
    };
    
    await db.run(`
      INSERT INTO themes (name, description, layout_config, css_variables, header_config, footer_config, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `, [
      'Elegant Red Luxury',
      'Sophisticated red theme for luxury brands with elegant typography, warm backgrounds, and premium feel',
      JSON.stringify(elegantRedConfig),
      JSON.stringify(elegantRedConfig.colors),
      JSON.stringify(elegantHeaderConfig),
      JSON.stringify(elegantFooterConfig)
    ]);
    
    console.log('✅ Elegant Red Luxury theme created successfully');
    console.log('🎉 Demo themes setup complete!');
    
  } catch (error) {
    console.error('❌ Error creating demo themes:', error);
    throw error;
  }
}

// Run the creation if this file is executed directly
if (require.main === module) {
  createDemoTheme()
    .then(() => {
      console.log('✨ Demo themes creation complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Demo themes creation failed:', error);
      process.exit(1);
    });
}

module.exports = createDemoTheme;