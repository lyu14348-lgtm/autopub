# Chrome Store Draft: Competitor Monitor

## Short Description
Capture lightweight competitor page snapshots and compare visible changes.

## Long Description
AutoPub Competitor Monitor records visible page title, description, H1, pricing text, and CTA text, then compares a later snapshot to highlight changes. It is designed for lightweight manual monitoring in V1.

## Permissions Rationale
- `activeTab`: capture current page snapshot after user action.
- `scripting`: support current-page inspection.
- `storage`: store local snapshots and session state.
- Host permissions: inspect visible page content after user action.

## Screenshot Checklist
- Empty state.
- Snapshot saved.
- Compare no changes.
- Compare changed fields.
- Upgrade entry.

