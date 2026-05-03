# portal/scripts

This is the only valid script directory for the real Zenithy portal deploy repo.

Do not maintain scripts in `D:/apps/gateway-portal/scripts`. That outer folder is not the deploy repo and has been cleaned to avoid confusion.

## Required Read Order

Before editing scripts or using them as project facts, read:

1. `project-index/README.md`
2. `project-index/REPO_MAP.md`
3. `project-index/FILE_CATALOG.md`
4. `D:/apps/gateway-portal/任务记忆文档.md`
5. `D:/apps/gateway-portal/主页维护手册.md`

## Command Entrypoints

Run from `D:/apps/gateway-portal/portal`:

```bash
npm run validate
npm run preflight
npm run check
npm run test:messages
npm run test:security
npm run qa
```

These commands are wired through `portal/package.json` and execute files from this directory.

## Current Scripts

- `validate-content.js`
  - Validates structured content and data files.
- `preflight-check.js`
  - Runs publish-readiness checks across homepage, blog, admin, project data, messages, security, and project index files.
- `test-messages-api.js`
  - Starts a temporary Messages API and verifies create/list/update/delete.
- `test-security-guards.js`
  - Starts a temporary Messages API and verifies lightweight anti-abuse behavior.

## Maintenance Rule

If a script change alters validation rules, source-of-truth boundaries, or project structure assumptions, update `project-index/` in the same change.
