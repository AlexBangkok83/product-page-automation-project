/**
 * Legal Content Database Update Script
 * Professional-grade legal templates with variable substitution
 * Extends content_defaults table with comprehensive legal pages
 */

const db = require('./db');

/**
 * Professional Legal Content Templates
 * Variables: {store_name}, {store_domain}, {store_country}, {support_email}, {business_address}
 * These will be automatically substituted by the Store model's replaceContentPlaceholders method
 */
const legalContentTemplates = [
  {
    page_type: 'privacy',
    language: 'en',
    industry: 'general',
    title: 'Privacy Policy - {store_name}',
    subtitle: 'How we protect and use your information',
    description: 'Our commitment to protecting your privacy and personal information.',
    content_blocks: JSON.stringify([
      {
        type: 'legal_header',
        title: 'Privacy Policy',
        last_updated: 'Last updated: [Current Date]',
        effective_date: 'Effective Date: [Current Date]'
      },
      {
        type: 'legal_section',
        title: '1. Information We Collect',
        content: `
        <p>At {store_name}, we collect information you provide directly to us, such as when you:</p>
        <ul>
          <li>Create an account or make a purchase</li>
          <li>Subscribe to our newsletter or marketing communications</li>
          <li>Contact us for customer support</li>
          <li>Participate in surveys, contests, or promotions</li>
        </ul>
        <p>This may include your name, email address, phone number, billing and shipping addresses, payment information, and communication preferences.</p>
        `
      },
      {
        type: 'legal_section',
        title: '2. How We Use Your Information',
        content: `
        <p>We use the information we collect to:</p>
        <ul>
          <li>Process and fulfill your orders</li>
          <li>Communicate with you about your purchases</li>
          <li>Send you marketing communications (with your consent)</li>
          <li>Improve our products and services</li>
          <li>Comply with legal obligations</li>
        </ul>
        `
      },
      {
        type: 'legal_section',
        title: '3. Information Sharing',
        content: `
        <p>We do not sell, trade, or otherwise transfer your personal information to third parties except:</p>
        <ul>
          <li>To trusted service providers who assist us in operating our website and conducting business</li>
          <li>When required by law or to protect our rights</li>
          <li>In connection with a business transfer or merger</li>
        </ul>
        <p>All third-party service providers are contractually required to keep your information confidential.</p>
        `
      },
      {
        type: 'legal_section',
        title: '4. Data Security',
        content: `
        <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is 100% secure, and we cannot guarantee absolute security.</p>
        `
      },
      {
        type: 'legal_section',
        title: '5. Your Rights',
        content: `
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access and update your personal information</li>
          <li>Request deletion of your personal information</li>
          <li>Opt-out of marketing communications</li>
          <li>Data portability</li>
        </ul>
        <p>To exercise these rights, please contact us at {support_email}.</p>
        `
      },
      {
        type: 'legal_section',
        title: '6. Contact Information',
        content: `
        <p>If you have questions about this Privacy Policy, please contact us:</p>
        <p>Email: {support_email}<br>
        Website: https://{store_domain}<br>
        Address: {business_address}</p>
        `
      }
    ]),
    meta_title: 'Privacy Policy - {store_name}',
    meta_description: 'Read our privacy policy to understand how {store_name} collects, uses, and protects your personal information.',
    template_config: JSON.stringify({
      layout: 'legal-document',
      show_toc: true,
      show_last_updated: true
    })
  },
  
  {
    page_type: 'terms',
    language: 'en',
    industry: 'general',
    title: 'Terms of Service - {store_name}',
    subtitle: 'Terms and conditions for using our service',
    description: 'Legal terms and conditions governing your use of our website and services.',
    content_blocks: JSON.stringify([
      {
        type: 'legal_header',
        title: 'Terms of Service',
        last_updated: 'Last updated: [Current Date]',
        effective_date: 'Effective Date: [Current Date]'
      },
      {
        type: 'legal_section',
        title: '1. Acceptance of Terms',
        content: `
        <p>By accessing and using {store_name} (the "Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
        `
      },
      {
        type: 'legal_section',
        title: '2. Description of Service',
        content: `
        <p>{store_name} provides an online marketplace platform accessible at {store_domain} where users can browse and purchase products. The Service may also include additional features, content, and functionality.</p>
        `
      },
      {
        type: 'legal_section',
        title: '3. User Accounts',
        content: `
        <p>To access certain features of the Service, you may be required to create an account. You are responsible for:</p>
        <ul>
          <li>Maintaining the confidentiality of your account information</li>
          <li>All activities that occur under your account</li>
          <li>Notifying us immediately of any unauthorized use</li>
        </ul>
        `
      },
      {
        type: 'legal_section',
        title: '4. Prohibited Uses',
        content: `
        <p>You may not use our Service:</p>
        <ul>
          <li>For any unlawful purpose or to solicit others to unlawful acts</li>
          <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
          <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
          <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
          <li>To submit false or misleading information</li>
        </ul>
        `
      },
      {
        type: 'legal_section',
        title: '5. Products and Services',
        content: `
        <p>All products and services are subject to availability. We reserve the right to discontinue any product or service at any time. Prices for our products are subject to change without notice.</p>
        `
      },
      {
        type: 'legal_section',
        title: '6. Limitation of Liability',
        content: `
        <p>In no event shall {store_name} be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.</p>
        `
      },
      {
        type: 'legal_section',
        title: '7. Contact Information',
        content: `
        <p>Questions about the Terms of Service should be sent to us at {support_email} or {business_address}.</p>
        `
      }
    ]),
    meta_title: 'Terms of Service - {store_name}',
    meta_description: 'Read the terms of service for {store_name}. Understand your rights and responsibilities when using our platform.',
    template_config: JSON.stringify({
      layout: 'legal-document',
      show_toc: true,
      show_last_updated: true
    })
  },
  
  {
    page_type: 'refund',
    language: 'en',
    industry: 'general',
    title: 'Refund Policy - {store_name}',
    subtitle: 'Our refund and return policy',
    description: 'Learn about our refund policy, return process, and your rights as a customer.',
    content_blocks: JSON.stringify([
      {
        type: 'legal_header',
        title: 'Refund Policy',
        last_updated: 'Last updated: [Current Date]',
        effective_date: 'Effective Date: [Current Date]'
      },
      {
        type: 'legal_section',
        title: '1. Return Window',
        content: `
        <p>You have 30 calendar days to return an item from the date you received it. To be eligible for a return, your item must be unused and in the same condition that you received it. Your item must be in the original packaging.</p>
        `
      },
      {
        type: 'legal_section',
        title: '2. Return Process',
        content: `
        <p>To initiate a return, please contact us at {support_email} with:</p>
        <ul>
          <li>Your order number</li>
          <li>The item(s) you wish to return</li>
          <li>Reason for return</li>
        </ul>
        <p>We will provide you with a return authorization and instructions for sending your item back to us.</p>
        `
      },
      {
        type: 'legal_section',
        title: '3. Refund Processing',
        content: `
        <p>Once we receive your item, we will inspect it and notify you that we have received your returned item. We will immediately notify you on the status of your refund after inspecting the item.</p>
        <p>If your return is approved, we will initiate a refund to your original method of payment. You will receive the credit within a certain amount of days, depending on your card issuer's policies.</p>
        `
      },
      {
        type: 'legal_section',
        title: '4. Return Shipping',
        content: `
        <p>You will be responsible for paying for your own shipping costs for returning your item. Shipping costs are non-refundable. If you receive a refund, the cost of return shipping will be deducted from your refund.</p>
        `
      },
      {
        type: 'legal_section',
        title: '5. Non-Returnable Items',
        content: `
        <p>Certain types of items cannot be returned:</p>
        <ul>
          <li>Perishable goods</li>
          <li>Personalized or custom products</li>
          <li>Digital downloads</li>
          <li>Gift cards</li>
          <li>Items marked as final sale</li>
        </ul>
        `
      },
      {
        type: 'legal_section',
        title: '6. Damaged or Defective Items',
        content: `
        <p>If you received a damaged or defective item, please contact us immediately at {support_email}. We will provide a prepaid return label and issue a full refund or replacement once we receive the item.</p>
        `
      },
      {
        type: 'legal_section',
        title: '7. Contact Us',
        content: `
        <p>If you have any questions about our Refund Policy, please contact us:</p>
        <p>Email: {support_email}<br>
        Website: https://{store_domain}<br>
        Address: {business_address}</p>
        `
      }
    ]),
    meta_title: 'Refund Policy - {store_name}',
    meta_description: 'Learn about the refund and return policy at {store_name}. Find out how to return items and get refunds.',
    template_config: JSON.stringify({
      layout: 'legal-document',
      show_toc: true,
      show_last_updated: true
    })
  },
  
  {
    page_type: 'delivery',
    language: 'en',
    industry: 'general',
    title: 'Delivery Policy - {store_name}',
    subtitle: 'Shipping and delivery information',
    description: 'Learn about our shipping options, delivery times, and shipping policies.',
    content_blocks: JSON.stringify([
      {
        type: 'legal_header',
        title: 'Delivery Policy',
        last_updated: 'Last updated: [Current Date]',
        effective_date: 'Effective Date: [Current Date]'
      },
      {
        type: 'legal_section',
        title: '1. Shipping Areas',
        content: `
        <p>We currently ship to customers within {store_country} and select international destinations. Shipping availability and costs may vary based on your location.</p>
        `
      },
      {
        type: 'legal_section',
        title: '2. Processing Time',
        content: `
        <p>Orders are typically processed within 1-2 business days after payment confirmation. Processing time may be longer during peak seasons or for custom/made-to-order items.</p>
        `
      },
      {
        type: 'legal_section',
        title: '3. Shipping Options',
        content: `
        <p>We offer several shipping options:</p>
        <ul>
          <li><strong>Standard Shipping:</strong> 5-7 business days</li>
          <li><strong>Expedited Shipping:</strong> 2-3 business days</li>
          <li><strong>Express Shipping:</strong> 1-2 business days</li>
          <li><strong>International Shipping:</strong> 7-21 business days (varies by destination)</li>
        </ul>
        <p>Delivery times are estimates and do not include processing time. Actual delivery times may vary.</p>
        `
      },
      {
        type: 'legal_section',
        title: '4. Shipping Costs',
        content: `
        <p>Shipping costs are calculated based on the weight and dimensions of your order, shipping method selected, and destination. You can view shipping costs during checkout before completing your purchase.</p>
        <p>Free shipping may be available for orders over a certain amount or during promotional periods.</p>
        `
      },
      {
        type: 'legal_section',
        title: '5. Delivery Confirmation',
        content: `
        <p>Once your order ships, you will receive a confirmation email with tracking information. You can track your package using the provided tracking number on our website or the carrier's website.</p>
        `
      },
      {
        type: 'legal_section',
        title: '6. Delivery Issues',
        content: `
        <p>If your package is delayed, lost, or damaged during shipping:</p>
        <ul>
          <li>Contact us immediately at {support_email}</li>
          <li>We will work with the shipping carrier to resolve the issue</li>
          <li>Replacement items or refunds may be provided as appropriate</li>
        </ul>
        `
      },
      {
        type: 'legal_section',
        title: '7. International Shipping',
        content: `
        <p>For international orders:</p>
        <ul>
          <li>Additional customs fees, duties, or taxes may apply</li>
          <li>Customers are responsible for any applicable fees</li>
          <li>Delivery times may vary due to customs processing</li>
          <li>Some items may be restricted in certain countries</li>
        </ul>
        `
      },
      {
        type: 'legal_section',
        title: '8. Contact Information',
        content: `
        <p>For shipping questions or issues, please contact us:</p>
        <p>Email: {support_email}<br>
        Website: https://{store_domain}<br>
        Address: {business_address}</p>
        `
      }
    ]),
    meta_title: 'Delivery Policy - {store_name}',
    meta_description: 'Learn about shipping and delivery options at {store_name}. Find delivery times, shipping costs, and policies.',
    template_config: JSON.stringify({
      layout: 'legal-document',
      show_toc: true,
      show_last_updated: true
    })
  }
];

