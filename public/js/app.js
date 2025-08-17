// MultiStore Platform - Premium Interactive Experience
// Enhanced JavaScript for Site Setup with Micro-interactions

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 MultiStore Platform - Premium Experience Loaded');
    
    // Initialize all components
    initializeStepNavigation();
    initializeFormValidation();
    initializeAutoDetection();
    initializeShopifyValidation();
    initializePageTemplates();
    initializeProductBrowser();
    initializeMicroInteractions();
    initializeProgressAnimations();
    initializeResponsiveEnhancements();
    initializeFloatingActionButton();
    initializeTooltips();
    initializePageTransitions();
});

// Global state management
const appState = {
    currentStep: 1,
    formData: {},
    shopifyConnected: false,
    selectedPages: [],
    selectedProducts: [],
    productsLoaded: false,
    currentPage: 1,
    hasMoreProducts: false,
    productReminderShown: false,
    validationErrors: {}
};

// =====================================================
// STEP NAVIGATION SYSTEM
// =====================================================

function initializeStepNavigation() {
    // Add smooth step transitions
    window.nextStep = function(stepNumber) {
        if (validateCurrentStep()) {
            updateStepProgress(stepNumber);
            showStep(stepNumber);
            animateStepTransition(stepNumber);
        }
    };

    window.prevStep = function(stepNumber) {
        updateStepProgress(stepNumber);
        showStep(stepNumber);
        animateStepTransition(stepNumber, 'backward');
    };
}

function validateCurrentStep() {
    const currentStepDiv = document.querySelector(`#step${appState.currentStep}`);
    const requiredFields = currentStepDiv.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });
    
    // Special validation for step 2 (Shopify connection)
    if (appState.currentStep === 2) {
        const shopifyDomain = document.getElementById('shopifyDomain').value.trim();
        const shopifyToken = document.getElementById('shopifyToken').value.trim();
        
        if (shopifyDomain && shopifyToken && !appState.shopifyConnected) {
            showAlert('Please test your Shopify connection before proceeding', 'warning');
            isValid = false;
        }
    }
    
    // Special validation for step 3 (Page & Product selection)
    if (appState.currentStep === 3) {
        if (appState.selectedPages.length === 0) {
            showAlert('Please select at least the required pages (Home and Products)', 'warning');
            isValid = false;
        }
        
        // Optional: remind about products if none selected and Shopify is connected
        if (appState.shopifyConnected && appState.selectedProducts.length === 0 && !appState.productReminderShown) {
            const continueAnyway = confirm(
                'You haven\'t selected any featured products yet. You can always add them later from your dashboard. Continue anyway?'
            );
            appState.productReminderShown = true;
            if (!continueAnyway) {
                isValid = false;
            }
        }
    }

    return isValid;
}

function updateStepProgress(stepNumber) {
    const steps = document.querySelectorAll('.step');
    
    steps.forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNum < stepNumber) {
            step.classList.add('completed');
            // Add success animation
            setTimeout(() => {
                const icon = step.querySelector('i');
                if (icon && !icon.classList.contains('bi-check-circle-fill')) {
                    icon.className = 'bi bi-check-circle-fill';
                    icon.style.animation = 'checkmark 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                }
            }, 100);
        } else if (stepNum === stepNumber) {
            step.classList.add('active');
        }
    });
    
    appState.currentStep = stepNumber;
    
    // Update URL without page reload
    const url = new URL(window.location);
    url.searchParams.set('step', stepNumber);
    window.history.pushState({}, '', url);
}

function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.setup-step').forEach(step => {
        step.style.display = 'none';
    });
    
    // Show target step
    const targetStep = document.querySelector(`#step${stepNumber}`);
    if (targetStep) {
        targetStep.style.display = 'block';
        
        // Special handling for Step 3 - auto-load products if Shopify is connected
        if (stepNumber === 3 && appState.shopifyConnected && !appState.productsLoaded) {
            setTimeout(() => {
                const shopifyDomain = document.getElementById('shopifyDomain').value.trim();
                const shopifyToken = document.getElementById('shopifyToken').value.trim();
                
                if (shopifyDomain && shopifyToken) {
                    showAlert('Loading your products automatically...', 'info');
                    loadShopifyProducts();
                }
            }, 500);
        }
        
        // Focus first input
        setTimeout(() => {
            const firstInput = targetStep.querySelector('input, textarea, select');
            if (firstInput && stepNumber !== 3) { // Don't auto-focus on step 3 to avoid interrupting product loading
                firstInput.focus();
            }
        }, 300);
    }
}

function animateStepTransition(stepNumber, direction = 'forward') {
    const targetStep = document.querySelector(`#step${stepNumber}`);
    
    if (targetStep) {
        // Add entrance animation
        targetStep.style.transform = direction === 'forward' ? 'translateX(30px)' : 'translateX(-30px)';
        targetStep.style.opacity = '0';
        
        setTimeout(() => {
            targetStep.style.transition = 'all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
            targetStep.style.transform = 'translateX(0)';
            targetStep.style.opacity = '1';
        }, 50);
        
        // Add celebration effect for forward progression
        if (direction === 'forward' && stepNumber > 1) {
            createCelebrationParticles();
        }
    }
}

// =====================================================
// FORM VALIDATION & ENHANCEMENT
// =====================================================

function initializeFormValidation() {
    const form = document.getElementById('siteSetupForm');
    if (!form) return;

    // Real-time validation - skip siteUrl field to avoid red borders while typing
    form.addEventListener('input', function(e) {
        const field = e.target;
        if ((field.hasAttribute('required') || field.hasAttribute('data-required')) && field.id !== 'siteUrl') {
            validateField(field);
        }
    });
    
    // Only validate siteUrl on blur
    const siteUrlField = document.getElementById('siteUrl');
    if (siteUrlField) {
        siteUrlField.addEventListener('blur', function() {
            validateField(this);
        });
    }

    // Enhanced form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleFormSubmission();
    });
}

function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';

    // Required field validation
    if ((field.hasAttribute('required') || field.hasAttribute('data-required')) && !value) {
        isValid = false;
        errorMessage = 'This field is required';
    }

    // Email validation
    if (field.type === 'email' && value && !isValidEmail(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
    }

    // URL validation - be very lenient for siteUrl field
    if (field.id === 'siteUrl') {
        // Only validate if it looks completely wrong
        if (value && value.length > 2 && !value.includes('.')) {
            isValid = false;
            errorMessage = 'Please enter a valid domain (e.g., yoursite.com)';
        } else if (value && value.includes('.') && value.length > 3) {
            // Valid domain format - show positive feedback
            isValid = true;
        }
        // Otherwise, let it pass - we'll normalize it later
    } else if (field.type === 'url' && value && !isValidURL(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid URL';
    }

    // Shopify domain validation
    if (field.id === 'shopifyDomain' && value && !value.includes('myshopify.com')) {
        isValid = false;
        errorMessage = 'Please enter a valid Shopify domain (e.g., store.myshopify.com)';
    }

    if (isValid && value) {
        clearFieldError(field);
        field.classList.add('is-valid');
        field.classList.remove('is-invalid');
        
        // Add green border animation for domain validation
        if (field.id === 'siteUrl' && value.includes('.')) {
            field.style.borderColor = '#198754';
            field.style.boxShadow = '0 0 0 0.25rem rgba(25, 135, 84, 0.25)';
        }
    } else if (!isValid) {
        showFieldError(field, errorMessage);
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');
        
        // Remove green styling
        if (field.id === 'siteUrl') {
            field.style.borderColor = '';
            field.style.boxShadow = '';
        }
    } else {
        // Neutral state for empty valid fields
        clearFieldError(field);
        field.classList.remove('is-valid', 'is-invalid');
        
        // Remove green styling
        if (field.id === 'siteUrl') {
            field.style.borderColor = '';
            field.style.boxShadow = '';
        }
    }

    return isValid;
}

function showFieldError(field, message) {
    clearFieldError(field);
    
    field.classList.add('is-invalid');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
    
    // Add shake animation
    field.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        field.style.animation = '';
    }, 500);
}

