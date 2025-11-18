# ChatGPT Integration Guide for kiik.app

## Overview

kiik.app now supports integration with ChatGPT and other AI assistants through OAuth 2.0 and API key authentication. This allows you to manage your invoices, customers, projects, and more using natural language.

## Features

- **OAuth 2.0 Authorization**: Secure authorization flow with PKCE support
- **API Key Management**: Create and manage API tokens with granular scopes
- **Scope-Based Permissions**: Fine-grained control over what ChatGPT can access
- **Usage Logs**: Track all API calls made by your tokens
- **Token Revocation**: Instantly revoke access when needed

## Getting Started

### Option 1: API Keys (Recommended for Testing)

API keys are simpler to set up and perfect for testing or personal use.

#### Step 1: Create an API Key

1. Log in to kiik.app
2. Go to **Settings** → **API & ChatGPT** tab
3. Click **Create New Key**
4. Fill in the form:
   - **Name**: Give your key a descriptive name (e.g., "ChatGPT Production")
   - **Scopes**: Select the permissions you want to grant:
     - `customers:read` - View customers
     - `customers:write` - Create/update customers
     - `projects:read` - View projects
     - `projects:write` - Create/update projects
     - `invoices:read` - View invoices
     - `invoices:write` - Create/update invoices
     - `estimates:read` - View estimates
     - `estimates:write` - Create/update estimates
     - `cra:read` - View activity reports (CRA)
     - `cra:write` - Create/update activity reports
     - `documents:import` - Import and approve documents
     - `context:read` - Read aggregated context data
   - **Expiration Date** (optional): Set when the key should expire
5. Click **Create Key**

#### Step 2: Copy Your API Key

⚠️ **IMPORTANT**: The API key will only be shown once! Copy it immediately and store it securely.

The key format looks like: `fta_xxxxxxxxxxxxxxxxxxxxxxxxxx`

#### Step 3: Use Your API Key

You can use the API key with any HTTP client or integrate it with your applications:

```bash
# Example: List customers
curl -H "Authorization: Bearer fta_your_token_here" \
  https://api.kiik.app/api/ai-actions/context/customers/

# Example: Create an invoice
curl -X POST \
  -H "Authorization: Bearer fta_your_token_here" \
  -H "Content-Type: application/json" \
  -d '{"customer_id": 1, "amount": 1500, "description": "Consulting services"}' \
  https://api.kiik.app/api/ai-actions/actions/invoices/
```

### Option 2: OAuth 2.0 (For Third-Party Apps)

OAuth 2.0 is the standard authentication method for integrating third-party applications like ChatGPT.

#### For App Developers

If you're building an app that integrates with kiik.app:

1. **Register Your Application**:
   - Log in to kiik.app admin panel
   - Navigate to OAuth2 Provider → Applications
   - Click "Add Application"
   - Fill in:
     - **Name**: Your app name (e.g., "ChatGPT Integration")
     - **Client type**: Confidential
     - **Authorization grant type**: Authorization code
     - **Redirect URIs**: Your callback URL(s)
   - Save and copy your **Client ID** and **Client Secret**

2. **Authorization Endpoints**:
   ```
   Authorization URL: https://api.kiik.app/oauth/authorize/
   Token URL: https://api.kiik.app/oauth/token/
   ```

3. **Scopes**: Same as API key scopes (see above)

4. **PKCE**: Required for security (use S256 method)

#### For End Users (When ChatGPT Integration is Available)

1. Open ChatGPT
2. Search for "kiik.app" in the ChatGPT app store (when available)
3. Click "Install" or "Connect"
4. You'll be redirected to kiik.app
5. Review the requested permissions
6. Click **Authorize**
7. You'll be redirected back to ChatGPT
8. Start using natural language commands!

## Available API Endpoints

### Context Endpoints (Read-Only)

Get aggregated information about your kiik.app account:

- `GET /api/ai-actions/context/` - Summary counts
- `GET /api/ai-actions/context/customers/` - List customers
- `GET /api/ai-actions/context/projects/` - List projects
- `GET /api/ai-actions/context/invoices/` - List invoices
- `GET /api/ai-actions/context/estimates/` - List estimates
- `GET /api/ai-actions/context/cras/` - List activity reports

### Action Endpoints (Mutations)

Perform actions on your account:

- `GET /api/ai-actions/actions/` - List available actions
- `POST /api/ai-actions/actions/customers/` - Create customer
- `POST /api/ai-actions/actions/invoices/` - Create invoice
- `POST /api/ai-actions/actions/estimates/` - Create estimate
- `POST /api/ai-actions/actions/cras/` - Create CRA
- `POST /api/ai-actions/actions/import-customer/` - Approve document import

## Scope Descriptions

