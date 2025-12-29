# Task Dawn v1.0.0 Alpha

> "Ignite your day with prioritized tasks in your inbox."

A retro-styled task management landing page and setup wizard with authentic 2003 shareware aesthetics.

## Project Structure

```
taskdawn.com/
├── index.html          ← Landing page (root)
├── style.css           ← Landing page styles
├── CNAME               ← Custom domain config
├── README.md           ← This file
└── wizard/
    ├── index.html      ← Setup wizard SPA
    ├── wizard-style.css ← Wizard styles
    └── wizard-app.js   ← OAuth & GitHub API logic
```

## Pages

### Landing Page (`/`)
- Product overview and features
- "No-App Manifesto" philosophy
- Roadmap and guestbook
- **CTA button** → links to `/wizard/`

### Setup Wizard (`/wizard/`)
- 3-step onboarding flow
- Google OAuth2 authentication
- GitHub repo creation via API
- Secret deployment to GitHub

## Deployment

Already configured for GitHub Pages with custom domain `taskdawn.com`.

Just push to GitHub and ensure Pages is enabled in Settings.

## OAuth Redirect URI

**IMPORTANT:** Update your Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Edit your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add:
   ```
   https://taskdawn.com/wizard/index.html
   ```
6. Save changes

## License

© 2025 Task Dawn Systems

---

*Best viewed in Internet Explorer 6.0 at 1024x768* 😉
