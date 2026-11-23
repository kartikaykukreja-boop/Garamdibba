-- Garam Dibba backend schema.
-- Run this whole file once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- It is safe to re-run: tables use IF NOT EXISTS and functions/policies are replaced.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

-- A corporate client. HR tops up the wallet; employee orders are paid from it.
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique,
  wallet_balance numeric(12,2) not null default 0 check (wallet_balance >= 0),
  monthly_limit numeric(12,2) check (monthly_limit is null or monthly_limit >= 0),          -- optional cap on total company spend per calendar month
  employee_monthly_limit numeric(12,2) check (employee_monthly_limit is null or employee_monthly_limit >= 0), -- optional cap per employee per month
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- One row per signed-in user. role = what they can do on the platform;
-- company_role = their place inside a company (if any).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'rider', 'admin')),
  company_id uuid references public.companies(id) on delete set null,
  company_role text check (company_role in ('hr', 'employee')),
  created_at timestamptz not null default now()
);
create index if not exists profiles_company_idx on public.profiles (company_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  user_id uuid not null references public.profiles(id) on delete restrict,
  company_id uuid references public.companies(id) on delete set null,
  payment_method text not null check (payment_method in ('online', 'company')),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'confirmed', 'completed', 'cancelled')),
  menu text not null check (menu in ('protein_bowl', 'north_indian')),
  plan_id text not null,
  plan_name text not null,
  bowl_choice text,
  quantity int not null check (quantity between 1 and 20),
  boxes int not null check (boxes > 0),
  total numeric(10,2) not null check (total > 0),
  start_date date not null,
  schedule jsonb not null,            -- [{ "date": "2026-11-21", "item": "Pindi Chole" }, ...]
  customer_name text not null,
  customer_phone text not null,
  address_line text not null,
  address_landmark text,
  lat double precision not null,
  lng double precision not null,
  distance_km numeric(6,2) not null,
  notes text,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  paid_at timestamptz,
  refund_due numeric(10,2),           -- set when an online order is cancelled; refund it from the Razorpay dashboard
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_company_idx on public.orders (company_id, created_at desc);

-- One row per box drop-off. A 1-week plan creates 6 deliveries.
create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delivery_date date not null,
  item_name text not null,
  quantity int not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  rider_id uuid references public.profiles(id) on delete set null,
  out_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists deliveries_date_idx on public.deliveries (delivery_date, status);
create index if not exists deliveries_rider_idx on public.deliveries (rider_id, delivery_date);
create index if not exists deliveries_order_idx on public.deliveries (order_id);

-- Latest GPS fix for each rider (one row per rider, overwritten as they move).
create table if not exists public.rider_locations (
  rider_id uuid primary key references public.profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision,
  heading double precision,
  updated_at timestamptz not null default now()
);

