# AutoPub Technical Architecture

## Runtime Shape
- `apps/web`: static website pages that can be served locally or deployed through Vercel.
- `apps/*-extension`: four Manifest V3 Chrome extensions.
- `api`: Vercel-compatible serverless function routes.
- `packages`: shared server and extension-safe modules.
- `scripts`: local validation, build, packaging, and test commands.

## Data Flow
1. Anonymous users can use free extension capabilities.
2. Paid or AI actions check local session and call server entitlement/credit APIs.
3. Upgrade opens the web login/pricing flow.
4. Logged-in users create checkout sessions through `POST /api/billing/create-checkout`.
5. Creem calls `POST /api/creem/webhook`.
6. Server verifies signature, deduplicates event IDs, records payment/subscription state, and updates credits.
7. Extensions refresh `GET /api/entitlements` or `GET /api/auth/me` and unlock Pro or Pro Plus features.

## Security Boundaries
- Public browser variables may include `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Server-only variables include `SUPABASE_SERVICE_ROLE_KEY`, `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, and `AI_PROVIDER_API_KEY`.
- Extension code must never bundle server-only secrets.
- Webhook processing must be idempotent and signature-verified.

