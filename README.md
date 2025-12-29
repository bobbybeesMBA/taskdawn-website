# Task Dawn Setup Wizard v1.0.0

> A retro-styled SaaS onboarding wizard with 2003 shareware aesthetics

## Overview

This is a single-page application (SPA) that guides users through:
1. **Google OAuth2** - Connecting their Google account for Tasks API access
2. **GitHub Authorization** - Creating a private repository for the automation engine
3. **Secret Deployment** - Securely storing Google credentials as GitHub Secrets

## Files

- `index.html` - Main wizard interface
- `style.css` - 2003 shareware aesthetic styling
- `app.js` - SPA logic with OAuth and GitHub API integration

## Setup Requirements

### Google OAuth2 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Google Tasks API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Configure consent screen if needed
6. Set application type to **Web application**
7. Add your domain to **Authorized redirect URIs** (e.g., `https://taskdawn.com/wizard/`)
8. Copy the **Client ID** and **Client Secret**

### GitHub Personal Access Token

1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens/new)
2. Generate a new token with these scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
3. Copy the token (starts with `ghp_`)

## Production Notes

### Encryption for GitHub Secrets

The wizard uses GitHub's encrypted secrets API. For production deployment, add the libsodium library:

```html
<script src="https://cdn.jsdelivr.net/npm/libsodium-wrappers@0.7.11/dist/modules/libsodium-wrappers.min.js"></script>
```

### Security Considerations

- **Client Secret Exposure**: The current implementation exposes the Google Client Secret in the browser. For production:
  - Use a backend proxy to handle token exchange
  - Or use Google's "Desktop app" OAuth flow
  
- **Token Storage**: Tokens are stored in `sessionStorage` which clears on browser close. This is intentional for security.

- **HTTPS Required**: OAuth2 requires HTTPS in production.

## Deployment

Upload all files to your GitHub Pages repository:

```
taskdawn-website/
├── index.html        (original landing page)
├── style.css
├── wizard/
│   ├── index.html    (this wizard)
│   ├── style.css
│   └── app.js
└── CNAME
```

Then link to the wizard from your main page:
```html
<a href="wizard/">[START SETUP WIZARD]</a>
```

## License

© 2025 Task Dawn Systems

---

*Best viewed in Internet Explorer 6.0 at 1024x768* 😉
