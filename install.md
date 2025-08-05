# Garmin MCP Server Installation Guide

## Prerequisites

- Node.js (version 18 or higher)
- npm
- A Garmin Connect account

## Installation Steps

1. **Install dependencies and build:**
   ```bash
   cd garmin-mcp
   npm install
   npm run build
   ```

2. **Set up environment variables (recommended):**
   ```bash
   cp .env.example .env
   # Edit .env with your Garmin Connect credentials
   chmod 600 .env
   ```

3. **Test the installation:**
   ```bash
   # Test basic functionality
   node test-mcp.cjs
   
   # Test environment variable authentication (if configured)
   node test-env-auth.cjs
   ```

## Claude Desktop Configuration

Add the following to your Claude Desktop configuration:

### macOS
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "garmin": {
      "command": "node",
      "args": ["/path/to/garmin-mcp/dist/index.js"]
    }
  }
}
```

### Windows
Edit `%APPDATA%\\Claude\\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "garmin": {
      "command": "node",
      "args": ["C:\\path\\to\\garmin-mcp\\dist\\index.js"]
    }
  }
}
```

**Important:** Replace `/path/to/garmin-mcp/dist/index.js` with the actual absolute path to your compiled MCP server.

## Usage

1. Restart Claude Desktop after updating the configuration
2. The Garmin MCP server should now be available
3. You can start using commands like:
   - "Please authenticate with my Garmin Connect account"
   - "Show me my recent activities"
   - "Give me training suggestions based on my recent workouts"
   - "Analyze my sleep patterns"

## Troubleshooting

### Common Issues

1. **Authentication fails:**
   - Check your Garmin Connect credentials
   - Ensure your account isn't locked
   - Try logging into Garmin Connect via web browser first

2. **No activities found:**
   - Ensure your Garmin device is synced with Garmin Connect
   - Check that you have activities in the requested date range

3. **Server doesn't start:**
   - Make sure you've run `npm run build`
   - Check that the path in your Claude Desktop config is correct
   - Verify Node.js is installed and accessible

### Debug Mode

To run the server in debug mode:
```bash
node dist/index.js
```

This will show server logs and help identify issues.

## Security Notes

- Your Garmin Connect credentials are only stored in memory during the session
- No data is persisted between sessions
- All processing happens locally on your machine
- Consider using environment variables for credentials in production scenarios

## Support

If you encounter issues:
1. Check the console output for error messages
2. Verify all dependencies are installed
3. Ensure your Garmin Connect account is accessible
4. Try the test script to verify basic functionality