function clearFieldError(field) {
    field.classList.remove('is-invalid');
    const errorDiv = field.parentNode.querySelector('.invalid-feedback');
    if (errorDiv) {
        errorDiv.remove();
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function normalizeURL(url) {
    // Remove any protocol first
    url = url.replace(/^https?:\/\//i, '');
    
    // Remove www. if present
    url = url.replace(/^www\./i, '');
    
    // Add https:// prefix
    return 'https://' + url;
}

function updateSupportEmail(url) {
    const supportEmailField = document.getElementById('supportEmail');
    if (!supportEmailField || supportEmailField.value.trim()) {
        return; // Don't overwrite if user has already entered an email
    }
    
    // Extract domain from URL
    const domain = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    supportEmailField.value = `info@${domain}`;
    supportEmailField.placeholder = `info@${domain}`;
}

function isValidURL(url) {
    if (!url || url.trim().length === 0) return false;
    
    try {
        // First try normalizing the URL
        const normalizedUrl = normalizeURL(url);
        new URL(normalizedUrl);
        return true;
    } catch {
        try {
            // Try with just https prefix
            new URL('https://' + url);
            return true;
        } catch {
            try {
                // Check if it's a valid domain at least
                const domain = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
                return domain.includes('.') && domain.length > 3;
            } catch {
                return false;
            }
        }
    }
}

// =====================================================
// AUTO-DETECTION FEATURES
// =====================================================

function initializeAutoDetection() {
    const siteUrlField = document.getElementById('siteUrl');
    if (!siteUrlField) return;

    let detectionTimeout;
    
    // Auto-normalize URL on blur and update support email
    siteUrlField.addEventListener('blur', function() {
        const url = this.value.trim();
        if (url && isValidURL(url)) {
            const normalizedUrl = normalizeURL(url);
            this.value = normalizedUrl;
            
            // Auto-populate support email
            updateSupportEmail(normalizedUrl);
        }
    });
    
    siteUrlField.addEventListener('input', function() {
        clearTimeout(detectionTimeout);
        
        const url = this.value.trim();
        if (url && isValidURL(url)) {
            // Show loading state
            showAutoDetectionLoading();
            
            // Debounce the detection
            detectionTimeout = setTimeout(() => {
                const normalizedUrl = normalizeURL(url);
                performAutoDetection(normalizedUrl);
            }, 1000);
        } else {
            hideAutoDetectionResults();
        }
    });
}

function showAutoDetectionLoading() {
    const resultsDiv = document.getElementById('autoDetectionResults');
    if (resultsDiv) {
        resultsDiv.className = 'alert alert-info';
        resultsDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span>🔍 Detecting your site settings...</span>
            </div>
        `;
        resultsDiv.classList.remove('d-none');
    }
}

async function performAutoDetection(url) {
    try {
        const domain = new URL(url).hostname;
        
        const response = await fetch('/api/detect-domain-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ domain: domain })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAutoDetectionResults(data.detected);
            // Populate hidden form fields
            populateHiddenFields(data.detected);
        } else {
            // Fallback to mock data
            const tld = domain.split('.').pop();
            const detectionData = getDetectionData(tld);
            showAutoDetectionResults(detectionData);
            populateHiddenFields(detectionData);
        }
    } catch (error) {
        console.error('Auto-detection failed:', error);
        // Fallback to mock data
        const domain = new URL(url).hostname;
        const tld = domain.split('.').pop();
        const detectionData = getDetectionData(tld);
        showAutoDetectionResults(detectionData);
        populateHiddenFields(detectionData);
    }
}

function getDetectionData(tld) {
    const detectionMap = {
        'com': { country: 'US', currency: 'USD', language: 'en' },
        'uk': { country: 'GB', currency: 'GBP', language: 'en' },
        'ca': { country: 'CA', currency: 'CAD', language: 'en' },
        'au': { country: 'AU', currency: 'AUD', language: 'en' },
        'de': { country: 'DE', currency: 'EUR', language: 'de' },
        'fr': { country: 'FR', currency: 'EUR', language: 'fr' },
        'jp': { country: 'JP', currency: 'JPY', language: 'ja' },
        'in': { country: 'IN', currency: 'INR', language: 'en' },
        'fi': { country: 'FI', currency: 'EUR', language: 'fi' }
    };
    
    return detectionMap[tld] || detectionMap['com'];
}

function populateHiddenFields(detected) {
    const countryField = document.getElementById('hiddenCountry');
    const languageField = document.getElementById('hiddenLanguage');
    const currencyField = document.getElementById('hiddenCurrency');
    
    if (countryField) countryField.value = detected.country;
    if (languageField) languageField.value = detected.language;
    if (currencyField) currencyField.value = detected.currency;
    
    console.log('✅ Populated hidden fields:', detected);
}

function showAutoDetectionResults(data) {
    const resultsDiv = document.getElementById('autoDetectionResults');
    const siteUrlField = document.getElementById('siteUrl');
    
    if (!resultsDiv) return;

    resultsDiv.className = 'alert alert-success';
    resultsDiv.innerHTML = `
        <h6><i class="bi bi-check-circle me-2"></i>✨ Domain Validated & Settings Auto-detected:</h6>
        <div class="row">
            <div class="col-md-4">
                <strong>Country:</strong> <span id="detectedCountry">${data.country}</span>
            </div>
            <div class="col-md-4">
                <strong>Currency:</strong> <span id="detectedCurrency">${data.currency}</span>
            </div>
            <div class="col-md-4">
                <strong>Language:</strong> <span id="detectedLanguage">${data.language}</span>
            </div>
        </div>
        <div class="mt-2">
            <small class="text-success">
                <i class="bi bi-shield-check me-1"></i>
                Domain validated successfully! These settings can be adjusted later in your dashboard.
            </small>
        </div>
    `;
    
    resultsDiv.classList.remove('d-none');
    
    // Add green border to the URL field when domain is validated
    if (siteUrlField) {
        siteUrlField.style.borderColor = '#198754';
        siteUrlField.style.boxShadow = '0 0 0 0.25rem rgba(25, 135, 84, 0.25)';
        siteUrlField.classList.add('is-valid');
        siteUrlField.classList.remove('is-invalid');
    }
    
    // Add success animation
    resultsDiv.style.transform = 'translateY(-10px)';
    resultsDiv.style.opacity = '0';
    
    setTimeout(() => {
        resultsDiv.style.transition = 'all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
        resultsDiv.style.transform = 'translateY(0)';
        resultsDiv.style.opacity = '1';
    }, 100);
}

function hideAutoDetectionResults() {
    const resultsDiv = document.getElementById('autoDetectionResults');
    if (resultsDiv) {
        resultsDiv.classList.add('d-none');
    }
}

// =====================================================
// SHOPIFY VALIDATION
// =====================================================

function initializeShopifyValidation() {
    const validateBtn = document.getElementById('validateShopify');
    if (!validateBtn) return;

    validateBtn.addEventListener('click', function() {
        const domain = document.getElementById('shopifyDomain').value.trim();
        const token = document.getElementById('shopifyToken').value.trim();

        if (!domain || !token) {
            showAlert('Please enter both Shopify domain and access token', 'danger');
            return;
        }

        validateShopifyConnection(domain, token);
    });
}

async function validateShopifyConnection(domain, token) {
    const validateBtn = document.getElementById('validateShopify');
    const statusDiv = document.getElementById('shopifyStatus');
    
    // Hide any previous status
    if (statusDiv) {
        statusDiv.classList.add('d-none');
    }
    
    // Show loading state
    validateBtn.classList.add('loading');
    validateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Validating...';
    validateBtn.disabled = true;

    try {
        console.log('🔄 Testing Shopify connection...', { domain, tokenLength: token.length });
        
        // Make real API call to validate Shopify connection
        const response = await fetch('/api/validate-shopify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                shopifyDomain: domain,
                accessToken: token
            })
        });

        const result = await response.json();
        console.log('📥 Shopify API response:', { status: response.status, result });
        
        // Debug: Log the result structure
        console.log('📊 Result structure:', JSON.stringify(result, null, 2));

        if (response.ok && result.success) {
            // Successful connection
            const shopData = {
                name: result.shopName || domain.replace('.myshopify.com', '').replace(/[-_]/g, ' ').replace(/\w\S*/g, txt => 
                    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
                productCount: result.productCount || 0
            };

            console.log('✅ Shopify connection successful:', shopData);
            showShopifySuccess(shopData);
            
            // Reset button to success state
            validateBtn.classList.remove('loading');
            validateBtn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Connected!';
            validateBtn.disabled = false;
            validateBtn.classList.remove('btn-outline-primary', 'btn-danger');
            validateBtn.classList.add('btn-success');
            
            appState.shopifyConnected = true;
            
            // Show success alert
            showAlert(`Successfully connected to ${shopData.name}! Found ${shopData.productCount} products.`, 'success');
            
            // Add celebration effect
            createCelebrationParticles();
        } else {
            // Handle API errors
            const errorMessage = result.error || 'Connection failed';
            console.error('❌ Shopify connection failed:', errorMessage);
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('💥 Shopify validation error:', error);
        console.error('💥 Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // Reset button to error state
        validateBtn.classList.remove('loading');
        validateBtn.innerHTML = '<i class="bi bi-x-circle-fill me-2"></i>Connection Failed';
        validateBtn.disabled = false;
        validateBtn.classList.remove('btn-outline-primary', 'btn-success');
        validateBtn.classList.add('btn-danger');
        
        // Show detailed error message
        let userFriendlyError = 'Connection failed';
        if (error.message.includes('401') || error.message.includes('Invalid')) {
            userFriendlyError = 'Invalid access token. Please check your Shopify credentials.';
        } else if (error.message.includes('404') || error.message.includes('not found')) {
            userFriendlyError = 'Store not found. Please check your Shopify domain.';
        } else if (error.message.includes('timeout') || error.message.includes('network')) {
            userFriendlyError = 'Network timeout. Please check your connection and try again.';
        } else if (error.message) {
            userFriendlyError = error.message;
        }
        
        showAlert(`Shopify connection failed: ${userFriendlyError}`, 'danger');
        
        // Show error status
        showShopifyError(userFriendlyError);
        
        // Reset button after 4 seconds
        setTimeout(() => {
            validateBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Test Connection';
            validateBtn.classList.remove('btn-danger');
            validateBtn.classList.add('btn-outline-primary');
            validateBtn.disabled = false;
        }, 4000);
    }
}

function showShopifySuccess(shopData) {
    console.log('🎉 showShopifySuccess called with:', shopData);
    const statusDiv = document.getElementById('shopifyStatus');
    if (!statusDiv) {
        console.warn('⚠️ Shopify status div not found');
        return;
    }
    console.log('✅ Found shopifyStatus div, updating content...');

    // Update the status div content for success
    statusDiv.innerHTML = `
        <div class="alert alert-success border-0 mb-0">
            <div class="d-flex align-items-center">
                <i class="bi bi-check-circle-fill me-3" style="font-size: 1.5rem;"></i>
                <div>
                    <h6 class="mb-1">
                        <i class="bi bi-shop me-2"></i>Successfully Connected!
                    </h6>
                    <p class="mb-0">
                        Store: <strong>${shopData.name}</strong> | 
                        Products: <strong>${shopData.productCount}</strong>
                    </p>
                </div>
            </div>
        </div>
    `;
    
    statusDiv.classList.remove('d-none');
    
    // Add entrance animation
    statusDiv.style.transform = 'translateY(20px)';
    statusDiv.style.opacity = '0';
    
    setTimeout(() => {
        statusDiv.style.transition = 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        statusDiv.style.transform = 'translateY(0)';
        statusDiv.style.opacity = '1';
    }, 100);
}

function showShopifyError(errorMessage) {
    const statusDiv = document.getElementById('shopifyStatus');
    if (!statusDiv) {
        console.warn('⚠️ Shopify status div not found');
        return;
    }

    // Update the status div content for error
    statusDiv.innerHTML = `
        <div class="alert alert-danger border-0 mb-0">
            <div class="d-flex align-items-center">
                <i class="bi bi-x-circle-fill me-3" style="font-size: 1.5rem;"></i>
                <div>
                    <h6 class="mb-1">
                        <i class="bi bi-exclamation-triangle me-2"></i>Connection Failed
                    </h6>
                    <p class="mb-0 small">
                        ${errorMessage}
                    </p>
                </div>
            </div>
        </div>
    `;
    
    statusDiv.classList.remove('d-none');
    
    // Add entrance animation
    statusDiv.style.transform = 'translateY(20px)';
    statusDiv.style.opacity = '0';
    
    setTimeout(() => {
        statusDiv.style.transition = 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        statusDiv.style.transform = 'translateY(0)';
        statusDiv.style.opacity = '1';
    }, 100);
}

// =====================================================
// PRODUCT BROWSER SYSTEM
// =====================================================

function initializeProductBrowser() {
    const loadProductsBtn = document.getElementById('loadProducts');
    const productSearch = document.getElementById('productSearch');
    const selectAllBtn = document.getElementById('selectAllProducts');
    const selectFeaturedBtn = document.getElementById('selectFeaturedProducts');
    const clearSelectionBtn = document.getElementById('clearSelection');
    const loadMoreBtn = document.getElementById('loadMoreProducts');
    const previewBtn = document.getElementById('previewSelection');
    
    if (!loadProductsBtn) return;
    
    // Load products button
    loadProductsBtn.addEventListener('click', function() {
        loadShopifyProducts();
    });
    
    // Search functionality
    if (productSearch) {
        let searchTimeout;
        productSearch.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterProducts(this.value);
            }, 300);
        });
    }
    
    // Select all products
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            selectAllVisibleProducts();
        });
    }
    
    // Auto-select featured products (first 6 in-stock products)
    if (selectFeaturedBtn) {
        selectFeaturedBtn.addEventListener('click', function() {
            selectFeaturedProducts();
        });
    }
    
    // Clear selection
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', function() {
            clearProductSelection();
        });
    }
    
    // Load more products
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            loadMoreProducts();
        });
    }
    
    // Preview selection
    if (previewBtn) {
        previewBtn.addEventListener('click', function() {
            showProductPreview();
        });
    }
}

async function loadShopifyProducts(page = 1, append = false) {
    const shopifyDomain = document.getElementById('shopifyDomain').value.trim();
    const shopifyToken = document.getElementById('shopifyToken').value.trim();
    
    if (!shopifyDomain || !shopifyToken) {
        showProductError('Please ensure your Shopify connection is set up in Step 2.');
        return;
    }
    
    showProductLoading();
    
    try {
        const response = await fetch('/api/shopify-products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                shopifyDomain: shopifyDomain,
                accessToken: shopifyToken,
                page: page,
                limit: 20
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.products) {
            displayProducts(result.products, append);
            
            // Update pagination state
            appState.currentPage = result.pagination.page;
            appState.hasMoreProducts = result.pagination.hasMore;
            
            // Show/hide load more button
            const loadMoreContainer = document.getElementById('loadMoreContainer');
            if (loadMoreContainer) {
                loadMoreContainer.style.display = appState.hasMoreProducts ? 'block' : 'none';
            }
            
            // Update control buttons visibility
            updateProductControlsVisibility();
            
            appState.productsLoaded = true;
            
            // Show success message on first load
            if (page === 1 && !append) {
                showAlert(`Loaded ${result.products.length} products from your Shopify store`, 'success');
            }
        } else {
            throw new Error(result.error || 'Failed to load products');
        }
    } catch (error) {
        console.error('Failed to load products:', error);
        showProductError(error.message || 'Failed to connect to your Shopify store. Please check your connection settings.');
    }
}

function displayProducts(products, append = false) {
    const productGrid = document.getElementById('productGrid');
    const emptyState = document.getElementById('productBrowserEmpty');
    const loadingState = document.getElementById('productBrowserLoading');
    const errorState = document.getElementById('productBrowserError');
    
    if (!productGrid) return;
    
    // Hide other states
    emptyState.style.display = 'none';
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    
    // Show product grid
    productGrid.style.display = 'flex';
    
    if (!append) {
        productGrid.innerHTML = '';
    }
    
    products.forEach(product => {
        const productCard = createProductCard(product);
        productGrid.appendChild(productCard);
    });
    
    // Add click handlers for product selection
    addProductClickHandlers();
}

function createProductCard(product) {
    const col = document.createElement('div');
    col.className = 'col-lg-3 col-md-4 col-sm-6';
    
    const isSelected = appState.selectedProducts.some(p => p.id === product.id);
    const stockStatus = product.inStock ? 'In Stock' : 'Out of Stock';
    const stockClass = product.inStock ? 'text-success' : 'text-warning';
    
    col.innerHTML = `
        <div class="product-card ${isSelected ? 'selected' : ''}" data-product-id="${product.id}">
            <div class="product-card-header">
                <div class="product-image-container">
                    ${product.imageUrl ? 
                        `<img src="${product.imageUrl}" alt="${product.imageAlt}" class="product-image">` :
                        `<div class="product-image-placeholder">
                            <i class="bi bi-image"></i>
                        </div>`
                    }
                    <div class="product-overlay">
                        <div class="product-selection-indicator">
                            <i class="bi bi-check-circle-fill"></i>
                        </div>
                    </div>
                </div>
                <div class="product-badge-container">
                    ${product.hasMultipleVariants ? '<span class="badge bg-primary">Variants</span>' : ''}
                    <span class="badge ${product.inStock ? 'bg-success' : 'bg-warning'}">${stockStatus}</span>
                </div>
            </div>
            <div class="product-card-body">
                <h6 class="product-title" title="${product.title}">${truncateText(product.title, 50)}</h6>
                <p class="product-vendor text-muted">${product.vendor || 'Unknown Vendor'}</p>
                <div class="product-price">
                    <span class="price-current">${product.currency}${product.price}</span>
                    ${product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price) ?
                        `<span class="price-compare text-muted text-decoration-line-through ms-2">${product.currency}${product.compareAtPrice}</span>` :
                        ''
                    }
                </div>
                ${product.productType ? `<p class="product-type text-muted small">${product.productType}</p>` : ''}
                <div class="product-tags">
                    ${product.tags.slice(0, 3).map(tag => 
                        `<span class="badge bg-light text-dark">${tag}</span>`
                    ).join('')}
                    ${product.tags.length > 3 ? `<span class="badge bg-light text-muted">+${product.tags.length - 3}</span>` : ''}
                </div>
            </div>
        </div>
    `;
    
    return col;
}

function addProductClickHandlers() {
    const productCards = document.querySelectorAll('.product-card:not([data-click-handler])');
    
    productCards.forEach(card => {
        card.setAttribute('data-click-handler', 'true');
        card.addEventListener('click', function() {
            toggleProductSelection(this);
        });
    });
}

function toggleProductSelection(cardElement) {
    const productId = cardElement.dataset.productId;
    const isSelected = cardElement.classList.contains('selected');
    
    if (isSelected) {
        // Deselect product
        cardElement.classList.remove('selected');
        appState.selectedProducts = appState.selectedProducts.filter(p => p.id !== productId);
        
        // Add deselection animation
        cardElement.style.transform = 'scale(1.02)';
        setTimeout(() => {
            cardElement.style.transform = '';
        }, 150);
    } else {
        // Select product
        cardElement.classList.add('selected');
        
        // Get product data from the card
        const productData = extractProductFromCard(cardElement);
        if (productData) {
            appState.selectedProducts.push(productData);
        }
        
        // Add selection animation
        cardElement.style.transform = 'scale(0.98)';
        setTimeout(() => {
            cardElement.style.transform = 'translateY(-4px) scale(1.02)';
        }, 100);
        
        // Create selection celebration
        createMiniCelebration(cardElement);
    }
    
    updateSelectedProductsSummary();
    updateProductControlsVisibility();
    updateHiddenFormField();
}

function extractProductFromCard(cardElement) {
    const productId = cardElement.dataset.productId;
    const title = cardElement.querySelector('.product-title').textContent;
    const vendor = cardElement.querySelector('.product-vendor').textContent;
    const priceElement = cardElement.querySelector('.price-current');
    const imageElement = cardElement.querySelector('.product-image');
    
    if (!productId || !title) return null;
    
    return {
        id: productId,
        title: title,
        vendor: vendor !== 'Unknown Vendor' ? vendor : '',
        price: priceElement ? priceElement.textContent.replace(/[^0-9.]/g, '') : '0.00',
        imageUrl: imageElement ? imageElement.src : null,
        imageAlt: imageElement ? imageElement.alt : title
    };
}

function selectAllVisibleProducts() {
    const visibleCards = document.querySelectorAll('.product-card:not(.selected)');
    
    visibleCards.forEach(card => {
        card.classList.add('selected');
        
        // Get product data
        const productData = extractProductFromCard(card);
        if (productData && !appState.selectedProducts.some(p => p.id === productData.id)) {
            appState.selectedProducts.push(productData);
        }
    });
    
    updateSelectedProductsSummary();
    updateProductControlsVisibility();
    updateHiddenFormField();
    
    showAlert(`Selected ${visibleCards.length} products`, 'success');
}

function clearProductSelection() {
    // Remove visual selection from all cards
    const selectedCards = document.querySelectorAll('.product-card.selected');
    selectedCards.forEach(card => {
        card.classList.remove('selected');
        card.style.transform = '';
    });
    
    // Clear state
    appState.selectedProducts = [];
    
    updateSelectedProductsSummary();
    updateProductControlsVisibility();
    updateHiddenFormField();
    
    showAlert('Product selection cleared', 'info');
}

function filterProducts(searchTerm) {
    const productCards = document.querySelectorAll('.product-card');
    const searchLower = searchTerm.toLowerCase();
    
    productCards.forEach(card => {
        const title = card.querySelector('.product-title').textContent.toLowerCase();
        const vendor = card.querySelector('.product-vendor').textContent.toLowerCase();
        const productType = card.querySelector('.product-type');
        const productTypeText = productType ? productType.textContent.toLowerCase() : '';
        
        const matches = title.includes(searchLower) || 
                       vendor.includes(searchLower) || 
                       productTypeText.includes(searchLower);
        
        const colElement = card.closest('.col-lg-3');
        if (colElement) {
            colElement.style.display = matches ? 'block' : 'none';
        }
    });
    
    // Update visible count
    const visibleCards = document.querySelectorAll('.product-card').length - 
                        document.querySelectorAll('.col-lg-3[style*="display: none"]').length;
    
    if (searchTerm && visibleCards === 0) {
        showNoResultsMessage(searchTerm);
    } else {
        hideNoResultsMessage();
    }
}

function loadMoreProducts() {
    if (appState.hasMoreProducts) {
        loadShopifyProducts(appState.currentPage + 1, true);
    }
}

function updateSelectedProductsSummary() {
    const summaryDiv = document.getElementById('selectedProductsSummary');
    const countElement = document.getElementById('selectedProductsCount');
    
    if (!summaryDiv || !countElement) return;
    
    const count = appState.selectedProducts.length;
    countElement.textContent = count;
    
    if (count > 0) {
        summaryDiv.style.display = 'block';
    } else {
        summaryDiv.style.display = 'none';
    }
}

function selectFeaturedProducts() {
    // Clear existing selection first
    clearProductSelection();
    
    // Select first 6 in-stock products
    const inStockCards = Array.from(document.querySelectorAll('.product-card')).filter(card => {
        const stockBadge = card.querySelector('.badge.bg-success');
        return stockBadge && stockBadge.textContent.includes('In Stock');
    }).slice(0, 6);
    
    if (inStockCards.length === 0) {
        // If no in-stock products, select first 6 products regardless
        const allCards = Array.from(document.querySelectorAll('.product-card')).slice(0, 6);
        allCards.forEach(card => {
            card.classList.add('selected');
            const productData = extractProductFromCard(card);
            if (productData && !appState.selectedProducts.some(p => p.id === productData.id)) {
                appState.selectedProducts.push(productData);
            }
        });
        showAlert(`Auto-selected ${allCards.length} products as featured items`, 'success');
    } else {
        inStockCards.forEach(card => {
            card.classList.add('selected');
            const productData = extractProductFromCard(card);
            if (productData && !appState.selectedProducts.some(p => p.id === productData.id)) {
                appState.selectedProducts.push(productData);
            }
        });
        showAlert(`Auto-selected ${inStockCards.length} in-stock products as featured items`, 'success');
    }
    
    updateSelectedProductsSummary();
    updateProductControlsVisibility();
    updateHiddenFormField();
}

function updateProductControlsVisibility() {
    const selectAllBtn = document.getElementById('selectAllProducts');
    const selectFeaturedBtn = document.getElementById('selectFeaturedProducts');
    const clearSelectionBtn = document.getElementById('clearSelection');
    
    if (!selectAllBtn || !clearSelectionBtn) return;
    
    const hasProducts = document.querySelectorAll('.product-card').length > 0;
    const hasSelection = appState.selectedProducts.length > 0;
    
    selectAllBtn.style.display = hasProducts ? 'block' : 'none';
    if (selectFeaturedBtn) selectFeaturedBtn.style.display = hasProducts ? 'block' : 'none';
    clearSelectionBtn.style.display = hasSelection ? 'block' : 'none';
}

function updateHiddenFormField() {
    const hiddenField = document.getElementById('selectedProductsInput');
    if (hiddenField) {
        hiddenField.value = JSON.stringify(appState.selectedProducts);
    }
}

function showProductLoading() {
    const emptyState = document.getElementById('productBrowserEmpty');
    const loadingState = document.getElementById('productBrowserLoading');
    const errorState = document.getElementById('productBrowserError');
    const productGrid = document.getElementById('productGrid');
    
    if (emptyState) emptyState.style.display = 'none';
    if (errorState) errorState.style.display = 'none';
    if (productGrid) productGrid.style.display = 'none';
    if (loadingState) loadingState.style.display = 'block';
}

function showProductError(message) {
    const emptyState = document.getElementById('productBrowserEmpty');
    const loadingState = document.getElementById('productBrowserLoading');
    const errorState = document.getElementById('productBrowserError');
    const productGrid = document.getElementById('productGrid');
    const errorMessage = document.getElementById('productErrorMessage');
    
    if (emptyState) emptyState.style.display = 'none';
    if (loadingState) loadingState.style.display = 'none';
    if (productGrid) productGrid.style.display = 'none';
    if (errorState) errorState.style.display = 'block';
    if (errorMessage) errorMessage.textContent = message;
}

function showNoResultsMessage(searchTerm) {
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) return;
    
    // Remove existing no results message
    const existingMessage = productGrid.querySelector('.no-results-message');
    if (existingMessage) existingMessage.remove();
    
    const noResultsDiv = document.createElement('div');
    noResultsDiv.className = 'col-12 no-results-message';
    noResultsDiv.innerHTML = `
        <div class="text-center py-4">
            <i class="bi bi-search" style="font-size: 2rem; color: var(--bs-muted);"></i>
            <h6 class="text-muted mt-3">No products found for "${searchTerm}"</h6>
            <p class="text-muted small">Try a different search term or clear the search to see all products.</p>
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="document.getElementById('productSearch').value = ''; filterProducts('')">
                <i class="bi bi-x-circle me-1"></i>Clear Search
            </button>
        </div>
    `;
    
    productGrid.appendChild(noResultsDiv);
}

function hideNoResultsMessage() {
    const noResultsMessage = document.querySelector('.no-results-message');
    if (noResultsMessage) {
        noResultsMessage.remove();
    }
}

function showProductPreview() {
    if (appState.selectedProducts.length === 0) {
        showAlert('Please select some products first', 'info');
        return;
    }
    
    const previewModal = createProductPreviewModal();
    document.body.appendChild(previewModal);
    
    const modal = new bootstrap.Modal(previewModal);
    modal.show();
    
    // Clean up after modal is hidden
    previewModal.addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function createProductPreviewModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    
    const productCards = appState.selectedProducts.map(product => `
        <div class="col-md-6 col-lg-4 mb-3">
            <div class="card border-0 shadow-sm">
                ${product.imageUrl ? 
                    `<img src="${product.imageUrl}" class="card-img-top" alt="${product.imageAlt}" style="height: 200px; object-fit: cover;">` :
                    `<div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                        <i class="bi bi-image" style="font-size: 2rem; color: var(--bs-muted);"></i>
                    </div>`
                }
                <div class="card-body">
                    <h6 class="card-title">${truncateText(product.title, 40)}</h6>
                    <p class="card-text small text-muted">${product.vendor}</p>
                    <p class="card-text fw-bold text-primary">$${product.price}</p>
                </div>
            </div>
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div class="modal-dialog modal-xl">
            <div class="modal-content" style="border: none; border-radius: 1rem;">
                <div class="modal-header" style="background: var(--bs-primary); color: white; border: none;">
                    <h5 class="modal-title">
                        <i class="bi bi-eye me-2"></i>
                        Selected Products Preview
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-info border-0 mb-4">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-info-circle me-3" style="font-size: 1.5rem;"></i>
                            <div>
                                <h6 class="mb-1">Featured Products (${appState.selectedProducts.length} selected)</h6>
                                <p class="mb-0 small">These products will be prominently displayed on your homepage and featured in your product catalog.</p>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        ${productCards}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                        <i class="bi bi-x-circle me-2"></i>Close
                    </button>
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                        <i class="bi bi-check-circle me-2"></i>Looks Great!
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// =====================================================
// PAGE TEMPLATES SYSTEM
// =====================================================

function initializePageTemplates() {
    loadPageTemplates();
}

function loadPageTemplates() {
    const container = document.getElementById('pageTemplates');
    if (!container) return;

    const templates = [
        {
            id: 'home',
            title: 'Home Page',
            description: 'Your main landing page with hero section, featured products, and brand story',
            icon: 'bi-house-door',
            required: true
        },
        {
            id: 'products',
            title: 'Product Catalog',
            description: 'Browse all products with advanced filtering and search capabilities',
            icon: 'bi-grid',
            required: true
        },
        {
            id: 'about',
            title: 'About Us',
            description: 'Tell your brand story and build trust with your customers',
            icon: 'bi-people'
        },
        {
            id: 'contact',
            title: 'Contact',
            description: 'Contact form, location, and customer support information',
            icon: 'bi-envelope'
        },
        {
            id: 'blog',
            title: 'Blog',
            description: 'Share updates, tips, and engage with your community',
            icon: 'bi-journal-text'
        },
        {
            id: 'faq',
            title: 'FAQ',
            description: 'Frequently asked questions to help your customers',
            icon: 'bi-question-circle'
        }
    ];

    container.innerHTML = templates.map(template => `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="page-template-card ${template.required ? 'required' : ''}" 
                 data-template="${template.id}">
                ${template.required ? '<div class="required-badge">Required</div>' : ''}
                <div class="page-template-icon">
                    <i class="bi ${template.icon}"></i>
                </div>
                <h5 class="page-template-title">${template.title}</h5>
                <p class="page-template-description">${template.description}</p>
            </div>
        </div>
    `).join('');

    // Add click handlers
    container.addEventListener('click', function(e) {
        const card = e.target.closest('.page-template-card');
        if (card) {
            togglePageTemplate(card);
        }
    });

    // Auto-select required templates
    templates.filter(t => t.required).forEach(template => {
        appState.selectedPages.push(template.id);
        const card = container.querySelector(`[data-template="${template.id}"]`);
        if (card) {
            card.classList.add('selected');
        }
    });
}

function togglePageTemplate(card) {
    const templateId = card.dataset.template;
    const isRequired = card.classList.contains('required');
    
    if (isRequired) {
        // Required templates can't be deselected
        showAlert('This page is required for your store', 'info');
        return;
    }

    card.classList.toggle('selected');
    
    if (card.classList.contains('selected')) {
        appState.selectedPages.push(templateId);
        
        // Add selection animation
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = 'translateY(-8px) scale(1.02)';
        }, 100);
        
    } else {
        appState.selectedPages = appState.selectedPages.filter(id => id !== templateId);
        
        // Add deselection animation
        card.style.transform = 'scale(1.05)';
        setTimeout(() => {
            card.style.transform = 'translateY(0) scale(1)';
        }, 100);
    }
}

// =====================================================
// MICRO-INTERACTIONS & ANIMATIONS
// =====================================================

function initializeMicroInteractions() {
    // Enhance form inputs with floating labels effect
    enhanceFormInputs();
    
    // Add hover effects to buttons
    enhanceButtons();
    
    // Add parallax scrolling effect
    initializeParallax();
    
    // Add typing indicator for text areas
    enhanceTextAreas();
}

function enhanceFormInputs() {
    const inputs = document.querySelectorAll('.form-control');
    
    inputs.forEach(input => {
        // Add focus ring animation
        input.addEventListener('focus', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.15), 0 0 0 4px rgba(99, 102, 241, 0.1)';
        });
        
        input.addEventListener('blur', function() {
            this.style.transform = 'translateY(0)';
        });
        
        // Add typing animation
        input.addEventListener('input', function() {
            this.style.borderColor = 'var(--primary-400)';
            setTimeout(() => {
                if (!this.matches(':focus')) {
                    this.style.borderColor = '';
                }
            }, 500);
        });
    });
}

