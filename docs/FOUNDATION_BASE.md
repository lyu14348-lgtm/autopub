# AutoPub Shared Foundation Base

## Purpose
AutoPub V1 uses a shared foundation so the four Chrome extensions and website/API do not each reinvent auth, credits, AI, billing, configuration, and release behavior.

## Server Foundation
| Package | Responsibility |
|---|---|
| `packages/shared/config.js` | Plan limits, extension names, public config, server env guards |
| `packages/auth/session.js` | Anonymous identity, mock user, entitlement shape, server-signed extension/web session token |
| `packages/credits/credits.js` | Credit grants, validation, spending |
| `packages/ai/provider.js` | AI task facade and credit gate |
| `packages/billing/creem.js` | Plan validation, Creem checkout, webhook normalization/signature |
| `packages/db/supabase.js` | Supabase Auth/Profile/Webhook/Payment persistence adapter |
| `packages/analytics/logging.js` | Usage/error log shape |

## Extension Foundation
| File | Responsibility |
|---|---|
| `packages/extension/core.js` | Shared popup runtime: app base URL, active tab lookup, content message bridge, API POST, AI task call, upgrade navigation, status helper |

The build script injects this file into every built extension as `core.js`. Each popup must load `core.js` before `popup.js` and use `window.AutoPubExtension`.

## API Foundation
| Route | Uses Foundation |
|---|---|
| `api/auth/anonymous.js` | `packages/auth/session.js` |
| `api/auth/me.js` | `api/_utils.js`, `packages/auth/session.js`, `packages/db/supabase.js` |
| `api/entitlements.js` | `api/_utils.js`, `packages/auth/session.js` |
| `api/ai/run-task.js` | `api/_utils.js`, `packages/ai/provider.js`, `packages/credits/credits.js` |
| `api/billing/create-checkout.js` | `api/_utils.js`, `packages/billing/creem.js` |
| `api/creem/webhook.js` | `packages/billing/creem.js`, `packages/db/supabase.js` |

## Current Status
Complete for local V1 foundation:

- Shared server modules exist and are used by API routes.
- Shared extension core exists and is injected into all built extensions.
- Lint fails if an extension popup skips `core.js`, skips `window.AutoPubExtension`, or defines app base URL directly.
- AI actions from all extensions go through `/api/ai/run-task`.
- Production mock-user access is blocked when `MOCK_MODE=false`.

Still requires production integration:

- Real Supabase project, RLS, and live verification of the implemented `extension_login_codes` exchange path.
- Real Creem product IDs/API key/webhook secret.
- Real AI provider adapter.
- Production package build with `AUTOPUB_APP_BASE_URL` set to the deployed origin.