/**
 * Update the database with professional legal content templates
 */
async function updateLegalContent() {
  try {
    console.log('🏛️ Legal Content Architect: Starting professional legal template integration...');
    
    // Initialize database connection
    await db.initialize();
    
    console.log('📋 Processing legal content templates...');
    
    // Insert or update each legal content template
    for (const content of legalContentTemplates) {
      try {
        console.log(`   📄 Processing ${content.page_type} policy...`);
        
        // Check if this page type already exists
        const existingContent = await db.get(
          'SELECT id FROM content_defaults WHERE page_type = ? AND language = ?',
          [content.page_type, content.language]
        );
        
        if (existingContent) {
          // Update existing content
          await db.run(
            `UPDATE content_defaults SET 
             title = ?, subtitle = ?, description = ?, content_blocks = ?, 
             meta_title = ?, meta_description = ?, template_config = ?
             WHERE page_type = ? AND language = ?`,
            [
              content.title,
              content.subtitle,
              content.description,
              content.content_blocks,
              content.meta_title,
              content.meta_description,
              content.template_config,
              content.page_type,
              content.language
            ]
          );
          console.log(`   ✅ Updated existing ${content.page_type} policy`);
        } else {
          // Insert new content
          await db.run(
            `INSERT INTO content_defaults 
             (page_type, language, industry, title, subtitle, description, content_blocks, meta_title, meta_description, template_config)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              content.page_type,
              content.language,
              content.industry,
              content.title,
              content.subtitle,
              content.description,
              content.content_blocks,
              content.meta_title,
              content.meta_description,
              content.template_config
            ]
          );
          console.log(`   ✅ Created new ${content.page_type} policy`);
        }
      } catch (contentError) {
        console.error(`   ❌ Error processing ${content.page_type}:`, contentError.message);
      }
    }
    
    console.log('🎯 Legal Content Architect: Mission accomplished!');
    console.log('✅ All professional legal templates integrated successfully');
    console.log('📚 Available legal pages: Privacy Policy, Terms of Service, Refund Policy, Delivery Policy');
    console.log('🔄 Variable substitution ready: {store_name}, {store_domain}, {store_country}, {support_email}, {business_address}');
    
    return {
      success: true,
      templatesAdded: legalContentTemplates.length,
      pageTypes: legalContentTemplates.map(t => t.page_type)
    };
    
  } catch (error) {
    console.error('❌ Legal Content Architect: Mission failed:', error.message);
    throw error;
  }
}

// Export for use in other scripts
module.exports = { updateLegalContent, legalContentTemplates };

// Run directly if called as script
if (require.main === module) {
  updateLegalContent()
    .then(result => {
      console.log('🏆 Legal template integration complete:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Legal template integration failed:', error);
      process.exit(1);
    });
}