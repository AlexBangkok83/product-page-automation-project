
// Generated JavaScript for Clipia Finland

// Product view function
function viewProduct(handle) {
  // Navigate to the product detail page
  window.location.href = '/products/' + handle;
}

// Basic smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth'
      });
    }
  });
});

// Basic form handling
document.addEventListener('DOMContentLoaded', function() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      alert('Form submission is not yet implemented. Coming soon!');
    });
  });
});

console.log('🏪 Store: Clipia Finland | Domain: clipia.fi | Generated with Claude Code');
