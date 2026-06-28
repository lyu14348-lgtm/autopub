import { createMockUser, getEntitlements, signServerSession } from "../../packages/auth/session.js";
import { getExtensionLoginCode, getProfileByUserId, isMockMode, markExtensionLoginCodeUsed } from "../../packages/db/supabase.js";
import { method, readJson, sendJson } from "../_utils.js";

export default async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  const body = await readJson(req);
  if (!body.code) {
    sendJson(res, 400, { error: "Missing extension login code." });
    return;
  }
  if (!isMockMode()) {
    const loginCode = await getExtensionLoginCode(body.code);
    if (!loginCode) {
      sendJson(res, 404, { error: "Extension login code not found." });
      return;
    }
    if (loginCode.used_at) {
      sendJson(res, 409, { error: "Extension login code has already been used." });
      return;
    }
    if (new Date(loginCode.expires_at).getTime() < Date.now()) {
      sendJson(res, 410, { error: "Extension login code has expired." });
      return;
    }
    if (body.state && loginCode.state && body.state !== loginCode.state) {
      sendJson(res, 403, { error: "Extension login state mismatch." });
      return;
    }
    const profile = await getProfileByUserId(loginCode.user_id);
    if (!profile) {
      sendJson(res, 404, { error: "User profile not found." });
      return;
    }
    await markExtensionLoginCodeUsed(body.code);
    const user = {
      user_id: profile.user_id,
      email: profile.email || "",
      plan: profile.plan || "free",
      credits_balance: profile.credits_balance || 0
    };
    sendJson(res, 200, {
      token: signServerSession(user),
      user,
      entitlements: getEntitlements(user)
    });
    return;
  }
  const user = createMockUser(body.plan || "free");
  sendJson(res, 200, {
    token: "local-extension-session-token",
    user,
    entitlements: getEntitlements(user)
  });
}
