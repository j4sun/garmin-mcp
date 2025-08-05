# Garmin MCP Session Management

## Common Authentication Issues

### "Unexpected token 'l', 'login page'... is not valid JSON"

This error occurs when:
1. Your Garmin Connect session has expired
2. Garmin returns an HTML login page instead of JSON data
3. The MCP tries to parse the HTML as JSON and fails

### Solutions

#### 1. **Automatic Re-authentication (Recommended)**
If you have credentials in your `.env` file:
- The MCP will automatically detect session expiry
- It will attempt to re-authenticate in the background
- You'll get a clear error message telling you to retry

#### 2. **Manual Re-authentication**
If auto-auth is disabled or fails:
- Call the `authenticate_garmin` function again
- This will establish a new session

#### 3. **Test Authentication Status**
Run the test script to check your current auth status:
```bash
node test-auth-status.cjs
```

## Error Handling Improvements

The MCP now includes:
- Detection of login page errors vs other API errors
- Automatic session expiry detection
- Clear error messages indicating when to re-authenticate
- Background re-authentication attempts when credentials are available

## Prevention

To minimize session expiry issues:
1. Set `GARMIN_AUTO_AUTH=true` in your `.env` file
2. Ensure your `.env` has valid credentials
3. The MCP will handle re-authentication automatically

## Troubleshooting

If you continue getting authentication errors:
1. Check your Garmin Connect credentials
2. Verify your account isn't locked
3. Try logging into Garmin Connect via web browser first
4. Run `node test-auth-status.cjs` to diagnose the issue
