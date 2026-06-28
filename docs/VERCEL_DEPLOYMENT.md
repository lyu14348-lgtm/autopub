# Vercel Deployment

## Production Checklist
- Connect the repository to Vercel.
- Configure production domain.
- Add all variables from `.env.example`.
- Set `MOCK_MODE=false` for production.
- Confirm `/api/creem/webhook` is HTTPS and reachable.
- Redeploy after changing Supabase, Creem, or AI secrets.

## Local Commands
- `npm run dev:web` serves the static website.
- `npm run dev:api` starts a small local API server for the implemented route modules.
- `npm run build` validates and copies distributable files into `dist`.
- Use `AUTOPUB_APP_BASE_URL=https://your-production-domain` and `MOCK_MODE=false` before packaging production extension zips.

## Preview vs Production
Use Preview for UI and mock checkout smoke tests. Use Production for Chrome Store release and real Creem payment testing.