| Scope | Description | Endpoints |
|-------|-------------|-----------|
| `customers:read` | View customer list and details | `/context/customers/` |
| `customers:write` | Create and update customers | `/actions/customers/` |
| `projects:read` | View project list and details | `/context/projects/` |
| `projects:write` | Create and update projects | `/actions/projects/` (future) |
| `invoices:read` | View invoices | `/context/invoices/` |
| `invoices:write` | Create and update invoices | `/actions/invoices/` |
| `estimates:read` | View estimates | `/context/estimates/` |
| `estimates:write` | Create and update estimates | `/actions/estimates/` |
| `cra:read` | View activity reports | `/context/cras/` |
| `cra:write` | Create activity reports | `/actions/cras/` |
| `documents:import` | Import and approve documents | `/actions/import-customer/` |
| `context:read` | Read aggregated context | `/context/` |

## Managing API Keys

### View Your Keys

1. Go to **Settings** → **API & ChatGPT**
2. See all your active and revoked keys
3. Check when each key was last used

### View Usage Logs

1. In the API keys table, click **View Logs** for any token
2. See all API calls made with that token
3. Monitor:
   - Date and time of each call
   - Action performed
   - API path accessed
   - HTTP status code (success/error)

### Revoke a Key

1. In the API keys table, click **Revoke** for the key
2. Confirm the action
3. The key will be immediately deactivated
4. Any apps using this key will lose access instantly

## Security Best Practices

### Storing API Keys

✅ **DO**:
- Store API keys in environment variables
- Use secrets management tools (AWS Secrets Manager, Hashicorp Vault)
- Rotate keys regularly
- Use different keys for development and production

❌ **DON'T**:
- Commit keys to Git repositories
- Share keys via email or Slack
- Use the same key across multiple apps
- Store keys in plain text files

### Scope Selection

- **Principle of Least Privilege**: Only grant the minimum scopes needed
- **Read vs Write**: Prefer read-only scopes when possible
- **Review Regularly**: Audit your active keys monthly

### Monitoring

- Check usage logs regularly for suspicious activity
- Set up alerts for unusual API call patterns (future feature)
- Revoke unused keys

## Example Use Cases

### ChatGPT Commands (Future)

Once ChatGPT integration is live, you'll be able to use commands like:

```
"Create an invoice for Acme Corp for €1,500 for consulting services"
"Show me all invoices from last month"
"What's the total revenue from project ABC?"
"Create a new customer named John Doe with email john@example.com"
"Generate an estimate for web development - 10 days at my default TJM"
```

### Custom Integrations

Build your own tools that interact with kiik.app:

```python
import requests

API_KEY = "fta_your_token_here"
BASE_URL = "https://api.kiik.app"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Get all customers
response = requests.get(f"{BASE_URL}/api/ai-actions/context/customers/", headers=headers)
customers = response.json()

# Create an invoice
invoice_data = {
    "customer_id": customers[0]["id"],
    "amount": 2500.00,
    "description": "Monthly retainer - January 2025",
    "due_days": 30
}
response = requests.post(f"{BASE_URL}/api/ai-actions/actions/invoices/", headers=headers, json=invoice_data)
invoice = response.json()
print(f"Created invoice #{invoice['invoice_number']}")
```

## Troubleshooting

### API Key Not Working

1. **Check if key is active**: Go to Settings → API & ChatGPT and verify the key is not revoked
2. **Check expiration**: Ensure the key hasn't expired
3. **Check scopes**: Verify the key has the required scopes for the endpoint
4. **Check format**: Ensure you're using `Authorization: Bearer fta_...` header

### 403 Forbidden Error

- Your API key doesn't have the required scope for this action
- Create a new key with the necessary permissions

### 401 Unauthorized Error

- API key is invalid, revoked, or expired
- Create a new key

### Rate Limiting

- Future feature: Keys may be rate-limited to prevent abuse
- Contact support if you need higher limits

## API Reference

For complete API documentation with request/response schemas:

- **Swagger UI**: https://api.kiik.app/api/docs/
- **OpenAPI Schema**: https://api.kiik.app/api/schema/

## Support

- **Documentation**: https://kiik.app/docs
- **GitHub Issues**: https://github.com/yourusername/kiik.app/issues
- **Email**: support@kiik.app

## Changelog

### Version 1.0.0 (November 2025)

- Initial ChatGPT integration release
- OAuth 2.0 authorization with PKCE
- API key management UI
- Scope-based permissions
- Usage logging
- Token revocation

## Future Enhancements

- [ ] ChatGPT app store submission (when available)
- [ ] Webhook support for real-time updates
- [ ] Rate limiting and usage quotas
- [ ] IP whitelisting for additional security
- [ ] Two-factor authentication for sensitive scopes
- [ ] Granular permissions (per-customer, per-project access)
- [ ] OAuth token introspection endpoint
- [ ] Refresh token rotation
- [ ] Custom widget UI for ChatGPT

---

**Ready to get started?** [Create your first API key →](https://app.kiik.app/settings)
