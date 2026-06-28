import { getEntitlements } from "../packages/auth/session.js";
import { getRequestUser, method, sendJson } from "./_utils.js";

export default async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;
  try {
    sendJson(res, 200, getEntitlements(await getRequestUser(req)));
  } catch (error) {
    sendJson(res, 401, { error: error.message });
  }
}
