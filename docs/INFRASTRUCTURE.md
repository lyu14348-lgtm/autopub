# Infrastructure

## Vercel
Vercel hosts the public website and serverless API routes:

- `/`
- `/pricing.html`
- `/login.html`
- `/saas.html`
- `/api/auth/*`
- `/api/billing/create-checkout`
- `/api/creem/webhook`
- `/api/entitlements`
- `/api/waitlist`

Production deployment requires `APP_BASE_URL`, Supabase variables, Creem variables, and AI provider variables to be set in the Vercel project.

## Supabase
Supabase is the source of truth for users, profiles, subscriptions, payments, credits, waitlist entries, AI tasks, plugin usage logs, and webhook events.

This repository includes the schema plan in `docs/SUPABASE_SETUP.md`. Creating the production project and applying migrations requires user-owned Supabase access.

## Creem
Creem is the required payment provider for V1. Local code supports mock checkout when `MOCK_MODE=true`, but production must use real Creem checkout and webhook events.

## Chrome Extensions
Each extension is independent and uses Manifest V3. Paid actions call server endpoints rather than embedding secrets.

