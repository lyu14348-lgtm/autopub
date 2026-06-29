import assert from "node:assert/strict";
import crypto from "node:crypto";
import { canSpendCredits, getDailyCredits, getTrialCredits, grantDailyCredits, grantPlanCredits, spendCredits } from "../packages/credits/credits.js";
import { createCheckoutSession, normalizeCreemEvent, verifyCreemSignature } from "../packages/billing/creem.js";
import { createMockUser, getEntitlements, signServerSession, verifyServerSession } from "../packages/auth/session.js";
import { runAiTask } from "../packages/ai/provider.js";
import { getMockRequestUser } from "../api/_utils.js";

process.env.MOCK_MODE = "true";
process.env.APP_BASE_URL = "http://localhost:4173";
process.env.AUTH_SESSION_SECRET = "local-test-auth-session-secret";

const scope = process.argv[2] || "all";

async function testCredits() {
  // Anonymous trial credits
  assert.equal(getTrialCredits(), 3);

  // Free user: 0 monthly credits, 3 daily credits
  const freeUser = createMockUser("free");
  assert.equal(freeUser.credits_balance, 0, "free users start with 0 monthly credits");
  assert.equal(getDailyCredits("free"), 3);
  assert.equal(canSpendCredits(freeUser, 2).ok, false, "free user with 0 balance cannot spend");

  // After daily grant: 3 credits
  const dailyUser = grantDailyCredits(freeUser);
  assert.equal(dailyUser.credits_balance, 3, "daily grant gives 3 credits");
  assert.equal(canSpendCredits(dailyUser, 2).ok, true);
  assert.equal(canSpendCredits(dailyUser, 999).ok, false);

  // Spend test
  const spent = spendCredits(dailyUser, 2, "unit_test");
  assert.equal(spent.ok, true);
  assert.equal(spent.user.credits_balance, 1);

  // Daily credits don't accumulate beyond cap
  const recapped = grantDailyCredits(spent.user);
  assert.equal(recapped.credits_balance, 3, "daily grant caps at 3, doesn't accumulate");

  // Pro upgrade grants monthly credits
  const proUser = grantPlanCredits(freeUser, "pro");
  assert.equal(proUser.plan, "pro");
  assert.equal(proUser.credits_balance, 500);
}

async function testBilling() {
  const checkout = await createCheckoutSession({ user: createMockUser("free"), planId: "pro" });
  assert.equal(checkout.provider, "mock");
  assert.match(checkout.checkout_url, /pricing\.html/);
  await assert.rejects(() => createCheckoutSession({ user: {}, planId: "pro" }), /Login is required/);
  await assert.rejects(() => createCheckoutSession({ user: createMockUser(), planId: "enterprise" }), /Unsupported plan/);
}

async function testWebhook() {
  const rawBody = JSON.stringify({ id: "evt_1", type: "checkout.completed", metadata: { user_id: "u_1", plan: "pro" }, status: "paid" });
  const secret = "local-webhook-secret";
  const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  assert.equal(verifyCreemSignature({ rawBody, signature, secret }), true);
  assert.equal(verifyCreemSignature({ rawBody, signature: "bad", secret }), false);
  const event = normalizeCreemEvent(JSON.parse(rawBody));
  assert.equal(event.event_id, "evt_1");
  assert.equal(event.plan, "pro");
}

async function testEntitlementsAndAi() {
  // Pro user: can run AI
  const proUser = createMockUser("pro");
  const entitlements = getEntitlements(proUser);
  assert.equal(entitlements.plan, "pro");
  assert.equal(entitlements.features.includes("ai_prompt"), true);
  const result = await runAiTask({ user: proUser, taskType: "seo_fix", input: { title: "x" } });
  assert.equal(result.ok, true);

  // Free user with 0 credits: AI fails
  const freeUser = createMockUser("free");
  const freeResult = await runAiTask({ user: freeUser, taskType: "seo_fix", input: {} });
  assert.equal(freeResult.ok, false);

  // Free user with daily credits: AI succeeds
  const dailyUser = grantDailyCredits(freeUser);
  const dailyResult = await runAiTask({ user: dailyUser, taskType: "seo_fix", input: {} });
  assert.equal(dailyResult.ok, true);
}

async function testProductionGuards() {
  const originalMockMode = process.env.MOCK_MODE;
  const originalCreemKey = process.env.CREEM_API_KEY;
  const originalCreemProduct = process.env.CREEM_PRO_PRODUCT_ID;
  process.env.MOCK_MODE = "false";
  delete process.env.CREEM_API_KEY;
  delete process.env.CREEM_PRO_PRODUCT_ID;

  assert.throws(
    () => getMockRequestUser({ headers: {} }),
    /Mock user access is disabled in production/
  );
  await assert.rejects(
    () => createCheckoutSession({ user: createMockUser("free"), planId: "pro" }),
    /Missing required server environment variable: CREEM_API_KEY/
  );

  process.env.MOCK_MODE = originalMockMode;
  if (originalCreemKey) process.env.CREEM_API_KEY = originalCreemKey;
  if (originalCreemProduct) process.env.CREEM_PRO_PRODUCT_ID = originalCreemProduct;
}

async function testServerSessionToken() {
  const user = createMockUser("pro");
  const token = signServerSession(user, 60);
  assert.match(token, /^aps_/);
  const session = verifyServerSession(token);
  assert.equal(session.user_id, user.user_id);
  assert.equal(session.email, user.email);
}

if (scope === "billing") {
  await testBilling();
} else if (scope === "webhook") {
  await testWebhook();
} else {
  await testCredits();
  await testBilling();
  await testWebhook();
  await testEntitlementsAndAi();
  await testProductionGuards();
  await testServerSessionToken();
}

console.log("test ok (" + scope + ")");
