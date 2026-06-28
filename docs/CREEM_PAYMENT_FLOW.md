# Creem Payment Flow

## Required Flow
1. User clicks Upgrade in extension.
2. If unauthenticated, extension opens the website login page.
3. Logged-in user lands on Pricing.
4. User chooses Pro or Pro Plus for V1 plugin features only.
5. `POST /api/billing/create-checkout` validates login and requested plan.
6. Server creates a Creem checkout session and passes user metadata.
7. User completes payment.
8. Creem calls `POST /api/creem/webhook`.
9. Server verifies signature and event idempotency.
10. Server updates subscriptions, payments, credit logs, and profile plan.
11. Extension refreshes `/api/entitlements` and unlocks features.

## Local Placeholder
When `MOCK_MODE=true`, checkout returns a mock URL so the UI flow can be tested without live credentials. Production must use real Creem API credentials, `CREEM_PRO_PRODUCT_ID`, and `CREEM_PRO_PLUS_PRODUCT_ID`.

## Webhook Requirements
- Verify `CREEM_WEBHOOK_SECRET`.
- Store event IDs in `webhook_events`.
- Ignore duplicate event IDs.
- Handle success, failure, refund, and cancellation without leaving stale paid entitlements.
- In production, reject missing or invalid signatures instead of falling back to local defaults.
