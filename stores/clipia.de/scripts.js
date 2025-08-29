
// Generated JavaScript for Clipia Germany

// Product image switching
function changeMainImage(imageSrc) {
  const mainImage = document.querySelector('.main-product-image');
  if (mainImage) {
    mainImage.src = imageSrc;
  }
  
  // Update active thumbnail
  document.querySelectorAll('.product-thumbnail').forEach(thumb => {
    thumb.classList.remove('active');
  });
  event.target.closest('.product-thumbnail').classList.add('active');
}

// Product variant selection
function selectVariant(variantId) {
  // Update selected variant
  document.querySelectorAll('.variant-option').forEach(variant => {
    variant.classList.remove('selected');
  });
  event.target.classList.add('selected');
  
  // In a real implementation, this would update price and availability
  console.log('Selected variant:', variantId);
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

console.log('🏪 Store: Clipia Germany | Domain: clipia.de | Generated with Claude Code');
