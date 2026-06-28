# AutoPub Launch And GitHub Handoff

## Current Launch Scope
- Website: deploy `apps/web` through the root build command.
- First plugin: ship `apps/visual-extension`.
- Later plugins: keep video, SEO, competitor, and future plugins in the repo, but release them after the website and visual plugin are stable.

## Production Deploy
1. Create a Vercel project from this repository.
2. Use `npm run build` as the build command.
3. Use `dist/web` as the output directory.
4. Add production environment variables from `.env.example`.
5. Set `MOCK_MODE=false`.
6. Set `APP_BASE_URL=https://your-production-domain`.
7. Set `AUTOPUB_APP_BASE_URL=https://your-production-domain` before packaging the Chrome extension.
8. Add Supabase, Creem, and Alibaba Cloud API keys in Vercel project settings.

## Visual Extension Release Build
Run this after production `APP_BASE_URL` is known:

```powershell
$env:AUTOPUB_APP_BASE_URL="https://your-production-domain"
$env:APP_BASE_URL="https://your-production-domain"
$env:MOCK_MODE="false"
npm run package:visual
```

The Chrome upload zip will be created at:

```text
dist/release/visual-extension.zip
```

## GitHub Setup
The `.env` file must never be committed. Use `.env.example` as the template.

If this folder is not currently a valid Git repo, initialize it:

```powershell
git init
git add .
git commit -m "Initial AutoPub launch baseline"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPO.git
git push -u origin main
```

## New Computer Setup
```powershell
git clone https://github.com/YOUR_NAME/YOUR_REPO.git
cd YOUR_REPO
copy .env.example .env
npm run build
npm run test
npm run dev:web
```

Then fill `.env` with real local values and load `dist/visual-extension` in Chrome for plugin QA.

## Pre-Push Checklist
- Run `npm run build`.
- Run `npm run test`.
- Confirm `.env` is not tracked.
- Confirm `dist/` is not tracked.
- Confirm visual extension version in `apps/visual-extension/manifest.json`.
