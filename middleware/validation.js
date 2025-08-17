const validator = require('validator');

// Validation middleware for site setup forms
const validateSiteSetup = (req, res, next) => {
  const errors = [];
  const { step } = req.body;

  if (step === 'create-store') {
    // Validate store creation step - check for both storeName and brandName
    const storeName = req.body.storeName || req.body.brandName;
    if (!storeName || storeName.trim().length < 2) {
      errors.push('Brand name must be at least 2 characters long');
    }

    // Check for domain in either siteUrl or domain field
    const domainValue = req.body.siteUrl || req.body.domain;
    if (!domainValue) {
      errors.push('Valid domain is required');
    } else {
      // Normalize URL for validation (remove protocol, add it back)
      let urlToValidate = domainValue.replace(/^https?:\/\//i, '');
      urlToValidate = urlToValidate.replace(/^www\./i, '');
      
      // Validate as domain or URL
      const isValidDomain = validator.isFQDN(urlToValidate) || validator.isURL('https://' + urlToValidate);
      if (!isValidDomain) {
        errors.push('Valid domain is required');
      }
    }

    if (!req.body.country || req.body.country.length !== 2) {
      errors.push('Valid country code is required');
    }

    if (!req.body.language || req.body.language.length !== 2) {
      errors.push('Valid language code is required');
    }

    if (!req.body.currency || req.body.currency.length !== 3) {
      errors.push('Valid currency code is required');
    }

    // Validate Shopify fields if provided
    if (req.body.shopifyDomain) {
      if (!req.body.shopifyToken) {
        errors.push('Shopify access token is required when Shopify domain is provided');
      }
      
      const shopifyDomain = req.body.shopifyDomain.includes('.myshopify.com') 
        ? req.body.shopifyDomain 
        : `${req.body.shopifyDomain}.myshopify.com`;
      
      if (!validator.isURL(shopifyDomain)) {
        errors.push('Valid Shopify domain is required');
      }
    }

    // Validate optional meta fields
    if (req.body.metaTitle && req.body.metaTitle.length > 60) {
      errors.push('Meta title should be 60 characters or less');
    }

    if (req.body.metaDescription && req.body.metaDescription.length > 160) {
      errors.push('Meta description should be 160 characters or less');
    }
  }

  if (errors.length > 0) {
    // For form submissions (not API calls), render error page instead of JSON
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
      return res.status(400).render('error', {
        title: 'Validation Error',
        message: 'Please correct the following errors:',
        details: errors,
        statusCode: 400
      });
    }
    
    // For API calls, return JSON response
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Validation for API endpoints
const validateStoreCreation = (req, res, next) => {
  const errors = [];
  const { name, domain, country, language, currency } = req.body;

  if (!name || name.trim().length < 2) {
    errors.push('Store name must be at least 2 characters long');
  }

  if (!domain || !validator.isURL(domain, { require_protocol: false })) {
    errors.push('Valid domain is required');
  }

  if (!country || country.length !== 2) {
    errors.push('Valid country code is required (ISO 3166-1 alpha-2)');
  }

  if (!language || language.length !== 2) {
    errors.push('Valid language code is required (ISO 639-1)');
  }

  if (!currency || currency.length !== 3) {
    errors.push('Valid currency code is required (ISO 4217)');
  }

  // Validate optional color fields
  if (req.body.primary_color && !validator.isHexColor(req.body.primary_color)) {
    errors.push('Primary color must be a valid hex color');
  }

  if (req.body.secondary_color && !validator.isHexColor(req.body.secondary_color)) {
    errors.push('Secondary color must be a valid hex color');
  }

  // Validate optional URL fields
  if (req.body.logo_url && !validator.isURL(req.body.logo_url)) {
    errors.push('Logo URL must be a valid URL');
  }

  if (req.body.favicon_url && !validator.isURL(req.body.favicon_url)) {
    errors.push('Favicon URL must be a valid URL');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Sanitize input data but preserve HTML entities for form fields
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str, preserveForForms = false) => {
    if (typeof str !== 'string') return str;
    
    // For form submissions, be less aggressive with sanitization
    if (preserveForForms) {
      return str.trim();
    }
    
    return validator.escape(str.trim());
  };

  const sanitizeObject = (obj, preserveForForms = false) => {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value, preserveForForms);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? sanitizeString(item, preserveForForms) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, preserveForForms);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Check if this is a form submission
  const isFormSubmission = req.headers['content-type'] && 
    req.headers['content-type'].includes('application/x-www-form-urlencoded');

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body, isFormSubmission);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query, false);
  }

  next();
};

// Rate limiting helper
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(clientId)) {
      const clientRequests = requests.get(clientId).filter(time => time > windowStart);
      requests.set(clientId, clientRequests);
    }

    const clientRequests = requests.get(clientId) || [];
    
    if (clientRequests.length >= max) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${max} requests per ${Math.floor(windowMs / 60000)} minutes.`,
        retryAfter: Math.ceil((clientRequests[0] + windowMs - now) / 1000)
      });
    }

    clientRequests.push(now);
    requests.set(clientId, clientRequests);
    
    next();
  };
};

module.exports = {
  validateSiteSetup,
  validateStoreCreation,
  sanitizeInput,
  createRateLimiter
};