function enhanceButtons() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        // Add magnetic effect on hover
        button.addEventListener('mouseenter', function(e) {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        button.addEventListener('mouseleave', function(e) {
            this.style.transform = 'translateY(0) scale(1)';
        });
        
        // Add ripple effect on click
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

function initializeParallax() {
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        const container = document.querySelector('.container');
        if (container && container.querySelector('::before')) {
            container.style.transform = `translateY(${rate}px)`;
        }
    });
}

function enhanceTextAreas() {
    const textareas = document.querySelectorAll('textarea');
    
    textareas.forEach(textarea => {
        let typingTimer;
        
        textarea.addEventListener('input', function() {
            // Show typing indicator
            this.style.borderColor = 'var(--primary-400)';
            this.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.1)';
            
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                if (!this.matches(':focus')) {
                    this.style.borderColor = '';
                    this.style.boxShadow = '';
                }
            }, 1000);
        });
    });
}

// =====================================================
// PROGRESS ANIMATIONS
// =====================================================

function initializeProgressAnimations() {
    // Animate progress circles on step change
    observeStepChanges();
    
    // Add step completion celebrations
    addStepCompletionEffects();
}

function observeStepChanges() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.classList.contains('step') && 
                mutation.attributeName === 'class') {
                
                if (mutation.target.classList.contains('active')) {
                    animateActiveStep(mutation.target);
                } else if (mutation.target.classList.contains('completed')) {
                    animateCompletedStep(mutation.target);
                }
            }
        });
    });
    
    document.querySelectorAll('.step').forEach(step => {
        observer.observe(step, { attributes: true, attributeFilter: ['class'] });
    });
}

