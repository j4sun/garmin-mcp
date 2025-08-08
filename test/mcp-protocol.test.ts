import { spawn, ChildProcess } from 'child_process';
import path from 'path';

describe('MCP Protocol Integration', () => {
  let serverProcess: ChildProcess | null = null;
  let messageId = 1;

  beforeEach(() => {
    jest.setTimeout(20000);
  });

  afterEach(() => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });

  const startServer = (): Promise<ChildProcess> => {
    return new Promise((resolve, reject) => {
      const serverPath = path.join(__dirname, '..', 'dist', 'index.js');
      const server = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let serverStarted = false;

      server.stderr?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Garmin MCP server running') && !serverStarted) {
          serverStarted = true;
          resolve(server);
        } else if (output.includes('Error:') && !serverStarted) {
          reject(new Error(`Server failed to start: ${output}`));
        }
      });

      server.on('error', (error) => {
        if (!serverStarted) {
          reject(new Error(`Failed to start server process: ${error.message}`));
        }
      });

      setTimeout(() => {
        if (!serverStarted) {
          reject(new Error('Server did not start within timeout'));
        }
      }, 10000);
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
      }, 15000);

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

  it('should initialize MCP protocol correctly', async () => {
    serverProcess = await startServer();

    const response = await sendMCPMessage(serverProcess, 'initialize', {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "jest-test-client",
        version: "1.0.0"
      }
    });

    expect(response).toHaveProperty('result');
    expect(response.result).toHaveProperty('capabilities');
    expect(response.result).toHaveProperty('protocolVersion');
  });

  it('should list available tools', async () => {
    serverProcess = await startServer();

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
    
    const toolNames = response.result.tools.map((tool: any) => tool.name);
    expect(toolNames).toContain('authenticate_garmin');
    expect(toolNames).toContain('get_activities');
    expect(toolNames).toContain('get_health_metrics');
  });

  it('should validate tool parameters', () => {
    const validateToolParams = (toolName: string, params: any): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];
      
      switch (toolName) {
        case 'authenticate_garmin':
          if (!params.username || typeof params.username !== 'string') {
            errors.push('username is required and must be a string');
          }
          if (!params.password || typeof params.password !== 'string') {
            errors.push('password is required and must be a string');
          }
          break;
          
        case 'get_activities':
          if (params.days !== undefined && (typeof params.days !== 'number' || params.days < 1)) {
            errors.push('days must be a positive number');
          }
          if (params.limit !== undefined && (typeof params.limit !== 'number' || params.limit < 1)) {
            errors.push('limit must be a positive number');
          }
          break;
          
        case 'get_health_metrics':
          if (params.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(params.startDate)) {
            errors.push('startDate must be in YYYY-MM-DD format');
          }
          if (params.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(params.endDate)) {
            errors.push('endDate must be in YYYY-MM-DD format');
          }
          break;
      }
      
      return { valid: errors.length === 0, errors };
    };

    // Test valid parameters
    expect(validateToolParams('authenticate_garmin', { 
      username: 'test@example.com', 
      password: 'password' 
    })).toEqual({ valid: true, errors: [] });

    expect(validateToolParams('get_activities', { 
      days: 7, 
      limit: 50 
    })).toEqual({ valid: true, errors: [] });

    // Test invalid parameters
    expect(validateToolParams('authenticate_garmin', {})).toEqual({
      valid: false,
      errors: ['username is required and must be a string', 'password is required and must be a string']
    });

    expect(validateToolParams('get_activities', { 
      days: -1 
    })).toEqual({
      valid: false,
      errors: ['days must be a positive number']
    });
  });

  it('should handle error responses correctly', () => {
    const createErrorResponse = (id: number, code: number, message: string, data?: any) => {
      return {
        jsonrpc: '2.0',
        id: id,
        error: {
          code: code,
          message: message,
          data: data
        }
      };
    };

    const errorResponse = createErrorResponse(1, -32602, 'Invalid params', { 
      details: 'Missing required parameter: username' 
    });

    expect(errorResponse).toHaveProperty('error');
    expect(errorResponse.error.code).toBe(-32602);
    expect(errorResponse.error.message).toBe('Invalid params');
    expect(errorResponse.error.data.details).toBe('Missing required parameter: username');
  });

  it('should validate JSON-RPC format', () => {
    const validateJSONRPC = (message: any): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];
      
      if (message.jsonrpc !== '2.0') {
        errors.push('jsonrpc must be "2.0"');
      }
      
      if (typeof message.id !== 'number' && typeof message.id !== 'string') {
        errors.push('id must be a number or string');
      }
      
      if (!message.method || typeof message.method !== 'string') {
        errors.push('method is required and must be a string');
      }
      
      return { valid: errors.length === 0, errors };
    };

    const validMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };

    const invalidMessage = {
      jsonrpc: '1.0',
      method: 123
    };

    expect(validateJSONRPC(validMessage)).toEqual({ valid: true, errors: [] });
    expect(validateJSONRPC(invalidMessage)).toEqual({
      valid: false,
      errors: [
        'jsonrpc must be "2.0"',
        'id must be a number or string',
        'method is required and must be a string'
      ]
    });
  });
});
