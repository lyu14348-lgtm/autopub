# AutoPub Plugin Matrix

## V1 Active Extensions
| Extension | V1 Core | Paid/Credits Features | V2 Deferred |
|---|---|---|---|
| Visual Saver & AI Analyzer | Scan images, de-duplicate assets, show metadata, single/bulk download | Prompt reverse engineering, AI image generation, product style replacement | Cloud history and team libraries |
| Video Creative Analyzer | Detect public video metadata or accept manual URL, analyze hook/structure/selling points/CTA | More analysis credits, deeper script rewrite | Batch analysis and persistent history |
| SEO Page / Site Audit Analyzer | Scan current page metadata, headings, links, alt text, schema, score issues | AI fixes, report export, history | Multi-page/site audit SaaS |
| Competitor Monitor | Add URL, take lightweight page snapshot, compare title/meta/H1/content/price/CTA changes | AI change summary, more monitored URLs | Scheduled cloud monitoring and alerts |

## V1.1/V2 Reserved Extension Slots
These names are registered in `packages/shared/config.js` → `FUTURE_EXTENSIONS`. The build/lint scripts already scan for them. To activate: move the name to `EXTENSIONS`, create the `apps/<name>/` folder (copy from `apps/_template/`), and uncomment its AI costs in `packages/ai/provider.js`.

| Reserved Extension | Core Capability | AI Task Type | Credits Cost |
|---|---|---|---|
| keyword-research-extension | Extract and cluster keyword opportunities from SERPs | keyword_research | 2 |
| backlink-monitor-extension | Track backlink changes for target domains | backlink_check | 3 |
| content-planner-extension | Bridge to SaaS — plan article topics from site analysis | content_plan | 5 |
| social-analyzer-extension | Analyze social media post performance and creative patterns | social_breakdown | 4 |
| schema-generator-extension | Generate structured data / JSON-LD for pages | schema_gen | 2 |

## How to add a new extension
1. Move extension name from `FUTURE_EXTENSIONS` to `EXTENSIONS` in `packages/shared/config.js`
2. Copy `apps/_template/` → `apps/<extension-name>/`
3. Fill in: `manifest.json` (name, description), `content.js` (message handler), `popup.js` (UI logic), `icon.svg` (brand color)
4. Uncomment the AI task cost in `packages/ai/provider.js`
5. Run `npm run lint && npm run build` — everything should pass
6. Add Chrome Store listing text in `docs/chrome-store/<extension-name>.md`

## Common Extension Requirements
- Manifest V3
- `icons` field referencing `icon.svg` (convert to PNG for store submission)
- Popup with loading, empty, error, and results states (via `showState()` from `core.js`)
- Upgrade entry point (calls `core.openUpgrade()`)
- Session/entitlement refresh support (calls `core.refreshEntitlements()`)
- Credits-aware AI actions (calls `core.runAiTask()`)
- No protected-content scraping or platform bypasses
- No server-only secrets in bundled code
