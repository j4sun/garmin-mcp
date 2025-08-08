import { spawn, ChildProcess } from 'child_process';
import path from 'path';

describe('Garmin Sleep Data Tests', () => {
  let serverProcess: ChildProcess | null = null;
  let messageId = 1;

  beforeEach(() => {
    jest.setTimeout(30000);
  });

  afterEach(() => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });

  const sendMessage = (name: string, args: Record<string, any>, serverProcess: ChildProcess): Promise<any> => {
    return new Promise((resolve, reject) => {
      const message = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: name,
          arguments: args
        }
      };

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      const responseHandler = (data: Buffer) => {
        const response = data.toString();
        try {
          const parsed = JSON.parse(response);
          if (parsed.id === message.id) {
            clearTimeout(timeout);
            serverProcess.stdout?.removeListener('data', responseHandler);
            resolve(parsed);
          }
        } catch (e) {
          // Not the response we're looking for
        }
      };

      serverProcess.stdout?.on('data', responseHandler);
      serverProcess.stdin?.write(JSON.stringify(message) + '\n');
    });
  };

  it('should validate date format for sleep data requests', () => {
    const validateDateFormat = (dateString: string): boolean => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateString)) return false;
      
      const date = new Date(dateString);
      return date instanceof Date && !isNaN(date.getTime());
    };

    expect(validateDateFormat('2024-01-15')).toBe(true);
    expect(validateDateFormat('2024-1-15')).toBe(false);
    expect(validateDateFormat('invalid-date')).toBe(false);
    expect(validateDateFormat('')).toBe(false);
  });

  it('should generate valid date ranges for sleep data', () => {
    const generateDateRange = (days: number): { startDate: string; endDate: string } => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };
    };

    const range = generateDateRange(7);
    expect(range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    
    const startTime = new Date(range.startDate).getTime();
    const endTime = new Date(range.endDate).getTime();
    expect(endTime).toBeGreaterThan(startTime);
  });

  it('should handle sleep data response parsing', () => {
    const parseSleepResponse = (responseText: string): any => {
      try {
        // Look for JSON in the response
        const jsonMatch = responseText.match(/\{.*\}/s);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return { error: 'No JSON found in response' };
      } catch (error) {
        return { error: 'Failed to parse JSON', details: error };
      }
    };

    const validJson = '{"sleepData": [{"date": "2024-01-01", "duration": 480}]}';
    const invalidJson = 'Sleep data: invalid json format';
    const mixedResponse = 'Here is your sleep data: {"sleepData": [{"date": "2024-01-01"}]}';

    expect(parseSleepResponse(validJson)).toHaveProperty('sleepData');
    expect(parseSleepResponse(invalidJson)).toHaveProperty('error');
    expect(parseSleepResponse(mixedResponse)).toHaveProperty('sleepData');
  });

  it('should validate sleep data structure', () => {
    const validateSleepData = (data: any): boolean => {
      if (!data || typeof data !== 'object') return false;
      if (!Array.isArray(data.sleepData)) return false;
      
      return data.sleepData.every((sleep: any) => 
        sleep.date && 
        typeof sleep.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}/.test(sleep.date)
      );
    };

    const validData = {
      sleepData: [
        { date: '2024-01-01', duration: 480 },
        { date: '2024-01-02', duration: 420 }
      ]
    };

    const invalidData = {
      sleepData: [
        { date: 'invalid-date', duration: 480 }
      ]
    };

    expect(validateSleepData(validData)).toBe(true);
    expect(validateSleepData(invalidData)).toBe(false);
    expect(validateSleepData(null)).toBe(false);
    expect(validateSleepData({})).toBe(false);
  });

  it('should calculate sleep statistics', () => {
    const calculateSleepStats = (sleepData: Array<{ duration: number }>): any => {
      if (!sleepData || sleepData.length === 0) {
        return { error: 'No sleep data provided' };
      }

      const durations = sleepData.map(s => s.duration).filter(d => typeof d === 'number');
      if (durations.length === 0) {
        return { error: 'No valid duration data' };
      }

      const total = durations.reduce((sum, duration) => sum + duration, 0);
      const average = total / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);

      return {
        totalHours: Math.round(total / 60 * 10) / 10,
        averageHours: Math.round(average / 60 * 10) / 10,
        maxHours: Math.round(max / 60 * 10) / 10,
        minHours: Math.round(min / 60 * 10) / 10,
        nights: durations.length
      };
    };

    const testData = [
      { duration: 480 }, // 8 hours
      { duration: 420 }, // 7 hours
      { duration: 540 }  // 9 hours
    ];

    const stats = calculateSleepStats(testData);
    expect(stats.nights).toBe(3);
    expect(stats.averageHours).toBe(8.0);
    expect(stats.maxHours).toBe(9.0);
    expect(stats.minHours).toBe(7.0);
  });
});
