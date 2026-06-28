import fs from "node:fs";
import path from "node:path";
import { EXTENSIONS, FUTURE_EXTENSIONS } from "../packages/shared/config.js";

const root = process.cwd();
const errors = [];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
    return null;
  }
}

function assertFile(file) {
  if (!fs.existsSync(file)) errors.push(`Missing file: ${file}`);
}

function scanForbiddenSecrets(dir) {
  const serverOnly = ["SUPABASE_SERVICE_ROLE_KEY", "AUTH_SESSION_SECRET", "CREEM_API_KEY", "CREEM_WEBHOOK_SECRET", "AI_PROVIDER_API_KEY"];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanForbiddenSecrets(full);
      continue;
    }
    if (!/\.(js|html|json)$/.test(entry.name)) continue;
    const text = fs.readFileSync(full, "utf8");
    for (const secretName of serverOnly) {
      if (text.includes(secretName)) {
        errors.push(`Extension bundle references server-only secret ${secretName}: ${full}`);
      }
    }
  }
}

assertFile(path.join(root, "AGENTS.md"));
assertFile(path.join(root, "docs", "V1_V2_SCOPE.md"));
assertFile(path.join(root, "docs", "CREEM_PAYMENT_FLOW.md"));
assertFile(path.join(root, "api", "creem", "webhook.js"));
assertFile(path.join(root, "packages", "extension", "core.js"));

const ALL_KNOWN = [...EXTENSIONS, ...FUTURE_EXTENSIONS]; for (const extension of ALL_KNOWN) {
  const dir = path.join(root, "apps", extension); if (!fs.existsSync(dir)) { if (EXTENSIONS.includes(extension)) { errors.push("Missing active extension folder: " + dir); } continue; }
  const manifest = readJson(path.join(dir, "manifest.json"));
  assertFile(path.join(dir, "popup.html"));
  assertFile(path.join(dir, "popup.js"));
  assertFile(path.join(dir, "background.js"));
  const popupHtml = fs.readFileSync(path.join(dir, "popup.html"), "utf8");
  if (!popupHtml.includes('src="core.js"')) errors.push(`${extension}: popup must load shared core.js`);
  const popupJs = fs.readFileSync(path.join(dir, "popup.js"), "utf8");
  if (!popupJs.includes("window.AutoPubExtension")) errors.push(`${extension}: popup must use shared AutoPubExtension core`);
  if (popupJs.includes("__AUTOPUB_APP_BASE_URL__")) errors.push(`${extension}: popup should not define app base URL directly`);
  if (!manifest) continue;
  if (manifest.manifest_version !== 3) errors.push(`${extension}: manifest_version must be 3`);
  if (!manifest.action?.default_popup) errors.push(`${extension}: missing action.default_popup`);
  if (!manifest.background?.service_worker) errors.push(`${extension}: missing background service worker`);
  scanForbiddenSecrets(dir);
}

const webPages = ["index.html", "pricing.html", "login.html", "saas.html", "faq.html", "blog.html", "plugin-blog.html", "saas-blog.html", "privacy.html", "terms.html", "support.html", "test-page.html"];
for (const page of webPages) assertFile(path.join(root, "apps", "web", page));

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("lint ok");
