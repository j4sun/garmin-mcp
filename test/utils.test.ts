describe('Date Format Utilities', () => {
  it('should format dates correctly', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    expect(formatDate(today)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatDate(yesterday)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    
    // Test that yesterday is actually one day before today
    const todayFormatted = formatDate(today);
    const yesterdayFormatted = formatDate(yesterday);
    
    const todayTime = new Date(todayFormatted).getTime();
    const yesterdayTime = new Date(yesterdayFormatted).getTime();
    
    expect(todayTime - yesterdayTime).toBe(24 * 60 * 60 * 1000); // 24 hours in milliseconds
  });

  it('should handle different date ranges', () => {
    const daysAgo = (days: number): string => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date.toISOString().split('T')[0];
    };

    expect(daysAgo(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(daysAgo(7)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(daysAgo(30)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should calculate date differences correctly', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-08');
    
    const diffInMs = endDate.getTime() - startDate.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    
    expect(diffInDays).toBe(7);
  });
});

describe('Environment Variables', () => {
  it('should handle missing environment variables gracefully', () => {
    const getEnvVar = (name: string, defaultValue: string | null = null): string | null => {
      return process.env[name] || defaultValue;
    };

    expect(getEnvVar('NONEXISTENT_VAR')).toBeNull();
    expect(getEnvVar('NONEXISTENT_VAR', 'default')).toBe('default');
  });

  it('should validate environment variable format', () => {
    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  it('should validate boolean environment variables', () => {
    const parseBooleanEnv = (value: string | undefined): boolean => {
      if (!value) return false;
      return value.toLowerCase() === 'true' || value === '1';
    };

    expect(parseBooleanEnv('true')).toBe(true);
    expect(parseBooleanEnv('TRUE')).toBe(true);
    expect(parseBooleanEnv('1')).toBe(true);
    expect(parseBooleanEnv('false')).toBe(false);
    expect(parseBooleanEnv('0')).toBe(false);
    expect(parseBooleanEnv(undefined)).toBe(false);
  });
});
