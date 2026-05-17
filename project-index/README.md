# Zenithy Portal Project Index

This folder is the repo-local index for `D:/apps/gateway-portal/portal`.

It is a highest-priority maintenance constraint inside the real deploy repo.

## Rules

1. Before changing code or content, read this index first.
2. After changing code or content, update this index if the repo structure, data flow, route, script, or deployment behavior changed.
3. If this index and `D:/apps/gateway-portal/任务记忆文档.md` disagree, resolve the mismatch before continuing.

## Real Sources Of Truth

- Real deploy repo: `D:/apps/gateway-portal/portal`
- Valid scripts directory: `D:/apps/gateway-portal/portal/scripts`
- Homepage config: `site/assets/site-config.json`
- Homepage projects: `site/assets/projects.json`
- Blog posts manifest: `site/blog/posts/manifest.json`
- Published post HTML: `site/blog/posts/<slug>/index.html`
- Messages API runtime data: SQLite used by `api/messages_api.py`
- Public gateway/Caddy truth: `D:/apps/HireMate`, not this repo
- Content validation is read-only by default; use `npm run fix:content` for explicit JSON normalization

## Mandatory Workflow

Before editing:

1. Read `project-index/README.md`
2. Read `project-index/REPO_MAP.md`
3. Read the relevant section in `project-index/FILE_CATALOG.md`

After editing:

1. Run the relevant checks from `package.json`
2. Update this index when responsibilities or data flow changed
3. Update the outer task memory and maintenance manual when operating procedure changed

## Common Task Routing

- Homepage Hero/nav/footer:
  - `site/index.html`
  - `site/home-hero.js`
  - `site/home-visual.css`
  - `site/assets/site-config.json`
  - `scripts/preflight-check.js`

- Homepage Skills Universe / Showcase:
  - `site/index.html`
  - `site/home-visual.css`
  - `site/home-skills.js`
  - `site/assets/site-config.json`
  - `site/blog/admin/skills.html`
  - `scripts/validate-content.js`
  - `scripts/preflight-check.js`

- Homepage project rail:
  - `site/index.html`
  - `site/home-visual.css`
  - `site/assets/projects.json`
  - `site/blog/admin/projects.html`
  - `scripts/validate-content.js`
  - `scripts/preflight-check.js`

- Blog publishing and editing:
  - `site/blog/admin/editor.html`
  - `site/blog/admin/index.html`
  - `site/blog/index.html`
  - `site/blog/posts/manifest.json`
  - `site/blog/posts/<slug>/index.html`

- Messages and security:
  - `site/home-collab.js`
  - `site/blog/admin/messages.html`
  - `api/messages_api.py`
  - `security/guards.py`
  - `security/PRD.md`
  - `scripts/test-messages-api.js`
  - `scripts/test-security-guards.js`

## Index Files

- `project-index/README.md`: workflow and source-of-truth rules
- `project-index/REPO_MAP.md`: directory, route, and data-flow map
- `project-index/FILE_CATALOG.md`: file-by-file responsibility catalog
