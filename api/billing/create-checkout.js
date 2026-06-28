import { createCheckoutSession } from "../../packages/billing/creem.js";
import { getRequestUser, method, readJson, sendJson } from "../_utils.js";

export default async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  try {
    const body = await readJson(req);
    const user = await getRequestUser(req);
    const checkout = await createCheckoutSession({ user, planId: body.plan || "pro" });
    sendJson(res, 200, checkout);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}
