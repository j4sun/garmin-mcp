# Environment Variables Setup Guide

## 🔐 Secure Credential Management

The Garmin MCP server now supports environment variables for secure credential storage, eliminating the need to enter your username and password every time.

## Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit your credentials:**
   ```bash
   nano .env  # or use your preferred editor
   ```

3. **Configure your .env file:**
   ```env
   GARMIN_USERNAME=your.email@example.com
   GARMIN_PASSWORD=your_secure_password
   GARMIN_AUTO_AUTH=true
   ```

4. **Secure the file:**
   ```bash
   chmod 600 .env
   ```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GARMIN_USERNAME` | Yes | Your Garmin Connect email/username |
| `GARMIN_PASSWORD` | Yes | Your Garmin Connect password |
| `GARMIN_AUTO_AUTH` | No | Auto-authenticate on server start (true/false) |

## How It Works

### Auto-Authentication
When `GARMIN_AUTO_AUTH=true`, the server automatically logs in when it starts:
```bash
🔐 Auto-authenticated with Garmin Connect
```

### Fallback Authentication
The `authenticate_garmin` tool can now use environment variables:
- **With env vars**: "Please authenticate with Garmin Connect" ✅
- **Manual**: "Authenticate with username X and password Y" ✅

### Security Features
- ✅ Credentials stored locally only
- ✅ File automatically excluded from git (.gitignore)
- ✅ No credentials in command history
- ✅ Session-only memory storage
- ✅ Proper file permissions (600)

## Testing

Test your setup with:
```bash
# Test environment variable authentication
node test-env-auth.cjs

# Test manual authentication fallback
node test-sleep-comprehensive.cjs
```

## Troubleshooting

### "Auto-authentication failed"
- Check your username/password are correct
- Verify you can log in to Garmin Connect web interface
- Check for special characters in password (may need escaping)

### "No .env file found"
```bash
cp .env.example .env
# Edit the .env file with your credentials
```

### Environment variables not loading
- Ensure `.env` file is in the project root directory
- Check file permissions: `ls -la .env` should show `-rw-------`
- Restart the MCP server after changes

## Migration from Manual Auth

If you were previously entering credentials manually:

1. Set up `.env` file as described above
2. Restart Claude Desktop to pick up the new MCP server
3. Test with: "Please authenticate with Garmin Connect" (no credentials needed)

Your credentials are now secure and automatically available! 🎉
