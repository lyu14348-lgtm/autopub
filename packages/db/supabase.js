import { requireServerEnv } from "../shared/config.js";

export function isMockMode() {
  return process.env.MOCK_MODE === "true";
}

function getSupabaseConfig() {
  return {
    url: requireServerEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, ""),
    serviceRoleKey: requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    anonKey: requireServerEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  };
}

export async function supabaseRest(path, { method = "GET", body, prefer } = {}) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Supabase REST request failed: ${response.status}`);
  }
  return data;
}

export async function supabaseRpc(functionName, body) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body || {})
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Supabase RPC request failed: ${response.status}`);
  }
  return data;
}

async function supabaseAuth(path, body) {
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(body || {})
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.msg || data?.message || data?.error_description || `Supabase Auth failed: ${response.status}`);
  }
  return data;
}

export async function signInWithPassword({ email, password }) {
  return supabaseAuth("token?grant_type=password", { email, password });
}

export async function signUpWithPassword({ email, password, name }) {
  const data = await supabaseAuth("signup", {
    email,
    password,
    data: { full_name: name || "" }
  });
  const userId = data.user?.id || data.id;
  if (userId) {
    await upsertProfile({
      user_id: userId,
      email,
      plan: "free",
      credits_balance: 3,
      waitlist_source: "web_register",
      daily_credits_refreshed_on: new Date().toISOString().slice(0, 10)
    });
  }
  return data;
}

export async function getSupabaseAuthUser(token) {
  if (!token) throw new Error("Missing bearer token.");
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Invalid Supabase session.");
  }
  return data;
}

export async function getProfileByUserId(userId) {
  const rows = await supabaseRest(`profiles?user_id=eq.${encodeURIComponent(userId)}&select=*`);
  return rows?.[0] || null;
}

export async function upsertProfile(profile) {
  const rows = await supabaseRest("profiles?on_conflict=user_id", {
    method: "POST",
    body: profile,
    prefer: "resolution=merge-duplicates,return=representation"
  });
  return rows?.[0] || null;
}

export async function hasWebhookEvent(eventId) {
  const existing = await supabaseRest(`webhook_events?event_id=eq.${encodeURIComponent(eventId)}&select=event_id`);
  return existing.length > 0;
}

export async function recordWebhookEvent(event) {
  const existing = await supabaseRest(`webhook_events?event_id=eq.${encodeURIComponent(event.event_id)}&select=event_id`);
  if (existing.length) return { duplicate: true };
  await supabaseRest("webhook_events", {
    method: "POST",
    body: {
      event_id: event.event_id,
      provider: "creem",
      event_type: event.event_type,
      payload: event.raw
    }
  });
  return { duplicate: false };
}

export async function recordWaitlistEntry(entry) {
  const rows = await supabaseRest("waitlist_entries", {
    method: "POST",
    body: {
      email: entry.email,
      source: entry.source || "website",
      interested_features: entry.interested_features || [],
      user_type: entry.user_type || "visitor"
    },
    prefer: "return=representation"
  });
  return rows?.[0] || null;
}

export async function getExtensionLoginCode(code) {
  const rows = await supabaseRest(`extension_login_codes?code=eq.${encodeURIComponent(code)}&select=*`);
  return rows?.[0] || null;
}

export async function markExtensionLoginCodeUsed(code) {
  const rows = await supabaseRest(`extension_login_codes?code=eq.${encodeURIComponent(code)}`, {
    method: "PATCH",
    body: { used_at: new Date().toISOString() },
    prefer: "return=representation"
  });
  return rows?.[0] || null;
}

export async function spendCreditsForAiTask({ userId, taskType, input, cost }) {
  const rows = await supabaseRpc("spend_credits_for_ai", {
    p_user_id: userId,
    p_cost: cost,
    p_reason: taskType,
    p_task_type: taskType,
    p_input: input || {}
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function completeAiTask({ taskId, status, output, failureReason }) {
  if (!taskId) return null;
  const rows = await supabaseRpc("complete_ai_task", {
    p_ai_task_id: taskId,
    p_status: status,
    p_output: output || null,
    p_failure_reason: failureReason || null
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function processCreemWebhookEvent(event) {
  const rows = await supabaseRpc("process_creem_webhook", {
    p_event_id: event.event_id,
    p_event_type: event.event_type,
    p_user_id: event.user_id,
    p_email: event.email || null,
    p_plan: event.plan || "pro",
    p_status: event.status || "unknown",
    p_checkout_id: event.checkout_id || null,
    p_order_id: event.order_id || null,
    p_customer_id: event.customer_id || null,
    p_subscription_id: event.subscription_id || null,
    p_amount: event.amount || null,
    p_currency: event.currency || null,
    p_current_period_end: event.current_period_end || null,
    p_credits_delta: event.credits_delta || 0,
    p_payload: event.raw || {}
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function syncPaymentAndEntitlements(event) {
  if (!event.user_id) throw new Error("Webhook event is missing user_id metadata.");
  const plan = event.plan || "pro";
  const status = event.status || "active";
  await supabaseRest("payments", {
    method: "POST",
    body: {
      user_id: event.user_id,
      creem_checkout_id: event.checkout_id || null,
      creem_order_id: event.order_id || null,
      amount: event.amount || null,
      currency: event.currency || null,
      status,
      raw_event_id: event.event_id
    }
  });
  await supabaseRest("subscriptions", {
    method: "POST",
    body: {
      user_id: event.user_id,
      creem_customer_id: event.customer_id || null,
      creem_subscription_id: event.subscription_id || null,
      plan,
      status,
      current_period_end: event.current_period_end || null
    }
  });
  if (event.credits_delta) {
    await supabaseRest("credit_logs", {
      method: "POST",
      body: {
        user_id: event.user_id,
        delta: event.credits_delta,
        reason: `creem:${event.event_type}`,
        source: "creem"
      }
    });
  }
  await upsertProfile({
    user_id: event.user_id,
    email: event.email || null,
    plan: status === "active" || status === "paid" ? plan : "free",
    credits_balance: event.credits_balance || event.credits_delta || 0
  });
}
