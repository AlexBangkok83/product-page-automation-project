// Basic test to verify Jest setup is working

describe('Jest Setup', () => {
  test('should be able to run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  test('should have access to global test helpers', () => {
    const mockStore = createMockStore();
    expect(mockStore).toHaveProperty('name');
    expect(mockStore).toHaveProperty('domain');
    expect(mockStore.name).toBe('Test Store');
  });

  test('should have mocked external dependencies', () => {
    const axios = require('axios');
    expect(axios.get).toBeDefined();
    expect(axios.post).toBeDefined();
  });

  test('should handle async operations', async () => {
    const mockPromise = Promise.resolve('test result');
    const result = await mockPromise;
    expect(result).toBe('test result');
  });
});

describe('Store Data Helpers', () => {
  test('createMockStore should create valid store data', () => {
    const store = createMockStore({
      name: 'Custom Store',
      domain: 'custom.com'
    });

    expect(store.name).toBe('Custom Store');
    expect(store.domain).toBe('custom.com');
    expect(store.uuid).toBeDefined();
    expect(store.currency).toBe('USD');
    expect(store.deployment_status).toBe('pending');
  });

  test('createMockPage should create valid page data', () => {
    const page = createMockPage({
      page_type: 'about',
      title: 'About Us'
    });

    expect(page.page_type).toBe('about');
    expect(page.title).toBe('About Us');
    expect(page.store_id).toBe(1);
    expect(page.is_enabled).toBe(true);
  });
});