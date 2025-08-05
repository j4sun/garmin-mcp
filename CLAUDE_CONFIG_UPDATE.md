# Updated Claude Desktop Configuration

## Problem
Claude Desktop wasn't loading the `.env` file properly, so environment variables weren't available.

## Solution
Use the startup wrapper script that ensures environment variables are loaded.

## Update Your Configuration

### macOS
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "garmin": {
      "command": "node",
      "args": ["/Users/jasun/work/ampcode_test/garmin-mcp/start-server.cjs"]
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
      "args": ["C:\\path\\to\\garmin-mcp\\start-server.cjs"]
    }
  }
}
```

## What Changed
- **Before**: `"args": ["/path/to/garmin-mcp/dist/index.js"]`
- **After**: `"args": ["/path/to/garmin-mcp/start-server.cjs"]`

The startup script (`start-server.cjs`) ensures your `.env` file is properly loaded before starting the MCP server.

## Next Steps
1. Update your Claude Desktop configuration
2. Restart Claude Desktop completely
3. Try authentication: "Please authenticate with Garmin Connect"

The server should now auto-authenticate and environment variables should work properly! 🎉
