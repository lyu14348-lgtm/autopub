import { method, sendJson } from "../_utils.js";

export default async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  sendJson(res, 200, { ok: true, cleared: true });
}