function animateActiveStep(stepElement) {
    const circle = stepElement.querySelector('.step-circle');
    if (circle) {
        circle.style.animation = 'pulse-ring 2s infinite, bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    }
}

function animateCompletedStep(stepElement) {
    const circle = stepElement.querySelector('.step-circle');
    const icon = stepElement.querySelector('i');
    
    if (circle) {
        circle.style.animation = 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    }
    
    if (icon) {
        setTimeout(() => {
            icon.className = 'bi bi-check-circle-fill';
            icon.style.animation = 'checkmark 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        }, 300);
    }
}

function addStepCompletionEffects() {
    // Add celebration when steps are completed
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        step.addEventListener('animationend', function(e) {
            if (e.animationName === 'bounceIn' && this.classList.contains('completed')) {
                createMiniCelebration(this);
            }
        });
    });
}

// =====================================================
// VISUAL EFFECTS & CELEBRATIONS
// =====================================================

function createCelebrationParticles() {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#00f2fe'];
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 8px;
                height: 8px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                top: 50%;
                left: 50%;
                animation: celebrationParticle 1.5s ease-out forwards;
                transform-origin: center;
            `;
            
            // Random animation direction
            const angle = (Math.PI * 2 * i) / particleCount;
            const velocity = 100 + Math.random() * 100;
            
            particle.style.setProperty('--x', Math.cos(angle) * velocity + 'px');
            particle.style.setProperty('--y', Math.sin(angle) * velocity + 'px');
            
            document.body.appendChild(particle);
            
            setTimeout(() => particle.remove(), 1500);
        }, i * 50);
    }
}

function createMiniCelebration(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            width: 4px;
            height: 4px;
            background: #10b981;
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            left: ${centerX}px;
            top: ${centerY}px;
            animation: miniCelebration 0.8s ease-out forwards;
        `;
        
        const angle = (Math.PI * 2 * i) / 6;
        particle.style.setProperty('--x', Math.cos(angle) * 50 + 'px');
        particle.style.setProperty('--y', Math.sin(angle) * 50 + 'px');
        
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 800);
    }
}

