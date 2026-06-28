# Release Checklist

| Check | Status |
|---|---|
| Visual extension installable | Zip structure passed; pending manual Chrome load |
| Video extension installable | Zip structure passed; pending manual Chrome load |
| SEO Audit extension installable | Zip structure passed; pending manual Chrome load |
| Competitor Monitor extension installable | Zip structure passed; pending manual Chrome load |
| Extension zips generated | Done in `dist/release` |
| Website pages present | Done |
| Waitlist API present | Done |
| Pricing page present | Done |
| Creem checkout route present | Local mock ready; production pending |
| Creem webhook route present | Local verification ready; production pending |
| Supabase schema documented | Ready |
| P0/P1 local build blockers | `npm run lint`, `npm run test`, `npm run build`, billing tests, webhook tests, and package scripts passed |
| Production payment loop | Deferred for joint deployment |
