/**
 * Complete Legal Integration Workflow
 * Agent Coordination: Legal Content Architect + Database Operations + System Validation
 */

const { updateLegalContent } = require('./database/update-legal-content');
const { runFullValidation } = require('./validate-legal-system');

async function executeCompleteIntegration() {
  console.log('🚀 MULTI-AGENT LEGAL INTEGRATION WORKFLOW');
  console.log('=' .repeat(60));
  console.log('🏗️  Phase 1: Legal Content Architect');
  console.log('🔧 Phase 2: Database Operations Specialist');
  console.log('🔍 Phase 3: System Integration Coordinator');
  console.log('');
  
  try {
    // Phase 1 & 2: Update legal content
    console.log('📋 PHASE 1-2: LEGAL CONTENT UPDATE');
    console.log('-'.repeat(40));
    
    const updateResult = await updateLegalContent();
    
    console.log('✅ Legal content update completed');
    console.log(`📊 Templates added: ${updateResult.templatesAdded}`);
    console.log(`📄 Page types: ${updateResult.pageTypes.join(', ')}`);
    console.log('');
    
    // Phase 3: Validation
    console.log('📋 PHASE 3: SYSTEM VALIDATION');
    console.log('-'.repeat(40));
    
    const validationResult = await runFullValidation();
    
    console.log('');
    console.log('🎯 INTEGRATION COMPLETE!');
    console.log('=' .repeat(60));
    
    if (validationResult.overall_success) {
      console.log('🏆 SUCCESS: Legal system fully operational!');
      console.log('');
      console.log('📚 Available Legal Pages:');
      console.log('   • Privacy Policy - Professional GDPR-compliant template');
      console.log('   • Terms of Service - Comprehensive legal terms');
      console.log('   • Refund Policy - Clear return and refund guidelines');
      console.log('   • Delivery Policy - Shipping and delivery information');
      console.log('');
      console.log('🔄 Variable Substitution Ready:');
      console.log('   • {store_name} - Store name');
      console.log('   • {store_domain} - Store domain');
      console.log('   • {store_country} - Store country');
      console.log('   • {support_email} - Support email');
      console.log('   • {business_address} - Business address');
      console.log('');
      console.log('🚀 READY FOR PRODUCTION USE!');
      console.log('');
      console.log('📋 Next Steps:');
      console.log('   1. Create new stores to test legal page generation');
      console.log('   2. Visit /api/page-templates to see all available templates');
      console.log('   3. Legal pages will auto-generate with variable substitution');
    } else {
      console.log('⚠️  Integration completed with issues - see validation report above');
    }
    
    return {
      success: validationResult.overall_success,
      update: updateResult,
      validation: validationResult
    };
    
  } catch (error) {
    console.error('');
    console.error('❌ INTEGRATION FAILED');
    console.error('💥 Error:', error.message);
    console.error('');
    console.error('🛠️  Troubleshooting:');
    console.error('   1. Check database permissions');
    console.error('   2. Ensure no database locks');
    console.error('   3. Verify SQLite3 installation');
    
    throw error;
  }
}

// Execute the complete workflow
if (require.main === module) {
  executeCompleteIntegration()
    .then(result => {
      console.log('');
      console.log(result.success ? '🎊 MISSION ACCOMPLISHED!' : '⚠️  MISSION COMPLETED WITH ISSUES');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Integration workflow failed:', error.message);
      process.exit(1);
    });
}

module.exports = { executeCompleteIntegration };