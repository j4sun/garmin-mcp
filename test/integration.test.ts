import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

describe('Integration Tests (requires real credentials)', () => {
  let serverProcess: ChildProcess | null = null;
  let messageId = 1;

  // Skip these tests in CI or if credentials not available
  const hasCredentials = process.env.GARMIN_USERNAME && process.env.GARMIN_PASSWORD;
  const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true' && hasCredentials;

  beforeEach(() => {
    jest.setTimeout(60000); // 60 seconds for real API calls
  });

  afterEach(() => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });

  const startMCPServer = (): Promise<ChildProcess> => {
    return new Promise((resolve, reject) => {
      const serverPath = path.join(__dirname, '..', 'dist', 'index.js');
      const server = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let serverStarted = false;
      const timeout = setTimeout(() => {
        if (!serverStarted) {
          reject(new Error('Server did not start within timeout'));
        }
      }, 15000);

      server.stderr?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Garmin MCP server running') && !serverStarted) {
          clearTimeout(timeout);
          serverStarted = true;
          resolve(server);
        } else if (output.includes('Error:') && !serverStarted) {
          clearTimeout(timeout);
          reject(new Error(`Server failed to start: ${output}`));
        }
      });

      server.on('error', (error) => {
        if (!serverStarted) {
          clearTimeout(timeout);
          reject(new Error(`Failed to start server process: ${error.message}`));
        }
      });
    });
  };

  const sendMCPMessage = (server: ChildProcess, method: string, params: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      const message = {
        jsonrpc: '2.0',
        id: messageId++,
        method: method,
        params: params
      };

      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for ${method}`));
      }, 30000);

      const responseHandler = (data: Buffer) => {
        const response = data.toString();
        try {
          const parsed = JSON.parse(response);
          if (parsed.id === message.id) {
            clearTimeout(timeout);
            server.stdout?.removeListener('data', responseHandler);
            resolve(parsed);
          }
        } catch (e) {
          // Not the response we're looking for or not valid JSON
        }
      };

      server.stdout?.on('data', responseHandler);
      server.stdin?.write(JSON.stringify(message) + '\n');
    });
  };

  describe('Environment Configuration', () => {
    it('should check .env file status', () => {
      const envExists = fs.existsSync('.env');
      
      if (envExists) {
        const envContent = fs.readFileSync('.env', 'utf8');
        const hasUsername = envContent.includes('GARMIN_USERNAME=') && 
                           !envContent.includes('GARMIN_USERNAME=your.email@example.com');
        const hasPassword = envContent.includes('GARMIN_PASSWORD=') && 
                           !envContent.includes('GARMIN_PASSWORD=your_password_here');

        console.log('📁 .env file found');
        console.log(`Username configured: ${hasUsername ? '✅' : '❌'}`);
        console.log(`Password configured: ${hasPassword ? '✅' : '❌'}`);
        
        // Test passes regardless, just reports status
        expect(envExists).toBe(true);
      } else {
        console.log('📁 No .env file found (optional for unit tests)');
        // Test passes even without .env file
        expect(envExists).toBe(false);
      }
    });
  });

  describe('Real MCP Server Integration', () => {
    it('should start MCP server and handle initialization', async () => {
      serverProcess = await startMCPServer();

      const response = await sendMCPMessage(serverProcess, 'initialize', {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "integration-test-client",
          version: "1.0.0"
        }
      });

      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('capabilities');
    });

    it('should list tools via MCP protocol', async () => {
      serverProcess = await startMCPServer();

      // Initialize first
      await sendMCPMessage(serverProcess, 'initialize', {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" }
      });

      const response = await sendMCPMessage(serverProcess, 'tools/list');

      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('tools');
      expect(Array.isArray(response.result.tools)).toBe(true);
    });
  });

  describe('Real Garmin Connect Integration', () => {
    // Only run if explicitly enabled and credentials available
    const testCondition = runIntegrationTests ? it : it.skip;

    testCondition('should authenticate with real Garmin Connect', async () => {
      serverProcess = await startMCPServer();

      // Initialize
      await sendMCPMessage(serverProcess, 'initialize', {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" }
      });

      // Authenticate with real credentials
      const authResponse = await sendMCPMessage(serverProcess, 'tools/call', {
        name: 'authenticate_garmin',
        arguments: {
          username: process.env.GARMIN_USERNAME,
          password: process.env.GARMIN_PASSWORD
        }
      });

      expect(authResponse).toHaveProperty('result');
      expect(authResponse.result.content[0].text).toContain('Successfully authenticated');
    });

    testCondition('should fetch real activities data', async () => {
      serverProcess = await startMCPServer();

      // Initialize and authenticate
      await sendMCPMessage(serverProcess, 'initialize', {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" }
      });

      await sendMCPMessage(serverProcess, 'tools/call', {
        name: 'authenticate_garmin',
        arguments: {
          username: process.env.GARMIN_USERNAME,
          password: process.env.GARMIN_PASSWORD
        }
      });

      // Get activities
      const activitiesResponse = await sendMCPMessage(serverProcess, 'tools/call', {
        name: 'get_activities',
        arguments: {
          days: 7,
          limit: 5
        }
      });

      expect(activitiesResponse).toHaveProperty('result');
      expect(activitiesResponse.result.content[0].text).toBeDefined();
    });
  });
});
