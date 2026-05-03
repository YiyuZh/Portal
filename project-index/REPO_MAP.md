# Repo Map

## Top-Level Layout

```text
portal/
├─ .env.example
├─ .gitignore
├─ Dockerfile
├─ docker-compose.yml
├─ package.json
├─ api/
├─ project-index/
├─ scripts/
├─ security/
└─ site/
```

## Runtime Modules

### Static site

- Directory: `site/`
- Image build: root `Dockerfile`
- Container: `portal-nginx`
- Local server port: `127.0.0.1:18080`

### Messages API

- Directory: `api/`
- Entrypoint: `api/messages_api.py`
- Image build: `api/Dockerfile`
- Container: `portal-messages-api`
- Local server port: `127.0.0.1:18081`
- Data volume: `portal_messages_data`

### Lightweight security

- Directory: `security/`
- Imported by: `api/messages_api.py`
- Purpose: public message rate limiting, duplicate blocking, honeypot blocking, sanitization, admin API rate limiting

### Maintenance scripts

- Directory: `scripts/`
- Entrypoint: `package.json`
- Purpose: validation, preflight, Messages API tests, security tests

## Route Map

### Public pages

- `/` -> `site/index.html`
- `/blog/` -> `site/blog/index.html`
- `/blog/post.html` -> `site/blog/post.html`
- `/blog/posts/<slug>/` -> `site/blog/posts/<slug>/index.html`
- `/404.html` -> `site/404.html`

### Admin pages

- `/blog/admin/index.html` -> article manager
- `/blog/admin/editor.html` -> post editor
- `/blog/admin/projects.html` -> homepage project manager
- `/blog/admin/messages.html` -> messages manager

### API routes

- `GET /api/health`
- `POST /api/messages`
- `GET /api/admin/messages`
- `PATCH /api/admin/messages/:id`
- `DELETE /api/admin/messages/:id`

## Data Flow

### Homepage

- `site/index.html` reads:
  - `site/assets/site-config.json`
  - `site/assets/projects.json`
- Visual/motion helpers:
  - `site/home-visual.css`
  - `site/home-hero.js`
  - `site/home-tilt.js`
  - `site/home-skills.js`
  - `site/home-collab.js`

### Blog

- Public list reads: `site/blog/posts/manifest.json`
- Admin list reads: `site/blog/posts/manifest.json`
- Editor writes export artifacts:
  - article `index.html`
  - updated `manifest.json`

### Projects

- Homepage renders: `site/assets/projects.json`
- Project admin reads and exports: `site/assets/projects.json`

### Messages

- Homepage submits through: `site/home-collab.js`
- API persists to SQLite through: `api/messages_api.py`
- Admin reads API through: `site/blog/admin/messages.html`
- Static fallback/archive: `site/blog/messages/manifest.json`

## Deployment Boundary

Public gateway/Caddy truth belongs to `D:/apps/HireMate`.

This repo owns:

- Portal static site
- Blog frontend/admin
- Project admin
- Messages API
- Lightweight security module
- Validation and preflight scripts

This repo does not own:

- Public Caddy routing
- Public domain reverse proxy
- Shared gateway policy
- Caddy Basic Auth for public admin paths

Those belong to `D:/apps/HireMate`.

## Generated Or Non-Editing Targets

- `api/__pycache__/`
- `security/__pycache__/`

Do not edit generated cache directories.
