# Garmin MCP Server Troubleshooting

## ✅ Fixed: CommonJS Import Issue

**Problem:** The MCP server failed to start with error:
```
SyntaxError: Named export 'GarminConnect' not found. The requested module 'garmin-connect' is a CommonJS module
```

**Solution:** Updated the import statement in `src/garmin-client.ts` from:
```typescript
import { GarminConnect } from 'garmin-connect';
```
to:
```typescript
import pkg from 'garmin-connect';
const { GarminConnect } = pkg;
```

## ✅ Fixed: Sleep Data Retrieval Issue

**Problem:** Sleep data was returning all zeros despite having sleep tracking enabled:
```json
{
  "totalSleepTimeSeconds": 0,
  "deepSleepSeconds": 0,
  "lightSleepSeconds": 0,
  "remSleepSeconds": 0,
  "sleepQualityTypeName": "Unknown"
}
```

**Root Cause:** The sleep data structure in the garmin-connect package was different than expected:
1. Total sleep time is stored as `sleepTimeSeconds` (not `totalSleepTimeSeconds`)
2. Sleep quality comes from `sleepScores.overall.value` (not `sleepQualityTypeName`)
3. Data must be accessed through the correct nested structure

**Solution Applied:**
```typescript
// Fixed field mapping:
totalSleepTimeSeconds: dailySleep.sleepTimeSeconds || 0,
sleepQualityTypeName: `Score: ${dailySleep.sleepScores?.overall?.value || 'N/A'}`,

// Fixed date handling - pass Date objects directly:
const sleepData = await this.client.getSleepData(start);
```

**Test Sleep Data:**
```bash
cd garmin-mcp
node debug-sleep.cjs
```

## Verification Steps

1. **Check if MCP server starts:**
   ```bash
   cd garmin-mcp
   node dist/index.js
   ```
   Should show: `Garmin MCP server running on stdio`

2. **Test MCP server response:**
   ```bash
   node test-mcp.cjs
   ```
   Should return JSON with tool definitions

3. **Verify Claude Desktop config:**
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
   Should contain the correct path to your MCP server

## Next Steps for Setup

1. **Restart Claude Desktop** after making config changes
2. **Test authentication** with your Garmin Connect credentials
3. **Try basic commands** like "Show me my recent activities"

## Common Issues

### "Extension not found" Warning
- Restart Claude Desktop completely
- Verify the absolute path in claude_desktop_config.json
- Check file permissions on dist/index.js

### Authentication Fails
- Verify Garmin Connect credentials work on the web
- Check if account requires 2FA (not currently supported)
- Ensure account is not locked

### No Activity Data
- Sync your Garmin device with Garmin Connect
- Check date ranges in your requests
- Verify you have activities in the requested time period

## Debug Mode

To see detailed logs:
```bash
cd garmin-mcp
node dist/index.js 2>&1 | tee debug.log
```

This will show all communication between Claude and the MCP server.
