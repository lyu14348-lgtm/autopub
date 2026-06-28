# Supabase Setup

## Required Tables

```sql
create table profiles (
  user_id uuid primary key,
  email text,
  plan text not null default 'free',
  credits_balance integer not null default 0,
  daily_credits_refreshed_on date,
  plugin_source text,
  waitlist_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  creem_customer_id text,
  creem_subscription_id text,
  plan text not null,
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  creem_checkout_id text,
  creem_order_id text,
  amount integer,
  currency text,
  status text not null,
  raw_event_id text,
  created_at timestamptz not null default now()
);

create table credit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  delta integer not null,
  reason text not null,
  source text,
  created_at timestamptz not null default now()
);

create table waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  interested_features text[],
  user_type text,
  created_at timestamptz not null default now()
);

create table ai_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  task_type text not null,
  status text not null,
  input jsonb,
  output jsonb,
  credits_cost integer not null default 0,
  failure_reason text,
  created_at timestamptz not null default now()
);

create table plugin_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  anonymous_id text,
  plugin text not null,
  event_name text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table webhook_events (
  event_id text primary key,
  provider text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

create table extension_login_codes (
  code text primary key,
  user_id uuid not null,
  state text not null,
  extension_id text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function spend_credits_for_ai(
  p_user_id uuid,
  p_cost integer,
  p_reason text,
  p_task_type text,
  p_input jsonb
) returns table(credits_balance integer, ai_task_id uuid)
language plpgsql
security definer
as $$
declare
  v_profile profiles%rowtype;
  v_task_id uuid;
begin
  if p_cost < 0 then
    raise exception 'Invalid credit cost.';
  end if;

  select * into v_profile
  from profiles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if v_profile.plan = 'free' and (v_profile.daily_credits_refreshed_on is null or v_profile.daily_credits_refreshed_on < current_date) then
    update profiles
    set credits_balance = greatest(credits_balance, 3),
        daily_credits_refreshed_on = current_date,
        updated_at = now()
    where user_id = p_user_id
    returning * into v_profile;
  end if;

  if v_profile.credits_balance < p_cost then
    raise exception 'Not enough credits.';
  end if;

  update profiles
  set credits_balance = credits_balance - p_cost,
      updated_at = now()
  where user_id = p_user_id
  returning * into v_profile;

  insert into credit_logs(user_id, delta, reason, source)
  values (p_user_id, -p_cost, p_reason, 'ai')
  returning id into v_task_id;

  insert into ai_tasks(user_id, task_type, status, input, credits_cost)
  values (p_user_id, p_task_type, 'running', p_input, p_cost)
  returning id into v_task_id;

  credits_balance := v_profile.credits_balance;
  ai_task_id := v_task_id;
  return next;
end;
$$;

create or replace function complete_ai_task(
  p_ai_task_id uuid,
  p_status text,
  p_output jsonb,
  p_failure_reason text
) returns table(ai_task_id uuid, status text)
language plpgsql
security definer
as $$
declare
  v_task ai_tasks%rowtype;
begin
  select * into v_task from ai_tasks where id = p_ai_task_id for update;

  if not found then
    raise exception 'AI task not found.';
  end if;

  if p_status = 'failed' and v_task.status = 'running' and v_task.credits_cost > 0 then
    update profiles
    set credits_balance = credits_balance + v_task.credits_cost,
        updated_at = now()
    where user_id = v_task.user_id;

    insert into credit_logs(user_id, delta, reason, source)
    values (v_task.user_id, v_task.credits_cost, 'ai_refund:' || v_task.task_type, 'ai_refund');
  end if;

  update ai_tasks
  set status = p_status,
      output = p_output,
      failure_reason = p_failure_reason
  where id = p_ai_task_id;

  ai_task_id := p_ai_task_id;
  status := p_status;
  return next;
end;
$$;

create or replace function process_creem_webhook(
  p_event_id text,
  p_event_type text,
  p_user_id uuid,
  p_email text,
  p_plan text,
  p_status text,
  p_checkout_id text,
  p_order_id text,
  p_customer_id text,
  p_subscription_id text,
  p_amount integer,
  p_currency text,
  p_current_period_end timestamptz,
  p_credits_delta integer,
  p_payload jsonb
) returns table(duplicate boolean, applied_plan text, applied_status text)
language plpgsql
security definer
as $$
declare
  v_inserted boolean;
  v_paid boolean;
  v_plan text;
  v_status text;
  v_credits integer;
begin
  if p_event_id is null or p_event_id = '' then
    raise exception 'Missing Creem event id.';
  end if;

  if p_user_id is null then
    raise exception 'Webhook event is missing user_id metadata.';
  end if;

  v_plan := coalesce(p_plan, 'pro');
  v_status := coalesce(p_status, 'unknown');
  v_paid := v_status in ('active', 'paid', 'completed', 'trialing');
  v_credits := case when v_paid then coalesce(p_credits_delta, 0) else 0 end;

  with inserted as (
    insert into webhook_events(event_id, provider, event_type, payload)
    values (p_event_id, 'creem', p_event_type, p_payload)
    on conflict (event_id) do nothing
    returning event_id
  )
  select exists(select 1 from inserted) into v_inserted;

  if not v_inserted then
    duplicate := true;
    applied_plan := null;
    applied_status := null;
    return next;
    return;
  end if;

  insert into payments(user_id, creem_checkout_id, creem_order_id, amount, currency, status, raw_event_id)
  values (p_user_id, p_checkout_id, p_order_id, p_amount, p_currency, v_status, p_event_id);

  insert into subscriptions(user_id, creem_customer_id, creem_subscription_id, plan, status, current_period_end)
  values (p_user_id, p_customer_id, p_subscription_id, v_plan, v_status, p_current_period_end);

  if v_credits > 0 then
    insert into credit_logs(user_id, delta, reason, source)
    values (p_user_id, v_credits, 'creem:' || p_event_type, 'creem');
  end if;

  insert into profiles(user_id, email, plan, credits_balance)
  values (p_user_id, p_email, case when v_paid then v_plan else 'free' end, v_credits)
  on conflict (user_id) do update
  set email = coalesce(excluded.email, profiles.email),
      plan = excluded.plan,
      credits_balance = case when v_credits > 0 then profiles.credits_balance + v_credits else profiles.credits_balance end,
      updated_at = now();

  duplicate := false;
  applied_plan := case when v_paid then v_plan else 'free' end;
  applied_status := v_status;
  return next;
end;
$$;
```

## RLS Direction
- Public clients may read only their own profile and usage data.
- Service role routes own writes for payments, subscriptions, credits, and webhook events.
- Waitlist insertion may be exposed through a server route, not direct unrestricted table writes.
