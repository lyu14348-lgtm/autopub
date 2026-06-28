import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { EXTENSIONS } from "../packages/shared/config.js";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();
const root = process.cwd();
const name = process.argv[2];
if (!EXTENSIONS.includes(name)) {
  console.error(`Usage: node scripts/package-extension.mjs ${EXTENSIONS.join("|")}`);
  process.exit(1);
}

const source = path.join(root, "dist", name);
const appBaseUrl = process.env.AUTOPUB_APP_BASE_URL || process.env.APP_BASE_URL || "";
const allowLocalRelease = process.env.AUTOPUB_ALLOW_LOCAL_RELEASE === "true";

if (!allowLocalRelease && (!appBaseUrl || /localhost|127\.0\.0\.1/.test(appBaseUrl))) {
  console.error("Refusing to package a Chrome Store build without a production AUTOPUB_APP_BASE_URL or APP_BASE_URL.");
  console.error("For local-only QA, set AUTOPUB_ALLOW_LOCAL_RELEASE=true.");
  process.exit(1);
}

if (!allowLocalRelease && process.env.MOCK_MODE !== "false") {
  console.error("Refusing to package a Chrome Store build unless MOCK_MODE=false is set.");
  console.error("For local-only QA, set AUTOPUB_ALLOW_LOCAL_RELEASE=true.");
  process.exit(1);
}

const build = spawnSync(process.execPath, [path.join(root, "scripts", "build-all.mjs"), name], { stdio: "inherit" });
if ((build.status ?? 1) !== 0) process.exit(build.status ?? 1);

const releaseDir = path.join(root, "dist", "release");
fs.mkdirSync(releaseDir, { recursive: true });
const zipPath = path.join(releaseDir, `${name}.zip`);
fs.rmSync(zipPath, { force: true });

if (process.platform === "win32") {
  const ps = spawnSync("powershell", [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${source}\\*' -DestinationPath '${zipPath}' -Force`
  ], { stdio: "inherit" });
  process.exit(ps.status ?? 1);
}

const zip = spawnSync("zip", ["-r", zipPath, "."], { cwd: source, stdio: "inherit" });
process.exit(zip.status ?? 1);
