# InnerLink Frontend

InnerLink Frontend is a static HTML/CSS/JavaScript client for the InnerLink application.
It contains the authentication screen, home page, profile page, reflections page, chat views, share page, and admin dashboard.

## Overview

This frontend talks to the backend API at `http://localhost:8888/api` and stores the session token and user data in `localStorage`.

Main pages in this folder:

- `index.html`
- `home.html`
- `profile.html`
- `reflections.html`
- `chat.html`
- `unified_chat.html`
- `share.html`
- `admin_dashboard.html`

## Folder Structure

- `css/` contains the page stylesheets.
- `js/` contains the page logic and API helpers.
- `images/` contains static image assets.

## Key JavaScript Files

- `js/api.js` wraps backend requests and exposes helper functions.
- `js/index.js` handles sign in and sign up flows.
- `js/main.js` handles shared login/home behavior.
- `js/home.js`, `js/profile.js`, `js/reflections.js`, `js/share.js`, `js/chat.js`, `js/unified_chat.js`, and `js/admin_dashboard.js` power the page-specific UI.



## Run

Because this frontend is static, you should open it through a local web server instead of loading the HTML files directly from disk.

Simple options:

- VS Code Live Server
- Python static server
- Any local HTTP server

Example with Python:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500` and navigate to `index.html`.

## Notes

- Google Fonts are loaded from the CDN on the login page.
- The login page redirects authenticated users based on their stored role.
- The frontend expects the backend API to be running before you use any page that calls the server.
