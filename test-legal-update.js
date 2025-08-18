const { updateLegalContent } = require('./database/update-legal-content');

updateLegalContent()
  .then(result => {
    console.log('✅ Legal content update successful:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Legal content update failed:', error);
    process.exit(1);
  });