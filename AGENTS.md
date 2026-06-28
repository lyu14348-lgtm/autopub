# AutoPub AGENTS.md

## Project Scope
AutoPub V1 is a Chrome extension matrix project with a lightweight public website, waitlist, account bridge, credits, AI provider facade, and Creem billing flow.

The complete SEO/GEO SaaS is planned for V2. In V1, the SaaS website is only for brand display, Coming Soon, Pricing, Waitlist, Notify Me, FAQ, Blog template, Privacy, Terms, Support, and data structure preparation.

## V1 Required Deliverables
- Visual Saver & AI Analyzer extension
- Video Creative Analyzer extension
- SEO Page / Site Audit Analyzer extension
- Competitor Monitor extension
- Web landing site, Pricing, Waitlist, SaaS Coming Soon, FAQ, Blog template, Privacy, Terms, and Support
- Shared Auth, Credits, AI Provider, Creem Billing, Analytics, and error logging
- Vercel API routes for auth bridge, entitlements, waitlist, checkout, and Creem webhook
- Chrome Store release materials for each extension
- QA, bug, release, and delivery reports

## Non-Negotiable Rules
1. Do not expand V1 into the full SEO/GEO SaaS.
2. Do not change unrelated files.
3. Do not rewrite working code without a clear reason.
4. Each agent must stay within its assigned file scope.
5. Every feature must include loading, empty, and error states where applicable.
6. Every AI action must pass through Credits validation.
7. Creem API keys and webhook secrets must stay on the server only.
8. Webhook signature verification and idempotency are mandatory.
9. Every Chrome extension must use Manifest V3.
10. No remotely hosted executable logic in extensions.
11. No unauthorized private content scraping or platform bypassing.
12. Run lint/test/build and Creem payment tests before reporting completion.

## V1/V2 Boundary
V1 may reserve identifiers such as `user_id`, `project_id`, `site_url`, `audit_task_id`, `report_id`, `credits`, `plugin_source`, and `waitlist_source`.

V1 must not implement a full SEO/GEO SaaS backend, team workspace, large BI dashboard, automated customer site modification, WordPress autopublishing, black-hat SEO, or protected-content scraping.

## Completion Report Required
Each agent must report:
- Files changed
- Feature completed
- Tests run
- Bugs found
- Bugs fixed
- Remaining risks
- Next suggested task