// =====================================================
// RESPONSIVE ENHANCEMENTS
// =====================================================

function initializeResponsiveEnhancements() {
    // Add mobile-specific interactions
    if (window.innerWidth <= 768) {
        addMobileEnhancements();
    }
    
    // Handle orientation changes
    window.addEventListener('orientationchange', function() {
        setTimeout(adjustForOrientation, 500);
    });
    
    // Add progressive enhancement for touch devices
    if ('ontouchstart' in window) {
        addTouchEnhancements();
    }
}

function addMobileEnhancements() {
    // Larger touch targets
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.style.minHeight = '48px';
        btn.style.padding = '12px 20px';
    });
    
    // Improved form inputs
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.style.fontSize = '16px'; // Prevent zoom on iOS
        input.style.minHeight = '48px';
    });
}

function adjustForOrientation() {
    // Recalculate layouts after orientation change
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => {
        step.style.transform = 'none';
        setTimeout(() => {
            step.style.transform = '';
        }, 100);
    });
}

function addTouchEnhancements() {
    // Add touch feedback
    document.addEventListener('touchstart', function(e) {
        if (e.target.closest('.btn, .page-template-card, .form-control')) {
            e.target.style.transform = 'scale(0.98)';
        }
    });
    
    document.addEventListener('touchend', function(e) {
        if (e.target.closest('.btn, .page-template-card, .form-control')) {
            setTimeout(() => {
                e.target.style.transform = '';
            }, 100);
        }
    });
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function handleFormSubmission() {
    const form = document.getElementById('siteSetupForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Validate that we have required data
    if (!validateFormCompletion()) {
        return;
    }
    
    // Collect all form data
    const formData = new FormData(form);
    formData.append('selectedPages', JSON.stringify(appState.selectedPages));
    formData.append('selectedProducts', JSON.stringify(appState.selectedProducts));
    
    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = 'Creating Your Store...';
    submitBtn.disabled = true;
    
    // Create epic completion celebration
    setTimeout(() => {
        createEpicCelebration();
        showSuccessMessage();
    }, 3000);
}

function validateFormCompletion() {
    const errors = [];
    
    // Check required fields
    const siteUrl = document.getElementById('siteUrl').value.trim();
    const brandName = document.getElementById('brandName').value.trim();
    
    if (!siteUrl) errors.push('Site URL is required');
    if (!brandName) errors.push('Brand Name is required');
    
    // Check Shopify connection if products are selected
    if (appState.selectedProducts.length === 0) {
        const confirmNoProducts = confirm(
            'You haven\'t selected any featured products. Your store will still be created, but no products will be highlighted on the homepage. Continue anyway?'
        );
        if (!confirmNoProducts) {
            return false;
        }
    }
    
    // Check page selection
    if (appState.selectedPages.length === 0) {
        errors.push('Please select at least the required pages (Home and Products)');
    }
    
    if (errors.length > 0) {
        showAlert('Please complete the following:\n' + errors.join('\n'), 'danger');
        return false;
    }
    
    return true;
}

function createEpicCelebration() {
    // Epic final celebration with multiple effects
    createCelebrationParticles();
    
    setTimeout(() => {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => createCelebrationParticles(), i * 200);
        }
    }, 500);
}

