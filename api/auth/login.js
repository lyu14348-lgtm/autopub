import { createMockUser, getEntitlements } from "../../packages/auth/session.js";
import { getProfileByUserId, isMockMode, signInWithPassword, upsertProfile } from "../../packages/db/supabase.js";
import { checkRateLimit, method, readJson, sendJson } from "../_utils.js";

export default async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  try {
    const rate = checkRateLimit(req, "auth_login", { limit: 10, windowMs: 60_000 });
    if (!rate.ok) {
      sendJson(res, 429, { error: `Too many login attempts. Try again in ${rate.retryAfterSeconds} seconds.` });
      return;
    }
    const body = await readJson(req);
    if (!body.email || !body.password) {
      sendJson(res, 400, { error: "Email and password are required." });
      return;
    }
    if (isMockMode()) {
      const user = createMockUser(body.plan || "free");
      sendJson(res, 200, {
        token: "local-web-session-token",
        user,
        entitlements: getEntitlements(user)
      });
      return;
    }
    const session = await signInWithPassword({ email: body.email, password: body.password });
    const authUser = session.user;
    let profile = await getProfileByUserId(authUser.id);
    if (!profile) {
      profile = await upsertProfile({
        user_id: authUser.id,
        email: authUser.email || body.email,
        plan: "free",
        credits_balance: 3,
        daily_credits_refreshed_on: new Date().toISOString().slice(0, 10)
      });
    }
    const user = {
      user_id: authUser.id,
      email: authUser.email || body.email,
      plan: profile.plan || "free",
      credits_balance: profile.credits_balance || 0
    };
    sendJson(res, 200, {
      token: session.access_token,
      refresh_token: session.refresh_token,
      user,
      entitlements: getEntitlements(user)
    });
  } catch (error) {
    sendJson(res, 401, { error: error.message });
  }
}
