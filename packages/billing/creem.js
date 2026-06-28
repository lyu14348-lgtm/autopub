import crypto from "node:crypto";
import { getPublicConfig, requireServerEnv } from "../shared/config.js";

export const PLANS = {
  pro: {
    id: "pro",
    label: "Pro",
    monthlyCents: 1900,
    credits: 500
  },
  pro_plus: {
    id: "pro_plus",
    label: "Pro Plus",
    monthlyCents: 4900,
    credits: 2000
  }
};

export function assertValidPlan(planId) {
  if (!PLANS[planId]) {
    throw new Error("Unsupported plan.");
  }
  return PLANS[planId];
}

export async function createCheckoutSession({ user, planId }) {
  const plan = assertValidPlan(planId);
  if (!user?.user_id) {
    throw new Error("Login is required before checkout.");
  }

  const { appBaseUrl, mockMode } = getPublicConfig();
  if (mockMode) {
    return {
      checkout_url: `${appBaseUrl}/pricing.html?checkout=mock-success&plan=${plan.id}`,
      provider: "mock",
      plan
    };
  }

  const apiKey = requireServerEnv("CREEM_API_KEY");
  const productId = requireServerEnv(plan.id === "pro_plus" ? "CREEM_PRO_PLUS_PRODUCT_ID" : "CREEM_PRO_PRODUCT_ID");
  const apiBase = process.env.CREEM_API_BASE_URL || "https://api.creem.io/v1";
  const response = await fetch(`${apiBase}/checkouts`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      product_id: productId,
      customer: {
        email: user.email
      },
      metadata: {
        user_id: user.user_id,
        plan: plan.id
      },
      success_url: `${appBaseUrl}/pricing.html?checkout=success&plan=${plan.id}`,
      cancel_url: `${appBaseUrl}/pricing.html?checkout=cancelled&plan=${plan.id}`
    })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Creem checkout failed: ${response.status}`);
  }
  const checkoutUrl = data?.checkout_url || data?.url || data?.checkoutUrl;
  if (!checkoutUrl) {
    throw new Error("Creem checkout response did not include a checkout URL.");
  }
  return {
    checkout_url: checkoutUrl,
    provider: "creem",
    plan
  };
}

export function verifyCreemSignature({ rawBody, signature, secret }) {
  if (!rawBody || !signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function normalizeCreemEvent(event) {
  const data = event.data || {};
  const metadata = data.metadata || event.metadata || {};
  const object = data.object || data;
  const status = object.status || event.status || "unknown";
  const grantCredits = ["active", "paid", "completed", "trialing"].includes(status);
  return {
    event_id: event.id || event.event_id,
    event_type: event.type || event.event_type,
    user_id: metadata.user_id,
    email: object.customer?.email || object.email,
    plan: metadata.plan,
    status,
    checkout_id: object.checkout_id || object.id,
    order_id: object.order_id || object.order?.id,
    customer_id: object.customer_id || object.customer?.id,
    subscription_id: object.subscription_id || object.subscription?.id,
    amount: object.amount || object.total_amount,
    currency: object.currency,
    current_period_end: object.current_period_end || object.subscription?.current_period_end,
    credits_delta: grantCredits ? (PLANS[metadata.plan]?.credits || 0) : 0,
    credits_balance: grantCredits ? (PLANS[metadata.plan]?.credits || 0) : 0,
    raw: event
  };
}
