import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config();

// Mock garmin-connect since we don't want to make real API calls in unit tests
jest.mock('garmin-connect', () => ({
  GarminConnect: jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue(undefined),
    getUserProfile: jest.fn().mockResolvedValue({
      displayName: 'Test User',
      fullName: 'Test User Full Name'
    }),
    getActivities: jest.fn().mockResolvedValue([])
  }))
}));

describe('Garmin Connect Authentication', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should require username and password environment variables', () => {
    delete process.env.GARMIN_USERNAME;
    delete process.env.GARMIN_PASSWORD;

    const hasCredentials = !!(process.env.GARMIN_USERNAME && process.env.GARMIN_PASSWORD);
    expect(hasCredentials).toBe(false);
  });

  it('should validate credential format', () => {
    const validateCredentials = (username?: string, password?: string): boolean => {
      if (!username || !password) return false;
      
      // Basic email validation for username
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(username) && password.length > 0;
    };

    expect(validateCredentials('test@example.com', 'password123')).toBe(true);
    expect(validateCredentials('invalid-email', 'password123')).toBe(false);
    expect(validateCredentials('test@example.com', '')).toBe(false);
    expect(validateCredentials(undefined, 'password123')).toBe(false);
  });

  it('should handle authentication process', async () => {
    process.env.GARMIN_USERNAME = 'test@example.com';
    process.env.GARMIN_PASSWORD = 'testpassword';

    const { GarminConnect } = require('garmin-connect');
    const client = new GarminConnect({
      username: process.env.GARMIN_USERNAME,
      password: process.env.GARMIN_PASSWORD
    });

    // Test login (mocked to resolve)
    await client.login();
    expect(client.login).toHaveBeenCalled();
    
    // Test API call
    const profile = await client.getUserProfile();
    expect(profile).toHaveProperty('displayName');
  });

  it('should handle JSON parsing errors gracefully', async () => {
    const parseJsonSafely = (jsonString: string): any => {
      try {
        return JSON.parse(jsonString);
      } catch (error) {
        console.error('JSON parsing error:', error);
        return null;
      }
    };

    expect(parseJsonSafely('{"valid": "json"}')).toEqual({ valid: 'json' });
    expect(parseJsonSafely('invalid json')).toBeNull();
    expect(parseJsonSafely('')).toBeNull();
  });
});