-- Razorpay payments that HR starts to add money to the company wallet.
create table if not exists public.company_topups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  status text not null default 'created' check (status in ('created', 'paid')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Ledger of every wallet movement. amount > 0 adds money, amount < 0 spends it.
create table if not exists public.company_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null check (kind in ('topup', 'order', 'refund', 'adjustment')),
  amount numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  razorpay_payment_id text unique,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists company_tx_idx on public.company_transactions (company_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- New sign-ups get a profile automatically
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Money and order functions (called by the website's server only)
-- ─────────────────────────────────────────────────────────────

-- Turns a paid order's schedule into delivery rows.
create or replace function public.create_deliveries(p_order public.orders)
returns void language sql security definer set search_path = public as $$
  insert into public.deliveries (order_id, user_id, delivery_date, item_name, quantity)
  select p_order.id, p_order.user_id, (s->>'date')::date, s->>'item', p_order.quantity
  from jsonb_array_elements(p_order.schedule) s;
$$;

-- Marks an online order paid. Returns false if it was already confirmed
-- (the browser callback and the webhook can both arrive; only one wins).
create or replace function public.confirm_online_order(p_order_id uuid, p_payment_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  update public.orders
     set status = 'confirmed', razorpay_payment_id = p_payment_id, paid_at = now()
   where id = p_order_id and status = 'pending_payment' and payment_method = 'online'
  returning * into o;
  if not found then return false; end if;
  perform public.create_deliveries(o);
  return true;
end $$;

-- How much a company (or one employee) has spent this calendar month (IST).
create or replace function public.company_month_spend(p_company_id uuid, p_user_id uuid default null)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(-sum(amount), 0)
    from public.company_transactions
   where company_id = p_company_id
     and kind in ('order', 'refund')
     and (p_user_id is null or user_id = p_user_id)
     and created_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata');
$$;

-- Charges an employee's order to the company wallet. Returns 'ok' or an error code.
create or replace function public.place_company_order(p_order_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  c public.companies;
  new_balance numeric;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.status <> 'pending_payment' or o.payment_method <> 'company' then
    return 'invalid_order';
  end if;

  -- Row lock: two employees ordering at the same moment can't overspend.
  select * into c from public.companies where id = o.company_id for update;
  if not found or not c.active then return 'company_inactive'; end if;
  if c.wallet_balance < o.total then return 'insufficient_balance'; end if;
  if c.monthly_limit is not null
     and public.company_month_spend(c.id) + o.total > c.monthly_limit then
    return 'company_monthly_limit';
  end if;
  if c.employee_monthly_limit is not null
     and public.company_month_spend(c.id, o.user_id) + o.total > c.employee_monthly_limit then
    return 'employee_monthly_limit';
  end if;

  update public.companies set wallet_balance = wallet_balance - o.total
   where id = c.id returning wallet_balance into new_balance;

  insert into public.company_transactions (company_id, kind, amount, balance_after, order_id, user_id, note)
  values (c.id, 'order', -o.total, new_balance, o.id, o.user_id, 'Order #' || o.order_number);

  update public.orders set status = 'confirmed', paid_at = now() where id = o.id returning * into o;
  perform public.create_deliveries(o);
  return 'ok';
end $$;

-- Adds a paid Razorpay top-up to the wallet. Idempotent per Razorpay order.
create or replace function public.credit_company_topup(p_razorpay_order_id text, p_payment_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare t public.company_topups; new_balance numeric;
begin
  update public.company_topups
     set status = 'paid', razorpay_payment_id = p_payment_id
   where razorpay_order_id = p_razorpay_order_id and status = 'created'
  returning * into t;
  if not found then return false; end if;

  update public.companies set wallet_balance = wallet_balance + t.amount
   where id = t.company_id returning wallet_balance into new_balance;

  insert into public.company_transactions (company_id, kind, amount, balance_after, user_id, razorpay_payment_id, note)
  values (t.company_id, 'topup', t.amount, new_balance, t.created_by, p_payment_id, 'Online top-up');
  return true;
end $$;

-- Manual wallet change by a Garam Dibba admin (e.g. HR paid by bank transfer).
create or replace function public.adjust_company_wallet(p_company_id uuid, p_amount numeric, p_note text, p_admin uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare new_balance numeric;
begin
  update public.companies set wallet_balance = wallet_balance + p_amount
   where id = p_company_id returning wallet_balance into new_balance;
  if not found then raise exception 'Company not found'; end if;
  insert into public.company_transactions (company_id, kind, amount, balance_after, user_id, note)
  values (p_company_id, 'adjustment', p_amount, new_balance, p_admin, p_note);
  return new_balance;
end $$;

-- Cancels an order's remaining (not yet delivered) boxes.
-- Company orders are refunded to the wallet straight away.
-- Online orders get refund_due set; refund it from the Razorpay dashboard.
create or replace function public.cancel_order(p_order_id uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  total_count int;
  cancel_count int;
  refund numeric;
  new_balance numeric;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.status in ('cancelled', 'completed') then return 0; end if;

  if o.status = 'pending_payment' then
    update public.orders set status = 'cancelled' where id = o.id;
    return 0;
  end if;

  select count(*) into total_count from public.deliveries where order_id = o.id;
  update public.deliveries set status = 'cancelled'
   where order_id = o.id and status in ('scheduled', 'preparing');
  get diagnostics cancel_count = row_count;

  refund := case when total_count = 0 then 0 else round(o.total * cancel_count / total_count, 2) end;

  if o.payment_method = 'company' and refund > 0 then
    update public.companies set wallet_balance = wallet_balance + refund
     where id = o.company_id returning wallet_balance into new_balance;
    insert into public.company_transactions (company_id, kind, amount, balance_after, order_id, user_id, note)
    values (o.company_id, 'refund', refund, new_balance, o.id, o.user_id, 'Cancelled order #' || o.order_number);
  end if;

  update public.orders
     set status = case
           when cancel_count = total_count then 'cancelled'
           when not exists (select 1 from public.deliveries
                             where order_id = o.id and status not in ('delivered', 'cancelled')) then 'completed'
           else o.status
         end,
         refund_due = case when o.payment_method = 'online' and refund > 0 then refund else null end
   where id = o.id;
  return refund;
end $$;

-- Only the server (service role) may call the money functions.
revoke all on function public.create_deliveries(public.orders) from public, anon, authenticated;
revoke all on function public.confirm_online_order(uuid, text) from public, anon, authenticated;
revoke all on function public.company_month_spend(uuid, uuid) from public, anon, authenticated;
revoke all on function public.place_company_order(uuid) from public, anon, authenticated;
revoke all on function public.credit_company_topup(text, text) from public, anon, authenticated;
revoke all on function public.adjust_company_wallet(uuid, numeric, text, uuid) from public, anon, authenticated;
revoke all on function public.cancel_order(uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- The website's server writes with the secret key (bypasses RLS).
-- These policies control what a signed-in browser can read directly,
-- which is what live tracking uses.
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_rider()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('rider', 'admin'));
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.deliveries enable row level security;
alter table public.rider_locations enable row level security;
alter table public.company_topups enable row level security;
alter table public.company_transactions enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "own company" on public.companies;
create policy "own company" on public.companies for select
  using (id = (select company_id from public.profiles where id = auth.uid()) or public.is_admin());

drop policy if exists "own orders" on public.orders;
create policy "own orders" on public.orders for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "own deliveries" on public.deliveries;
create policy "own deliveries" on public.deliveries for select
  using (user_id = auth.uid() or rider_id = auth.uid() or public.is_admin());

-- Customers can see a rider's position only while that rider is bringing their food.
drop policy if exists "see my rider" on public.rider_locations;
create policy "see my rider" on public.rider_locations for select
  using (
    rider_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.deliveries d
       where d.rider_id = rider_locations.rider_id
         and d.user_id = auth.uid()
         and d.status = 'out_for_delivery'
    )
  );

drop policy if exists "rider writes own location" on public.rider_locations;
create policy "rider writes own location" on public.rider_locations for insert
  with check (rider_id = auth.uid() and public.is_rider());

drop policy if exists "rider updates own location" on public.rider_locations;
create policy "rider updates own location" on public.rider_locations for update
  using (rider_id = auth.uid() and public.is_rider())
  with check (rider_id = auth.uid() and public.is_rider());

-- ─────────────────────────────────────────────────────────────
-- Realtime (live tracking)
-- ─────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'deliveries') then
    alter publication supabase_realtime add table public.deliveries;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'rider_locations') then
    alter publication supabase_realtime add table public.rider_locations;
  end if;
end $$;

-- The website's server (service role) needs to call the functions above.
grant execute on function public.create_deliveries(public.orders) to service_role;
grant execute on function public.confirm_online_order(uuid, text) to service_role;
grant execute on function public.company_month_spend(uuid, uuid) to service_role;
grant execute on function public.place_company_order(uuid) to service_role;
grant execute on function public.credit_company_topup(text, text) to service_role;
grant execute on function public.adjust_company_wallet(uuid, numeric, text, uuid) to service_role;
grant execute on function public.cancel_order(uuid) to service_role;

-- ─────────────────────────────────────────────────────────────
-- Table permissions
-- Newer Supabase projects do not grant these automatically.
-- RLS policies above still decide which rows a signed-in user sees.
-- ─────────────────────────────────────────────────────────────

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant select on public.companies, public.profiles, public.orders, public.deliveries,
  public.rider_locations, public.company_topups, public.company_transactions to authenticated;
grant insert, update on public.rider_locations to authenticated;

grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_rider() to authenticated, service_role;