function showSuccessMessage() {
    const container = document.querySelector('.container');
    const successDiv = document.createElement('div');
    
    successDiv.innerHTML = `
        <div class="alert alert-success" style="border: none; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(255, 255, 255, 0.9) 100%); backdrop-filter: blur(10px); border-radius: 1.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
            <div class="text-center py-4">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🚀</div>
                <h3 class="text-success mb-3">Store Created Successfully!</h3>
                <p class="mb-3">Your amazing store is being set up. You'll be redirected to your dashboard shortly.</p>
                <div class="progress" style="height: 8px; border-radius: 10px;">
                    <div class="progress-bar bg-success" style="width: 0%; transition: width 3s ease-in-out;"></div>
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(successDiv);
    
    // Animate progress bar
    setTimeout(() => {
        const progressBar = successDiv.querySelector('.progress-bar');
        progressBar.style.width = '100%';
    }, 100);
    
    // Redirect after animation
    setTimeout(() => {
        window.location.href = '/dashboard';
    }, 4000);
}

// =====================================================
// CSS ANIMATIONS (Added via JavaScript)
// =====================================================

// Add custom CSS animations
const customStyles = document.createElement('style');
customStyles.textContent = `
    @keyframes celebrationParticle {
        0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
        }
        100% {
            transform: translate(var(--x), var(--y)) scale(0);
            opacity: 0;
        }
    }
    
    @keyframes miniCelebration {
        0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
        }
        100% {
            transform: translate(var(--x), var(--y)) scale(0);
            opacity: 0;
        }
    }
    
    @keyframes ripple {
        0% {
            transform: scale(0);
            opacity: 1;
        }
        100% {
            transform: scale(4);
            opacity: 0;
        }
    }
