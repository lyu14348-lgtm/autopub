import { PLAN_LIMITS } from "../shared/config.js";

export function getInitialCredits(plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return limits.credits ?? 0;
}

export function getDailyCredits(plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return limits.dailyCredits ?? 0;
}

export function getTrialCredits() {
  return PLAN_LIMITS.anonymous?.credits ?? 3;
}

export function canSpendCredits(user, cost) {
  if (!Number.isInteger(cost) || cost < 0) {
    return { ok: false, reason: "Invalid credit cost." };
  }
  if (!user) {
    return { ok: false, reason: "Login is required for this AI action." };
  }
  if ((user.credits_balance ?? 0) < cost) {
    return { ok: false, reason: "Not enough credits. Free users get 3 credits daily — they refresh every 24 hours." };
  }
  return { ok: true };
}

export function spendCredits(user, cost, reason) {
  const check = canSpendCredits(user, cost);
  if (!check.ok) return { ...check, user };
  return {
    ok: true,
    user: {
      ...user,
      credits_balance: user.credits_balance - cost
    },
    log: {
      delta: -cost,
      reason
    }
  };
}

export function grantDailyCredits(user) {
  const plan = user?.plan || "free";
  const dailyCap = getDailyCredits(plan);
  if (dailyCap <= 0) return { ...user };
  return {
    ...user,
    credits_balance: Math.min((user.credits_balance ?? 0) + dailyCap, dailyCap)
  };
}

export function grantPlanCredits(user, plan) {
  const monthlyCredits = getInitialCredits(plan);
  return {
    ...user,
    plan,
    credits_balance: (user.credits_balance ?? 0) + monthlyCredits
  };
}
