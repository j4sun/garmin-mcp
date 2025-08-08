import { spawn, ChildProcess } from 'child_process';
import path from 'path';

describe('Garmin MCP Server', () => {
  let serverProcess: ChildProcess | null = null;
  
  beforeEach(() => {
    jest.setTimeout(10000);
  });

  afterEach(() => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });

  it('should start without errors', (done) => {
    const serverPath = path.join(__dirname, '..', 'dist', 'index.js');
    
    serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let hasStarted = false;
    
    // Check if server starts successfully
    serverProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      // Look for successful startup messages
      if (output.includes('Garmin MCP server running') && !hasStarted) {
        hasStarted = true;
        done();
      } else if (output.includes('Error:') && !hasStarted) {
        done(new Error(`Server failed to start: ${output}`));
      }
    });

    serverProcess.on('error', (error) => {
      if (!hasStarted) {
        done(new Error(`Failed to start server process: ${error.message}`));
      }
    });

    // Timeout fallback
    setTimeout(() => {
      if (!hasStarted) {
        done(new Error('Server did not start within timeout'));
      }
    }, 5000);
  });

  it('should handle MCP protocol initialization', (done) => {
    const serverPath = path.join(__dirname, '..', 'dist', 'index.js');
    
    serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Send MCP initialization request
    const initRequest = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        }
      }
    }) + '\n';

    let responseReceived = false;
    let serverStarted = false;

    serverProcess.stdout?.on('data', (data) => {
      const response = data.toString();
      try {
        const parsed = JSON.parse(response);
        if (parsed.id === 1 && parsed.result) {
          responseReceived = true;
          expect(parsed.result).toHaveProperty('capabilities');
          done();
        }
      } catch (e) {
        // Not JSON or not the response we're looking for
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Garmin MCP server running') && !serverStarted) {
        serverStarted = true;
        // Send request after server starts
        setTimeout(() => {
          serverProcess?.stdin?.write(initRequest);
        }, 100);
      } else if (output.includes('Error:') && !responseReceived) {
        done(new Error(`Server error: ${output}`));
      }
    });

    // Timeout fallback
    setTimeout(() => {
      if (!responseReceived) {
        done(new Error('No initialization response received'));
      }
    }, 6000);
  });
});
