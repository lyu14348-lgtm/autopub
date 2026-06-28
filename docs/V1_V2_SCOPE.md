# AutoPub V1/V2 Scope

## V1 Must Ship
- Four Chrome extensions: Visual, Video, SEO Audit, and Competitor Monitor
- Free, Pro, Pro Plus, Credits, and Upgrade entry points in each extension
- Anonymous usage for free capabilities
- Login bridge from extension to website
- Pricing page that creates a server-side checkout request
- Creem webhook route with signature verification and idempotency hooks
- Entitlements endpoint that returns plan, credits, limits, and feature flags
- Waitlist and Notify Me collection
- Website pages required for launch and compliance
- Release, QA, and bug reports

## V1 Must Not Ship
- Full SEO/GEO SaaS application dashboard
- Automated crawling at scale
- Automated customer website source-code modification
- WordPress autopublishing
- Team or enterprise multi-tenant workspace
- Large BI analytics dashboard
- Private/protected-content scraping
- Video download bypasses or platform restriction bypasses
- Black-hat SEO automation

## V2 Reserved Concepts
V2 is a separate SaaS product. V1 Pro and Pro Plus plugin subscriptions do not include the final automated SEO/GEO hosted website, implementation, and publishing system.

V1 reserves data and API naming for:

- `project_id`
- `site_url`
- `audit_task_id`
- `report_id`
- `plugin_source`
- `waitlist_source`
- `credits`
- `user_id`

These identifiers should remain lightweight in V1 and not grow into complete SaaS workflows.
