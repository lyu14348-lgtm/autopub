# QA Report

## Automated Local Checks
Executed after Node.js LTS was installed:

```bash
npm run lint
npm run test
npm run build
npm run test:billing
npm run test:creem-webhook
```

Result: all passed.

Additional code checks:

- `node --check` across source JS/MJS files: passed.
- Production mock-user blocking check with `MOCK_MODE=false`: passed.
- Zip inspection with `Expand-Archive`: all extension zips contain `manifest.json`.
- Extension build-time app URL injection: passed; `AUTOPUB_APP_BASE_URL` can replace the local default for production packaging.

Packaging scripts executed:

```bash
npm run package:visual
npm run package:video
npm run package:seo
npm run package:competitor
```

Result: all passed and generated zips in `dist/release`.

HTTP smoke tests against `http://localhost:4173`:

- `GET /`: 200
- `POST /api/waitlist`: 200
- `POST /api/billing/create-checkout`: 200 in local mock mode
- `GET /api/entitlements`: 200 in local mock mode
- `POST /api/ai/run-task`: 200 in local mock mode

## Manual Checks
- Load each extension folder in Chrome extension developer mode.
- Open each popup and confirm empty/loading/error states.
- Click Upgrade and confirm it opens website pricing/login.
- Submit Waitlist locally.
- Confirm static website pages are reachable.
- In production, execute Creem success, failure, cancel, and duplicate webhook tests.
