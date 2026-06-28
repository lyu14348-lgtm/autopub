# Environment Variables

| Variable | Public | Required For | Notes |
|---|---:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Web and extension auth | Public project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Web and extension auth | Must rely on RLS and server-side authorization. |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server API routes | Never expose to frontend or extension bundles. |
| `AUTH_SESSION_SECRET` | No | Server-signed web/extension sessions | Long random value. Never expose to frontend or extension bundles. |
| `CREEM_API_KEY` | No | Checkout creation and Creem API calls | Server only. |
| `CREEM_WEBHOOK_SECRET` | No | Webhook signature verification | Server only. |
| `CREEM_API_BASE_URL` | No | Creem API base URL | Use `https://test-api.creem.io/v1` for test mode and `https://api.creem.io/v1` for production. |
| `CREEM_PRO_PRODUCT_ID` | No | Pro checkout | Creem product ID for Pro. |
| `CREEM_PRO_PLUS_PRODUCT_ID` | No | Pro Plus checkout | Creem product ID for Pro Plus. |
| `APP_BASE_URL` | Conditional | Redirect and return URLs | Production site origin. |
| `AUTOPUB_APP_BASE_URL` | Build-time | Extension build/package | Website origin embedded into built extension popups. Defaults to `APP_BASE_URL` or local dev URL. |
| `EXTENSION_ALLOWED_ORIGINS` | No | Extension origin allowlist | Comma-separated extension origins/IDs. |
| `AI_PROVIDER_API_KEY` | No | AI provider | Server only. |
| `MOCK_MODE` | No | Local development | `true` allows local placeholder flows without live third-party credentials. |
