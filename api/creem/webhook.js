import { normalizeCreemEvent, verifyCreemSignature } from "../../packages/billing/creem.js";
import { isMockMode, processCreemWebhookEvent } from "../../packages/db/supabase.js";
import { method, readRawBody, sendJson } from "../_utils.js";

const processedEvents = new Set();

export default async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  const rawBody = await readRawBody(req);
  const signature = req.headers["creem-signature"] || req.headers["x-creem-signature"];
  const secret = process.env.CREEM_WEBHOOK_SECRET;

  if (!isMockMode() && !secret) {
    sendJson(res, 500, { error: "CREEM_WEBHOOK_SECRET is required in production." });
    return;
  }

  if (!isMockMode() && !verifyCreemSignature({ rawBody, signature, secret })) {
    sendJson(res, 401, { error: "Invalid webhook signature." });
    return;
  }

  try {
    const event = normalizeCreemEvent(JSON.parse(rawBody || "{}"));
    if (!event.event_id) {
      sendJson(res, 400, { error: "Missing event id." });
      return;
    }
    if (isMockMode()) {
      let duplicate = false;
      if (processedEvents.has(event.event_id)) duplicate = true;
      processedEvents.add(event.event_id);
      sendJson(res, 200, {
        ok: true,
        duplicate,
        subscription_sync: {
          user_id: event.user_id || "pending-user",
          plan: event.plan || "pro",
          status: event.status,
          event_type: event.event_type
        }
      });
      return;
    }
    const processed = await processCreemWebhookEvent(event);
    sendJson(res, 200, {
      ok: true,
      duplicate: Boolean(processed?.duplicate),
      subscription_sync: {
        user_id: event.user_id || "pending-user",
        plan: event.plan || "pro",
        status: event.status,
        event_type: event.event_type
      }
    });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}