`;

document.head.appendChild(customStyles);

// =====================================================
// FLOATING ACTION BUTTON & HELP SYSTEM
// =====================================================

function initializeFloatingActionButton() {
    const fab = document.getElementById('helpFab');
    if (!fab) return;
    
    fab.addEventListener('click', function() {
        showHelpModal();
        
        // Add click animation
        this.style.transform = 'scale(0.9)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);
    });
    
    // Auto-hide on scroll down, show on scroll up
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', function() {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            // Scrolling down
            fab.style.transform = 'translateY(100px)';
        } else {
            // Scrolling up
            fab.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
    });
}

function showHelpModal() {
    const helpContent = `
        <div class="modal fade" id="helpModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content" style="border: none; border-radius: 1.5rem; overflow: hidden;">
                    <div class="modal-header" style="background: var(--gradient-primary); color: white; border: none;">
                        <h5 class="modal-title">
                            <i class="bi bi-question-circle me-2"></i>
                            How Can We Help?
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="row">
                            <div class="col-md-6 mb-4">
                                <div class="card border-0 h-100" style="background: var(--gradient-card);">
                                    <div class="card-body text-center p-4">
                                        <i class="bi bi-book" style="font-size: 2rem; color: var(--primary-500);"></i>
                                        <h6 class="mt-3 mb-2">Documentation</h6>
                                        <p class="small text-muted mb-3">Step-by-step guides and tutorials</p>
                                        <button class="btn btn-outline-primary btn-sm">View Docs</button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6 mb-4">
                                <div class="card border-0 h-100" style="background: var(--gradient-card);">
                                    <div class="card-body text-center p-4">
                                        <i class="bi bi-chat-dots" style="font-size: 2rem; color: var(--success-500);"></i>
                                        <h6 class="mt-3 mb-2">Live Chat</h6>
                                        <p class="small text-muted mb-3">Get instant help from our team</p>
                                        <button class="btn btn-outline-success btn-sm">Start Chat</button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6 mb-4">
                                <div class="card border-0 h-100" style="background: var(--gradient-card);">
                                    <div class="card-body text-center p-4">
                                        <i class="bi bi-play-circle" style="font-size: 2rem; color: var(--warning-500);"></i>
                                        <h6 class="mt-3 mb-2">Video Tutorials</h6>
                                        <p class="small text-muted mb-3">Watch how-to videos</p>
                                        <button class="btn btn-outline-warning btn-sm">Watch Now</button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6 mb-4">
                                <div class="card border-0 h-100" style="background: var(--gradient-card);">
                                    <div class="card-body text-center p-4">
                                        <i class="bi bi-envelope" style="font-size: 2rem; color: var(--danger-500);"></i>
                                        <h6 class="mt-3 mb-2">Email Support</h6>
                                        <p class="small text-muted mb-3">Send us a detailed message</p>
                                        <button class="btn btn-outline-danger btn-sm">Contact Us</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="alert alert-info border-0" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(255, 255, 255, 0.9) 100%);">
                            <h6 class="mb-2">
                                <i class="bi bi-lightbulb me-2"></i>
                                Quick Tips for Success:
                            </h6>
                            <ul class="mb-0 small">
                                <li>Start with required pages (Home & Products)</li>
                                <li>Test your Shopify connection before proceeding</li>
                                <li>Write clear shipping and return policies</li>
                                <li>Enable analytics to track your store's performance</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('helpModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', helpContent);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('helpModal'));
    modal.show();
    
    // Clean up after modal is hidden
    document.getElementById('helpModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// =====================================================
// TOOLTIP SYSTEM
// =====================================================

function initializeTooltips() {
    // Initialize Bootstrap tooltips for elements with data-tooltip
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        // Use our custom tooltip system for better control
        element.addEventListener('mouseenter', showCustomTooltip);
        element.addEventListener('mouseleave', hideCustomTooltip);
    });
}

