import http from "node:http";
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

const port = Number(process.env.API_PORT || 4174);
const routes = new Map([
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
  const handler = routes.get(url.pathname);
  if (!handler) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }
  handler(req, res).catch((error) => {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  });
}).listen(port, () => {
  console.log(`api listening on http://localhost:${port}`);
});
