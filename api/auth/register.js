import { createMockUser, getEntitlements } from "../../packages/auth/session.js";
import { isMockMode, signUpWithPassword } from "../../packages/db/supabase.js";
import { checkRateLimit, method, readJson, sendJson } from "../_utils.js";

export default async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  try {
    const rate = checkRateLimit(req, "auth_register", { limit: 5, windowMs: 60_000 });
    if (!rate.ok) {
      sendJson(res, 429, { error: `Too many registration attempts. Try again in ${rate.retryAfterSeconds} seconds.` });
      return;
    }
    const body = await readJson(req);
    if (!body.email || !body.password) {
      sendJson(res, 400, { error: "Email and password are required." });
      return;
    }
    if ((body.password || "").length < 8) {
      sendJson(res, 400, { error: "Password must be at least 8 characters." });
      return;
    }
    if (isMockMode()) {
      const user = createMockUser("free");
      sendJson(res, 200, {
        token: "local-web-session-token",
        user,
        entitlements: getEntitlements(user)
      });
      return;
    }
    const session = await signUpWithPassword({
      email: body.email,
      password: body.password,
      name: body.name || ""
    });
    const authUser = session.user;
    const user = {
      user_id: authUser.id,
      email: authUser.email || body.email,
      plan: "free",
      credits_balance: 3
    };
    sendJson(res, 200, {
      token: session.access_token || "",
      refresh_token: session.refresh_token || "",
      user,
      entitlements: getEntitlements(user),
      email_confirmation_required: !session.access_token
    });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}
