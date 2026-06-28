import { createMockUser, verifyServerSession } from "../packages/auth/session.js";
import { getProfileByUserId, getSupabaseAuthUser, isMockMode } from "../packages/db/supabase.js";

const rateLimitBuckets = new Map();

export function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

export async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

export function method(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    sendJson(res, 405, { error: "Method not allowed." });
    return false;
  }
  return true;
}

export function checkRateLimit(req, key, { limit = 10, windowMs = 60_000 } = {}) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : (forwarded || req.socket?.remoteAddress || "unknown");
  const bucketKey = `${key}:${ip.split(",")[0].trim()}`;
  const now = Date.now();
  const bucket = rateLimitBuckets.get(bucketKey) || { count: 0, resetAt: now + windowMs };
  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  rateLimitBuckets.set(bucketKey, bucket);
  return {
    ok: bucket.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}

export function getMockRequestUser(req) {
  if (!isMockMode()) {
    throw new Error("Mock user access is disabled in production.");
  }
  const requestedPlan = req.headers["x-autopub-plan"];
  const defaultPlan = process.env.MOCK_DEFAULT_PLAN || "free";
  const plan = ["free", "pro", "pro_plus"].includes(requestedPlan)
    ? requestedPlan
    : (["free", "pro", "pro_plus"].includes(defaultPlan) ? defaultPlan : "free");
  return createMockUser(plan);
}

export async function getRequestUser(req) {
  if (isMockMode()) return getMockRequestUser(req);

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (token.startsWith("aps_")) {
    const session = verifyServerSession(token);
    const profile = await getProfileByUserId(session.user_id);
    return {
      user_id: session.user_id,
      email: profile?.email || session.email,
      plan: profile?.plan || "free",
      credits_balance: profile?.credits_balance || 0
    };
  }
  const authUser = await getSupabaseAuthUser(token);
  const profile = await getProfileByUserId(authUser.id);
  return {
    user_id: authUser.id,
    email: authUser.email,
    plan: profile?.plan || "free",
    credits_balance: profile?.credits_balance || 0
  };
}
