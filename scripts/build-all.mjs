import fs from "node:fs";
import path from "node:path";
import { EXTENSIONS } from "../packages/shared/config.js";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();
const root = process.cwd();
const target = process.argv[2];
const dist = path.join(root, "dist");
const extensionCore = path.join(root, "packages", "extension", "core.js");

function injectAppBaseUrl(file) {
  const appBaseUrl = process.env.AUTOPUB_APP_BASE_URL || process.env.APP_BASE_URL || "http://localhost:4173";
  const text = fs.readFileSync(file, "utf8").replaceAll("__AUTOPUB_APP_BASE_URL__", appBaseUrl);
  fs.writeFileSync(file, text);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else {
      fs.copyFileSync(from, to);
      if (entry.name.endsWith(".js")) injectAppBaseUrl(to);
    }
  }
}

function buildExtension(name) {
  const src = path.join(root, "apps", name);
  const dest = path.join(dist, name);
  if (!fs.existsSync(src)) throw new Error(`Unknown extension: ${name}`);
  fs.rmSync(dest, { recursive: true, force: true });
  copyDir(src, dest);
  const coreDest = path.join(dest, "core.js");
  fs.copyFileSync(extensionCore, coreDest);
  injectAppBaseUrl(coreDest);
  console.log(`built ${name}`);
}

fs.mkdirSync(dist, { recursive: true });

if (target) {
  buildExtension(target);
} else {
  fs.rmSync(path.join(dist, "web"), { recursive: true, force: true });
  copyDir(path.join(root, "apps", "web"), path.join(dist, "web"));
  for (const extension of EXTENSIONS) { if (extension.startsWith('_')) continue; buildExtension(extension); }
  console.log("build ok");
}
