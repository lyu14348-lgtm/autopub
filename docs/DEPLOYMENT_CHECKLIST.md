# Deployment Checklist — AutoPub V1

## Pre-flight (local)
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] All 4 extension zips present in `dist/release/`
- [ ] All website pages accessible at `http://localhost:4173`
- [ ] AI task endpoint returns real results with `AI_PROVIDER_API_KEY` set

## 1. Supabase — Database + Auth

- [ ] Create Supabase project at https://supabase.com
- [ ] Run the DDL from `docs/SUPABASE_SETUP.md` in the SQL Editor (9 tables)
- [ ] Enable Auth providers: Email/Password + Google OAuth
- [ ] Configure Google OAuth: Client ID, Client Secret, redirect URLs
- [ ] Set up Row-Level Security (RLS) policies per `docs/SUPABASE_SETUP.md`
- [ ] Copy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Copy `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose)
- [ ] Generate and copy `AUTH_SESSION_SECRET` (server-only, long random value)
- [ ] Verify: create a test user, confirm profile row appears in `profiles` table

## 2. Creem — Payment Provider

- [ ] Create Creem account at https://creem.io
- [ ] Create two products: Pro ($19/mo) and Pro Plus ($49/mo)
- [ ] Copy `CREEM_API_KEY`
- [ ] Copy `CREEM_WEBHOOK_SECRET`
- [ ] Copy `CREEM_PRO_PRODUCT_ID` and `CREEM_PRO_PLUS_PRODUCT_ID`
- [ ] In Creem dashboard, register webhook endpoint: `https://your-domain.com/api/creem/webhook`
- [ ] Test: create a checkout in Creem test mode, confirm webhook fires and updates Supabase
- [ ] Switch `CREEM_API_BASE_URL` from `https://test-api.creem.io/v1` to `https://api.creem.io/v1` for production

## 3. AI Provider

- [ ] Get an 阿里云百炼 API Key → https://bailian.console.aliyun.com → 模型广场 → API-KEY 管理
- [ ] Copy `AI_PROVIDER_API_KEY`
- [ ] (Optional) Set `AI_PROVIDER_BASE_URL` if using a different provider (Anthropic, Azure, etc.)
- [ ] (Optional) Set `AI_PROVIDER_MODEL` (default: `qwen-plus`, alternatives: `qwen-max`, `qwen-turbo`, `qwen-plus-latest`)
- [ ] Verify: call `POST /api/ai/run-task` and confirm real AI response

## 4. Vercel — Hosting

- [ ] Connect this repository to Vercel
- [ ] Configure production domain (e.g., `autopub.io` or `app.autopub.io`)
- [ ] Add all environment variables from `.env.example` to Vercel project settings
- [ ] Set `MOCK_MODE=false` for production
- [ ] Set `APP_BASE_URL=https://your-production-domain`
- [ ] Deploy and verify all pages load
- [ ] Verify `POST /api/creem/webhook` is reachable at the production URL
- [ ] Set up Preview environment for staging tests

## 5. Chrome Extensions — Production Build

- [ ] Convert `icon.svg` to PNG (16x16, 48x48, 128x128) for each extension
- [ ] Set production build env vars: `$env:AUTOPUB_APP_BASE_URL="https://your-domain"; $env:MOCK_MODE="false"`
- [ ] Run `npm run build` and `npm run package:visual` (repeat for all 4)
- [ ] Verify each zip at `dist/release/` contains the correct production `APP_BASE_URL`
- [ ] Prepare Chrome Web Store screenshots (1280x800 or 640x400 PNG):
  - Popup in action (one per extension)
  - Results / report view
  - Upgrade prompt
- [ ] Submit each extension at https://chrome.google.com/webstore/devconsole
- [ ] Include store listing text from `docs/chrome-store/<name>.md`

## 6. Environment Variables — Production

| Variable | Value | Where |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Vercel (secret) |
| `AUTH_SESSION_SECRET` | long random string | Vercel (secret) |
| `CREEM_API_KEY` | `creem_...` | Vercel (secret) |
| `CREEM_WEBHOOK_SECRET` | `whsec_...` | Vercel (secret) |
| `CREEM_API_BASE_URL` | `https://api.creem.io/v1` | Vercel |
| `CREEM_PRO_PRODUCT_ID` | `prod_...` | Vercel |
| `CREEM_PRO_PLUS_PRODUCT_ID` | `prod_...` | Vercel |
| `APP_BASE_URL` | `https://your-domain` | Vercel |
| `AI_PROVIDER_API_KEY` | `sk-...` | Vercel (secret) |
| `AI_PROVIDER_MODEL` | `qwen-plus` | Vercel |
| `MOCK_MODE` | `false` | Vercel |

Build-time env (not in Vercel):
| Variable | Value |
|---|---|
| `AUTOPUB_APP_BASE_URL` | `https://your-domain` |
| `MOCK_MODE` | `false` |

## 7. Pre-Launch Smoke Tests

- [ ] Anonymous user can install and use free features
- [ ] User can register via email
- [ ] User can register via Google
- [ ] Free user receives 3 daily credits
- [ ] AI task deducts credits correctly
- [ ] User can upgrade to Pro via Creem checkout
- [ ] Creem webhook fires and updates subscription in Supabase
- [ ] Extension recognizes Pro entitlement after payment
- [ ] User can cancel subscription
- [ ] Extension login bridge works (code exchange flow)
- [ ] Logout clears extension session
- [ ] All website pages render correctly on desktop + mobile
- [ ] Pricing page checkout flow works end-to-end
