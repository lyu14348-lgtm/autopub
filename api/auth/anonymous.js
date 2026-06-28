import { createAnonymousIdentity } from "../../packages/auth/session.js";
import { method, readJson, sendJson } from "../_utils.js";

export default async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  const body = await readJson(req);
  sendJson(res, 200, createAnonymousIdentity(body.source || "extension"));
}

