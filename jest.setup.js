// Jest setup file for global test configuration

// Increase timeout for database operations
jest.setTimeout(15000);

// Mock console.log to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Reduce console noise during tests unless VERBOSE_TESTS is set
  if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.warn = jest.fn();1
    // Keep console.error for debugging test failures
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test helpers
global.createMockStore = (overrides = {}) => ({
  id: 1,
  uuid: 'test-uuid-123',
  name: 'Test Store',
  domain: 'test.example.com',
  subdomain: 'test-store',
  country: 'US',
  language: 'en',
  currency: 'USD',
  timezone: 'UTC',
  shopify_domain: null,
  shopify_access_token: null,
  shopify_shop_name: null,
  shopify_connected: false,
  theme_id: 'default',
  logo_url: null,
  primary_color: '#007cba',
  secondary_color: '#f8f9fa',
  meta_title: 'Test Store',
  meta_description: 'A test store for unit testing',
  favicon_url: null,
  shipping_info: null,
  shipping_time: null,
  return_policy: null,
  return_period: null,
  support_email: 'support@test.example.com',
  support_phone: null,
  business_address: null,
  business_orgnr: null,
  gdpr_compliant: false,
  cookie_consent: false,
  selected_pages: 'home,products,about,contact',
  prefooter_enabled: false,
  status: 'setup',
  deployment_status: 'pending',
  deployment_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deployed_at: null,
  ...overrides
});

global.createMockPage = (overrides = {}) => ({
  id: 1,
  store_id: 1,
  page_type: 'home',
  slug: '',
  title: 'Home Page',
  subtitle: 'Welcome to our store',
  content: JSON.stringify([{
    type: 'text',
    content: 'Welcome to our amazing store!'
  }]),
  meta_title: 'Home Page - Test Store',
  meta_description: 'Welcome to our test store',
  is_enabled: true,
  sort_order: 0,
  template_data: JSON.stringify({ layout: 'basic' }),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

// Mock external dependencies by default
jest.mock('child_process', () => ({
  exec: jest.fn(),
  execSync: jest.fn()
}));

jest.mock('node-fetch', () => jest.fn());

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

// Mock sqlite3 to avoid native module issues
jest.mock('sqlite3', () => ({
  verbose: jest.fn(() => ({
    Database: jest.fn().mockImplementation(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
      close: jest.fn()
    }))
  }))
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:'; // Use in-memory SQLite for tests