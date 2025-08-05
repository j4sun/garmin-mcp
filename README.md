# Garmin MCP Server

A Model Context Protocol (MCP) server that integrates with Garmin Connect to provide activity insights and training suggestions for Claude Desktop.

## Features

- **Activity Tracking**: Retrieve recent activities from Garmin Connect
- **Activity Insights**: Get detailed analysis of individual activities or activity patterns
- **Training Suggestions**: AI-powered recommendations based on your training data and health metrics
- **Health Metrics**: Access to comprehensive health data including heart rate, sleep, stress, and body battery
- **Performance Analysis**: Automated analysis of training load, recovery, and performance trends

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   cd garmin-mcp
   npm install
   ```

3. Build the TypeScript code:
   ```bash
   npm run build
   ```

## Configuration

### Environment Variables Setup (Recommended)

For security and convenience, you can store your Garmin Connect credentials in environment variables:

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the .env file with your credentials:**
   ```bash
   # .env
   GARMIN_USERNAME=your.email@example.com
   GARMIN_PASSWORD=your_secure_password
   GARMIN_AUTO_AUTH=true
   ```

3. **Secure the file:**
   ```bash
   chmod 600 .env
   ```

With environment variables configured, the MCP server will:
- Automatically authenticate on startup (if `GARMIN_AUTO_AUTH=true`)
- Use your stored credentials as fallback for authentication commands
- Keep your credentials secure and out of version control

### Claude Desktop Setup

Add the MCP server to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\\Claude\\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "garmin": {
      "command": "node",
      "args": ["path/to/garmin-mcp/dist/index.js"]
    }
  }
}
```

### Garmin Connect Authentication

The MCP server supports multiple authentication methods:

#### Option 1: Environment Variables (Recommended)
Set up your `.env` file as described above. The server will automatically authenticate on startup.

#### Option 2: Manual Authentication
Use the `authenticate_garmin` tool within Claude Desktop. If you have environment variables set, you can simply call:
- "Please authenticate with Garmin Connect" (uses env vars)
- Or provide credentials manually: "Authenticate with username X and password Y"

**Important**: Credentials are only stored in memory during the session and are not persisted to disk.

## Available Tools

### 1. `authenticate_garmin`
Authenticate with Garmin Connect using your username and password.

**Parameters**:
- `username`: Your Garmin Connect username
- `password`: Your Garmin Connect password

### 2. `get_activities`
Retrieve recent activities from Garmin Connect.

**Parameters**:
- `days` (optional): Number of days to look back (default: 30)
- `limit` (optional): Maximum number of activities to return (default: 50)

### 3. `get_activity_insights`
Get detailed insights for a specific activity or recent activities.

**Parameters**:
- `activityId` (optional): Specific activity ID to analyze
- `days` (optional): Number of days to analyze if no activity ID specified (default: 7)

### 4. `get_training_suggestions`
Get AI-powered training suggestions based on recent activities and performance.

**Parameters**:
- `activityType` (optional): Type of activity to focus on ('running', 'cycling', 'swimming', 'strength', 'all')
- `days` (optional): Number of days of history to consider (default: 14)

### 5. `get_health_metrics`
Get health and wellness metrics from Garmin Connect.

**Parameters**:
- `startDate` (optional): Start date in YYYY-MM-DD format
- `endDate` (optional): End date in YYYY-MM-DD format
- `metrics` (optional): Specific metrics to retrieve (['heartRate', 'stress', 'sleep', 'bodyBattery', 'vo2Max'])

## Usage Examples

### Getting Started
1. **Authenticate**: "Please authenticate with my Garmin Connect account"
2. **View Recent Activities**: "Show me my recent activities"
3. **Get Insights**: "Analyze my running performance from the last week"
4. **Training Advice**: "Give me training suggestions based on my recent workouts"

### Detailed Analysis
- "What are my sleep patterns and how do they affect my recovery?"
- "Analyze my heart rate trends during cycling activities"
- "Give me specific recommendations for improving my running pace"
- "How is my training load compared to my recovery metrics?"

## Data Privacy

- This MCP server accesses your Garmin Connect data only during active sessions
- No data is stored permanently on your device
- Authentication credentials are not persisted between sessions
- All data processing happens locally on your machine

## Dependencies

- `@modelcontextprotocol/sdk`: MCP SDK for TypeScript
- `garmin-connect`: Unofficial Garmin Connect API client
- `zod`: Schema validation

## Development

To run in development mode:
```bash
npm run dev
```

To build:
```bash
npm run build
```

## Limitations

- Requires valid Garmin Connect credentials
- Depends on the unofficial Garmin Connect API (may break with Garmin updates)
- Some advanced metrics may not be available depending on your Garmin device
- Rate limiting by Garmin Connect may apply

## Troubleshooting

### Authentication Issues
- Ensure your Garmin Connect credentials are correct
- Check if your account requires two-factor authentication (not currently supported)
- Verify your account is not locked or suspended

### Missing Data
- Some metrics require specific Garmin devices
- Ensure your device is synced with Garmin Connect
- Check that the requested date range contains activities

### Connection Issues
- Verify your internet connection
- Check if Garmin Connect services are operational
- Try authenticating again if the session has expired

## License

MIT License - see LICENSE file for details
