import { method, readJson, sendJson } from "./_utils.js";
import { isMockMode, recordWaitlistEntry } from "../packages/db/supabase.js";

export default async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  try {
    const body = await readJson(req);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email || "")) {
      sendJson(res, 400, { error: "Valid email is required." });
      return;
    }
    const entry = {
      email: body.email,
      source: body.source || "website",
      interested_features: body.interested_features || [],
      user_type: body.user_type || "visitor",
      created_at: new Date().toISOString()
    };
    if (!isMockMode()) {
      const saved = await recordWaitlistEntry(entry);
      sendJson(res, 200, { ok: true, entry: saved || entry });
      return;
    }
    sendJson(res, 200, { ok: true, entry });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}
