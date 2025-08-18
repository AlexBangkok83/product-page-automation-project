const TemplateRenderer = require('./utils/TemplateRenderer');
const path = require('path');
const fs = require('fs');

// Test the footer system integration
async function testFooterSystem() {
  console.log('🧪 Testing Footer System Integration...');
  
  try {
    // Create a mock store object
    const mockStore = {
      id: 1,
      name: 'Test Store',
      domain: 'test-store.com',
      country: 'US',
      language: 'en',
      currency: 'USD',
      primary_color: '#007cba',
      secondary_color: '#f8f9fa',
      logo_url: 'https://example.com/logo.png',
      support_email: 'support@test-store.com',
      support_phone: '+1-555-0123',
      business_address: '123 Test St, Test City, TC 12345',
      business_orgnr: '123456789',
      meta_description: 'Welcome to Test Store - your premier destination for quality products'
    };

    // Create mock pages including legal pages
    const mockPages = [
      {
        id: 1,
        store_id: 1,
        page_type: 'home',
        title: 'Welcome to Test Store',
        subtitle: 'Quality products for everyone',
        content: JSON.stringify([
          { type: 'hero', title: 'Welcome to Test Store', content: 'Quality products for everyone' },
          { type: 'features', content: 'Our amazing features' }
        ]),
        meta_title: 'Test Store - Home',
        meta_description: 'Welcome to Test Store',
        slug: '',
        template_data: JSON.stringify({ layout: 'modern' })
      },
      {
        id: 2,
        store_id: 1,
        page_type: 'terms',
        title: 'Terms of Service',
        content: JSON.stringify([{ type: 'text', content: 'Our terms of service...' }]),
        slug: 'terms'
      },
      {
        id: 3,
        store_id: 1,
        page_type: 'privacy',
        title: 'Privacy Policy',
        content: JSON.stringify([{ type: 'text', content: 'Our privacy policy...' }]),
        slug: 'privacy'
      }
    ];

    // Initialize template renderer
    const renderer = new TemplateRenderer();
    
    // Test footer template loading
    console.log('📄 Testing footer template loading...');
    const footerTemplate = renderer.loadFooterTemplate();
    if (footerTemplate.includes('site-footer')) {
      console.log('✅ Footer template loaded successfully');
    } else {
      console.log('⚠️  Using fallback footer template');
    }
    
    // Test footer generation
    console.log('🎨 Testing footer generation...');
    const footerHtml = await renderer.generateFooter(mockStore, mockPages);
    
    // Verify footer contains expected elements
    const checks = [
      { check: 'Store name', condition: footerHtml.includes(mockStore.name) },
      { check: 'Support email', condition: footerHtml.includes(mockStore.support_email) },
      { check: 'Support phone', condition: footerHtml.includes(mockStore.support_phone) },
      { check: 'Business address', condition: footerHtml.includes(mockStore.business_address) },
      { check: 'Copyright year', condition: footerHtml.includes(new Date().getFullYear().toString()) },
      { check: 'Terms link', condition: footerHtml.includes('href="/terms"') },
      { check: 'Privacy link', condition: footerHtml.includes('href="/privacy"') },
      { check: 'CSS styles', condition: footerHtml.includes('.site-footer') }
    ];
    
    console.log('\n📋 Footer Content Verification:');
    checks.forEach(({ check, condition }) => {
      console.log(condition ? `✅ ${check}` : `❌ ${check}`);
    });
    
    // Test full page rendering
    console.log('\n🏗️  Testing full page rendering...');
    const homePage = mockPages.find(p => p.page_type === 'home');
    const fullPageHtml = await renderer.renderPageHTML(mockStore, homePage, mockPages);
    
    // Verify full page contains footer
    if (fullPageHtml.includes('site-footer')) {
      console.log('✅ Footer integrated into full page successfully');
    } else {
      console.log('❌ Footer not found in full page HTML');
    }
    
    // Save test output for inspection
    const testOutputPath = path.join(__dirname, 'test-output');
    if (!fs.existsSync(testOutputPath)) {
      fs.mkdirSync(testOutputPath, { recursive: true });
    }
    
    fs.writeFileSync(path.join(testOutputPath, 'footer-test.html'), footerHtml);
    fs.writeFileSync(path.join(testOutputPath, 'full-page-test.html'), fullPageHtml);
    
    console.log('\n💾 Test files saved to ./test-output/');
    console.log('   - footer-test.html (Footer component only)');
    console.log('   - full-page-test.html (Complete page with footer)');
    
    console.log('\n🎉 Footer system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Footer system test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testFooterSystem().then(() => {
    console.log('\n✨ Test execution completed');
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testFooterSystem };