function showCustomTooltip(e) {
    const element = e.target;
    const tooltipText = element.getAttribute('data-tooltip');
    
    if (!tooltipText) return;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    tooltip.textContent = tooltipText;
    tooltip.style.cssText = `
        position: absolute;
        z-index: 1000;
        background: var(--gray-900);
        color: white;
        padding: 8px 12px;
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        white-space: nowrap;
        box-shadow: var(--shadow-lg);
        opacity: 0;
        transform: translateY(5px);
        transition: all 0.3s var(--ease-out);
        pointer-events: none;
    `;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    tooltip.style.left = rect.left + (rect.width - tooltipRect.width) / 2 + 'px';
    tooltip.style.top = rect.top - tooltipRect.height - 8 + 'px';
    
    // Show tooltip with animation
    requestAnimationFrame(() => {
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateY(0)';
    });
    
    // Store reference for cleanup
    element._tooltip = tooltip;
}

function hideCustomTooltip(e) {
    const element = e.target;
    const tooltip = element._tooltip;
    
    if (tooltip) {
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateY(5px)';
        
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 300);
        
        delete element._tooltip;
    }
}

// =====================================================
// PAGE TRANSITIONS
// =====================================================

function initializePageTransitions() {
    // Add entrance animation to main content
    const container = document.querySelector('.container');
    if (container) {
        container.classList.add('page-transition', 'fade-in');
    }
    
    // Handle form submission with loading overlay
    const form = document.getElementById('siteSetupForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            showLoadingOverlay();
            handleFormSubmission();
        });
    }
}

function showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('show');
        
        // Add some dynamic text changes
        const messages = [
            'Creating Your Amazing Store...',
            'Setting Up Your Products...',
            'Configuring Your Settings...',
            'Adding Final Touches...',
            'Almost Ready...'
        ];
        
        let messageIndex = 0;
        const messageElement = overlay.querySelector('h4');
        
        const messageInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            messageElement.textContent = messages[messageIndex];
        }, 1000);
        
        // Store interval reference for cleanup
        overlay._messageInterval = messageInterval;
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        // Clear message interval
        if (overlay._messageInterval) {
            clearInterval(overlay._messageInterval);
        }
        
        overlay.classList.remove('show');
    }
}

// =====================================================
// ENHANCED FORM SUBMISSION
// =====================================================

function handleAdvancedFormSubmission() {
    const form = document.getElementById('siteSetupForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Validate that we have required data
    if (!validateFormCompletion()) {
        return;
    }
    
    // Collect all form data
    const formData = new FormData(form);
    formData.append('selectedPages', JSON.stringify(appState.selectedPages));
    formData.append('selectedProducts', JSON.stringify(appState.selectedProducts));
    
    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = 'Creating Your Store...';
    submitBtn.disabled = true;
    
    // Simulate realistic creation process
    setTimeout(() => {
        hideLoadingOverlay();
        createEpicCelebration();
        showSuccessMessage();
    }, 5000);
}

// Initialize performance monitoring
console.log('✨ Premium interactive experience loaded successfully!');
console.log('🎯 All systems ready for an amazing user experience!');