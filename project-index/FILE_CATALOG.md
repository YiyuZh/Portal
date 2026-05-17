# File Catalog

This catalog describes the current files in `D:/apps/gateway-portal/portal`.

## Root Files

### `.env.example`

- Documents runtime env for `messages-api`
- Includes Messages API trust, CORS, and security limits

### `.gitignore`

- Ignores Python caches and local `.env`

### `Dockerfile`

- Builds the static nginx portal image
- Copies `site/` into `/usr/share/nginx/html`

### `docker-compose.yml`

- Runs `portal` and `messages-api`
- Connects both to external `shared_gateway`
- Persists messages data in `portal_messages_data`

### `package.json`

- Defines all repo-local checks:
  - `validate`
  - `preflight`
  - `check`
  - `test:messages`
  - `test:security`
  - `qa`

## API

### `api/Dockerfile`

- Builds the Python Messages API image
- Copies `api/messages_api.py` and `security/`

### `api/messages_api.py`

- Threaded HTTP API for collab messages
- Owns SQLite schema and CRUD handlers
- Calls `security.guards.LightweightSecurity`
- Endpoints:
  - `GET /api/health`
  - `POST /api/messages`
  - `GET /api/admin/messages`
  - `PATCH /api/admin/messages/:id`
  - `DELETE /api/admin/messages/:id`

## Security

### `security/PRD.md`

- Product requirement document for lightweight protection
- Defines scope, non-goals, limits, and acceptance criteria

### `security/README.md`

- Operator/developer explanation for the security module

### `security/guards.py`

- Implements:
  - sliding window limiters
  - duplicate fingerprint guard
  - honeypot checks
  - HTML/control character cleanup
  - public/admin request protection

## Scripts

### `scripts/README.md`

- Declares `portal/scripts` as the only valid script source
- Points maintainers to this project index

### `scripts/validate-content.js`

- Validates structured content:
  - `site/assets/projects.json`
  - `site/assets/site-config.json`
  - `site/blog/posts/manifest.json`
  - `site/blog/messages/manifest.json`
  - security module files

### `scripts/preflight-check.js`

- Validates publish readiness:
  - required files
  - homepage structure
  - favicon/logo consistency
  - ICP filing link
  - Hero/Skills/Projects/Collab hooks
  - blog/admin/editor/projects/messages pages
  - messages API files
  - project index presence
  - cross-repo Caddy hints

### `scripts/test-messages-api.js`

- Starts a temporary Messages API and tests create/list/update/delete

### `scripts/test-security-guards.js`

- Starts a temporary Messages API and tests rate limits, sanitization, duplicate blocking, honeypot, and admin rate limiting

## Site Root

### `site/index.html`

- Homepage shell
- Reads `assets/site-config.json` and `assets/projects.json`
- Contains controlled scroll, active nav, section reveal, project rendering, project rail, Skills Universe, Skills Showcase, footer filing binding

### `site/home-visual.css`

- Main homepage visual system
- Covers Hero, project rail, Skills Universe, Skills Showcase, Collab, footer, responsive behavior

### `site/home-hero.js`

- Hero interaction model
- Uses window pointer tracking, tilt CSS vars, orb movement, and reveal mask coordinates

### `site/home-tilt.js`

- Project card 3D tilt behavior

### `site/home-skills.js`

- Skills section activation, metric count-up, spider-web mounting, node tooltip, and `data-skill-card` tilt

### `site/home-collab.js`

- Collab form frontend logic
- Submits to `/api/messages`
- Downloads fallback JSON if API submission fails

### `site/favicon.svg`

- Brand icon source of truth

### `site/apple-touch-icon.png`

- Apple touch icon

### `site/404.html`

- Static 404 page with filing link

### `site/robots.txt`

- Crawler rules and sitemap pointer

### `site/sitemap.xml`

- Static sitemap

### `site/site.webmanifest`

- Active web manifest used by homepage and blog

### `site/manifest.json`

- Legacy JSON artifact
- Do not confuse with `site.webmanifest` or blog post manifest

### `site/styles.css`

- Legacy stylesheet
- Current homepage styling primarily uses `home-visual.css`

## Assets

### `site/assets/site-config.json`

- Homepage content source of truth
- Owns Hero, nav, sections, contact, footer, and ICP filing config
- `sections.skills.showcase` owns the common Skills Showcase cards below the spider web

### `site/assets/projects.json`

- Homepage projects source of truth
- Used by homepage rail and project admin

### `site/assets/hiremate-dashboard.jpg`

- HireMate project image

### `site/assets/ai-interview-portrait.jpg`

- AI-Interview project image

### `site/assets/photo.png`

- Photograph/智摄 project image

## Blog Frontend

### `site/blog/index.html`

- Blog homepage
- Reads `./posts/manifest.json`
- Handles post cards, tags, filters, and pagination

### `site/blog/post.html`

- Article template / single post shell

## Blog Admin

### `site/blog/admin/admin.css`

- Shared admin shell style source
- Covers sidebar, nav, cards, buttons, footer

### `site/blog/admin/index.html`

- Article manager
- Reads `../posts/manifest.json`
- Edit links route to `editor.html?slug=<slug>`
- Delete action exports updated manifest

### `site/blog/admin/editor.html`

- New/edit article editor
- Loads existing posts by slug
- Supports preview, body images, layout selection, generated article HTML, and manifest export

### `site/blog/admin/projects.html`

- Homepage project manager
- Reads `/assets/projects.json`
- Supports edit, preview, validation, drag sort, and JSON export

### `site/blog/admin/skills.html`

- Homepage Skills Showcase manager
- Reads `/assets/site-config.json`
- Edits `sections.skills.title`, `sections.skills.description`, and `sections.skills.showcase`
- Supports card preview, validation, auto-fix, drag sort, and replacement `site-config.json` export
- Must not edit the Skills Universe spider-web technology nodes

### `site/blog/admin/messages.html`

- Messages manager
- Reads/writes via `/api/admin/messages`
- Supports filters, status update, and delete

## Blog Data

### `site/blog/posts/manifest.json`

- Blog post manifest source of truth

### `site/blog/posts/new-post/index.html`

- Current generated post example/file
- Must stay compatible with editor output

### `site/blog/messages/manifest.json`

- Static messages placeholder/archive
- Live messages use SQLite through API

## High-Risk Files

These files affect multiple surfaces and should be edited carefully:

- `site/index.html`
- `site/home-visual.css`
- `site/home-hero.js`
- `site/blog/admin/editor.html`
- `scripts/preflight-check.js`
- `scripts/validate-content.js`
- `api/messages_api.py`
- `security/guards.py`

## Common Confusions

- `site/site.webmanifest` is the active web manifest
- `site/manifest.json` is legacy
- `site/blog/posts/manifest.json` is the blog post data source
- `site/blog/messages/manifest.json` is not the live messages database
- Public gateway config belongs to `D:/apps/HireMate`, not this repo
