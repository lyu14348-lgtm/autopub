# Auth QA Report

## Current Status
Local auth routes are present. Email login/register and extension code exchange have production code paths, while production Supabase, RLS, Google OAuth setup, and redirect URLs still require project credentials and live verification.

Production API routes now reject mock user access when `MOCK_MODE=false`; authenticated routes accept either a valid Supabase bearer token or an AutoPub server-signed `aps_` token issued by the extension code exchange.

## P0 Cases To Execute With User
- Email signup succeeds.
- Email login succeeds.
- Google login succeeds.
- Extension login bridge succeeds.
- Logout removes paid permissions.
- Extension refresh reads `user_id`, `plan`, and `credits_balance`.
- Vercel Production env vars are complete.
