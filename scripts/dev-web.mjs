import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import anonymous from "../api/auth/anonymous.js";
import login from "../api/auth/login.js";
import me from "../api/auth/me.js";
import register from "../api/auth/register.js";
import exchange from "../api/auth/exchange-extension-code.js";
import logout from "../api/auth/logout.js";
import checkout from "../api/billing/create-checkout.js";
import webhook from "../api/creem/webhook.js";
import entitlements from "../api/entitlements.js";
import waitlist from "../api/waitlist.js";
import aiRunTask from "../api/ai/run-task.js";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();
process.env.MOCK_MODE ??= "true";
process.env.AUTH_SESSION_SECRET ??= "local-dev-auth-session-secret";

const root = path.join(process.cwd(), "apps", "web");
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
const apiRoutes = new Map([
  ["/api/auth/anonymous", anonymous],
  ["/api/auth/login", login],
  ["/api/auth/me", me],
  ["/api/auth/register", register],
  ["/api/auth/exchange-extension-code", exchange],
  ["/api/auth/logout", logout],
  ["/api/billing/create-checkout", checkout],
  ["/api/creem/webhook", webhook],
  ["/api/entitlements", entitlements],
  ["/api/waitlist", waitlist],
  ["/api/ai/run-task", aiRunTask]
]);

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const apiHandler = apiRoutes.get(url.pathname);
  if (apiHandler) {
    apiHandler(req, res).catch((error) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    });
    return;
  }
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = path.normalize(path.join(root, pathname));
  if (!file.startsWith(root) || !fs.existsSync(file)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`web listening on http://localhost:${port}`);
});
