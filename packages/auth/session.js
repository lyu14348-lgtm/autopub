import crypto from "node:crypto";
import { PLAN_LIMITS, requireServerEnv } from "../shared/config.js";

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function decodeBase64Url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function createAnonymousIdentity(source = "extension") {
  return {
    anonymous_id: `anon_${crypto.randomUUID()}`,
    source,
    plan: "anonymous",
    credits_balance: PLAN_LIMITS.anonymous.credits
  };
}

export function createExtensionLoginCode(userId) {
  return {
    code: `ext_${crypto.randomBytes(18).toString("hex")}`,
    user_id: userId,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    used: false
  };
}

export function createMockUser(plan = "free") {
  return {
    user_id: "local-user",
    email: "local@autopub.test",
    plan,
    credits_balance: PLAN_LIMITS[plan]?.credits ?? PLAN_LIMITS.free.credits
  };
}

export function getEntitlements(user) {
  const plan = user?.plan || "free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return {
    user_id: user?.user_id || null,
    plan,
    credits_balance: user?.credits_balance ?? limits.credits,
    limits,
    features: limits.features
  };
}

export function signServerSession(user, ttlSeconds = 30 * 24 * 60 * 60) {
  const secret = requireServerEnv("AUTH_SESSION_SECRET");
  const payload = {
    typ: "autopub_session",
    user_id: user.user_id,
    email: user.email || "",
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  };
  const encoded = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `aps_${encoded}.${signature}`;
}

export function verifyServerSession(token) {
  if (!token?.startsWith("aps_")) return null;
  const secret = requireServerEnv("AUTH_SESSION_SECRET");
  const body = token.slice(4);
  const [encoded, signature] = body.split(".");
  if (!encoded || !signature) throw new Error("Invalid AutoPub session token.");
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid AutoPub session signature.");
  }
  const payload = JSON.parse(decodeBase64Url(encoded));
  if (payload.typ !== "autopub_session") throw new Error("Invalid AutoPub session type.");
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw new Error("AutoPub session expired.");
  return payload;
}
