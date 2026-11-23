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

-- Only the server (service role) may call the money functions.
revoke all on function public.create_deliveries(public.orders) from public, anon, authenticated;
revoke all on function public.confirm_online_order(uuid, text) from public, anon, authenticated;
revoke all on function public.company_month_spend(uuid, uuid) from public, anon, authenticated;
revoke all on function public.place_company_order(uuid) from public, anon, authenticated;
revoke all on function public.credit_company_topup(text, text) from public, anon, authenticated;
revoke all on function public.adjust_company_wallet(uuid, numeric, text, uuid) from public, anon, authenticated;

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

-- =============================================================
-- Website Ordering Spec (Nov 2026). Same as supabase/migrations/002_ordering_spec.sql.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- Customer profile: saved location, preferences and handoff choice
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists address_line text,
  add column if not exists address_landmark text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists road_km numeric(6,2),
  add column if not exists delivery_note text,
  add column if not exists delivery_contact text,
  add column if not exists allergies text[] not null default '{}',
  add column if not exists allergy_other text,
  add column if not exists preferences text[] not null default '{}',
  add column if not exists handoff text,
  add column if not exists is_office boolean,
  add column if not exists reception_ok boolean,
  add column if not exists default_meal text,
  add column if not exists default_slot text;

-- ─────────────────────────────────────────────────────────────
-- Orders: meal + slot, chosen weekdays, itemised money, handoff and allergy snapshot
-- ─────────────────────────────────────────────────────────────
alter table public.orders
  add column if not exists meal text not null default 'lunch',
  add column if not exists slot text,
  add column if not exists weekdays int[],
  add column if not exists meals_total numeric(10,2),
  add column if not exists delivery_fee numeric(10,2) not null default 0,
  add column if not exists extras jsonb not null default '[]',
  add column if not exists extras_total numeric(10,2) not null default 0,
  add column if not exists handoff text,
  add column if not exists delivery_note text,
  add column if not exists delivery_contact text,
  add column if not exists allergies text[] not null default '{}',
  add column if not exists allergy_other text,
  add column if not exists preferences text[] not null default '{}',
  add column if not exists road_km numeric(6,2),
  add column if not exists valid_until date,
  add column if not exists skipped_for_allergy jsonb not null default '[]';

alter table public.orders drop constraint if exists orders_meal_check;
alter table public.orders add constraint orders_meal_check check (meal in ('lunch', 'dinner'));

-- ─────────────────────────────────────────────────────────────
-- Deliveries: one row per meal credit
--   kind: regular (bought) · carry (replaces a skipped box) · makeup (replaces a missed box)
--   status adds: skipped (credit kept) · missed (our fault, credit kept) · paused
-- ─────────────────────────────────────────────────────────────
alter table public.deliveries
  add column if not exists meal text not null default 'lunch',
  add column if not exists slot text,
  add column if not exists kind text not null default 'regular',
  add column if not exists extras jsonb not null default '[]',
  add column if not exists handoff_result text,
  add column if not exists proof_path text,
  add column if not exists proof_lat double precision,
  add column if not exists proof_lng double precision,
  add column if not exists proof_distance_m int,
  add column if not exists replaces_id uuid references public.deliveries(id) on delete set null,
  add column if not exists skipped_at timestamptz;

alter table public.deliveries drop constraint if exists deliveries_status_check;
alter table public.deliveries add constraint deliveries_status_check check (
  status in ('scheduled', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'skipped', 'missed', 'paused')
);
alter table public.deliveries drop constraint if exists deliveries_kind_check;
alter table public.deliveries add constraint deliveries_kind_check check (kind in ('regular', 'carry', 'makeup'));
alter table public.deliveries drop constraint if exists deliveries_handoff_result_check;
alter table public.deliveries add constraint deliveries_handoff_result_check
  check (handoff_result is null or handoff_result in ('customer', 'door', 'guard', 'contact'));

create index if not exists deliveries_slot_idx on public.deliveries (delivery_date, meal, slot);

-- ─────────────────────────────────────────────────────────────
-- Add-ons: kitchen extras, cold drinks and chocolates
-- Packaged goods must be sold at or below MRP. stock = null means made in the kitchen (no count).
-- ─────────────────────────────────────────────────────────────
create table if not exists public.extras (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('food', 'drink', 'sweet')),
  price numeric(8,2) not null check (price >= 0),
  mrp numeric(8,2),
  stock int check (stock is null or stock >= 0),
  active boolean not null default true,
  menus text[] not null default '{north_indian,protein_bowl}',
  note text,
  image_url text,
  sort int not null default 0,
  updated_at timestamptz not null default now(),
  check (mrp is null or price <= mrp)
);

-- Starter catalogue. PRICES, MRPs AND STOCK ARE PLACEHOLDERS: set the real ones in
-- Kitchen admin → Catalog before launch. Existing rows are never overwritten.
insert into public.extras (id, name, kind, price, mrp, stock, menus, note, sort) values
  ('extra-roti',   'Extra roti',            'food',  10, null, null, '{north_indian}',              null,            10),
  ('raita',        'Raita',                 'food',  30, null, null, '{north_indian,protein_bowl}', null,            20),
  ('chaas',        'Chaas',                 'food',  25, null, null, '{north_indian,protein_bowl}', null,            30),
  ('papad',        'Papad',                 'food',  10, null, null, '{north_indian}',              null,            40),
  ('sweet-of-day', 'Sweet of the day',      'food',  40, null, null, '{north_indian,protein_bowl}', null,            50),
  ('extra-paneer', 'Extra paneer',          'food',  50, null, null, '{north_indian,protein_bowl}', '+50 g paneer',  60),
  ('diet-coke',    'Diet Coke',             'drink', 40, 40,   24,   '{north_indian,protein_bowl}', '300 ml can',    70),
  ('sprite',       'Sprite',                'drink', 40, 40,   24,   '{north_indian,protein_bowl}', '300 ml can',    80),
  ('dairy-milk',   'Cadbury Dairy Milk',    'sweet', 20, 20,   30,   '{north_indian,protein_bowl}', null,           100),
  ('kitkat',       'KitKat',                'sweet', 20, 20,   30,   '{north_indian,protein_bowl}', null,           110)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Waitlist for addresses beyond the delivery zone
-- ─────────────────────────────────────────────────────────────
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  lat double precision not null,
  lng double precision not null,
  road_km numeric(6,2),
  address text,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Dates the kitchen is closed (holidays). Ordering is blocked on these.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.closed_dates (
  date date primary key,
  reason text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- "Didn't get my box?" reports
-- ─────────────────────────────────────────────────────────────
create table if not exists public.delivery_reports (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rider_id uuid references public.profiles(id) on delete set null,
  reason text not null check (reason in ('not_received', 'wrong_meal', 'damaged', 'missing_extras')),
  note text,
  photo_path text,
  status text not null default 'open' check (status in ('open', 'make_up', 'refund', 'rejected')),
  resolution_note text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists delivery_reports_status_idx on public.delivery_reports (status, created_at desc);
create unique index if not exists delivery_reports_one_open on public.delivery_reports (delivery_id) where status = 'open';

alter table public.extras enable row level security;
alter table public.waitlist enable row level security;
alter table public.closed_dates enable row level security;
alter table public.delivery_reports enable row level security;

-- Private bucket for rider proof-of-delivery photos and report photos (server access only).
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', false)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Functions
-- ─────────────────────────────────────────────────────────────

-- Turns a paid order's schedule into delivery rows. Add-ons ride with the first box.
create or replace function public.create_deliveries(p_order public.orders)
returns void language sql security definer set search_path = public as $$
  insert into public.deliveries (order_id, user_id, delivery_date, item_name, quantity, meal, slot, extras)
  select p_order.id, p_order.user_id, (s.value->>'date')::date, s.value->>'item', p_order.quantity,
         p_order.meal, p_order.slot,
         case when s.ord = 1 then coalesce(p_order.extras, '[]'::jsonb) else '[]'::jsonb end
  from jsonb_array_elements(p_order.schedule) with ordinality as s(value, ord);
$$;

-- Takes packaged add-ons out of stock once an order is paid.
create or replace function public.consume_extras(p_order public.orders)
returns void language sql security definer set search_path = public as $$
  update public.extras x
     set stock = greatest(x.stock - picked.qty, 0), updated_at = now()
    from (
      select e->>'id' as id, sum((e->>'qty')::int) as qty
        from jsonb_array_elements(coalesce(p_order.extras, '[]'::jsonb)) e
       group by 1
    ) picked
   where x.id = picked.id and x.stock is not null;
$$;

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
  perform public.consume_extras(o);
  return true;
end $$;

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
  perform public.consume_extras(o);
  return 'ok';
end $$;

-- Skip made before the skip cutoff: the credit is kept and a box is added at the end.
-- The website works out the new date (chosen weekdays, closed dates) and the dish.
create or replace function public.skip_delivery(p_delivery_id uuid, p_new_date date, p_item text)
returns uuid language plpgsql security definer set search_path = public as $$
declare d public.deliveries; new_id uuid;
begin
  update public.deliveries set status = 'skipped', skipped_at = now()
   where id = p_delivery_id and status = 'scheduled'
  returning * into d;
  if not found then return null; end if;

  insert into public.deliveries (order_id, user_id, delivery_date, item_name, quantity, meal, slot, kind, replaces_id, extras)
  values (d.order_id, d.user_id, p_new_date, p_item, d.quantity, d.meal, d.slot, 'carry', d.id, d.extras)
  returning id into new_id;
  update public.deliveries set extras = '[]' where id = d.id;
  return new_id;
end $$;

-- A box we failed to deliver (or a report decided in the customer's favour):
-- the credit is kept and a make-up box is scheduled.
create or replace function public.make_up_delivery(p_delivery_id uuid, p_new_date date, p_item text)
returns uuid language plpgsql security definer set search_path = public as $$
declare d public.deliveries; new_id uuid;
begin
  update public.deliveries set status = 'missed'
   where id = p_delivery_id and status in ('scheduled', 'preparing', 'out_for_delivery', 'delivered')
  returning * into d;
  if not found then return null; end if;

  insert into public.deliveries (order_id, user_id, delivery_date, item_name, quantity, meal, slot, kind, replaces_id, extras)
  values (d.order_id, d.user_id, p_new_date, p_item, d.quantity, d.meal, d.slot, 'makeup', d.id, d.extras)
  returning id into new_id;
  update public.orders set status = 'confirmed' where id = d.order_id and status = 'completed';
  return new_id;
end $$;

-- Cancels an order's remaining boxes (scheduled or paused).
-- Refund = unused credits minus the plan discount: used meals are re-priced at the
-- single-meal price. Unused delivery fees and add-ons on cancelled boxes are refunded too.
-- Company orders are refunded to the wallet; online orders get refund_due (refund via Razorpay).
drop function if exists public.cancel_order(uuid);
create or replace function public.cancel_order(p_order_id uuid, p_single_price numeric default 180)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  cancel_count int;
  used int;
  extras_refund numeric;
  meal_value numeric;
  refund numeric;
  new_balance numeric;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.status in ('cancelled', 'completed') then return 0; end if;

  if o.status = 'pending_payment' then
    update public.orders set status = 'cancelled' where id = o.id;
    return 0;
  end if;

  select coalesce(sum((e->>'price')::numeric * (e->>'qty')::int), 0) into extras_refund
    from public.deliveries d, jsonb_array_elements(d.extras) e
   where d.order_id = o.id and d.status in ('scheduled', 'paused');

  update public.deliveries set status = 'cancelled'
   where order_id = o.id and status in ('scheduled', 'paused');
  get diagnostics cancel_count = row_count;

  used := greatest(o.boxes - cancel_count, 0);
  meal_value := coalesce(o.meals_total, o.total - coalesce(o.delivery_fee, 0) - coalesce(o.extras_total, 0));

  if cancel_count = 0 then
    refund := 0;
  elsif used = 0 then
    refund := o.total;
  else
    refund := greatest(0, meal_value - used * o.quantity * p_single_price)
            + round(coalesce(o.delivery_fee, 0) * cancel_count / greatest(o.boxes, 1), 2)
            + extras_refund;
  end if;
  refund := least(round(refund, 2), o.total);

  if o.payment_method = 'company' and refund > 0 then
    update public.companies set wallet_balance = wallet_balance + refund
     where id = o.company_id returning wallet_balance into new_balance;
    insert into public.company_transactions (company_id, kind, amount, balance_after, order_id, user_id, note)
    values (o.company_id, 'refund', refund, new_balance, o.id, o.user_id, 'Cancelled order #' || o.order_number);
  end if;

  update public.orders
     set status = case
           when not exists (select 1 from public.deliveries where order_id = o.id and status = 'delivered') then 'cancelled'
           when not exists (select 1 from public.deliveries
                             where order_id = o.id and status in ('scheduled', 'preparing', 'out_for_delivery', 'paused')) then 'completed'
           else o.status
         end,
         refund_due = case
           when o.payment_method = 'online' and refund > 0 then coalesce(o.refund_due, 0) + refund
           else o.refund_due
         end
   where id = o.id;
  return refund;
end $$;

-- Only the server (service role) may call these.
revoke all on function public.create_deliveries(public.orders) from public, anon, authenticated;
revoke all on function public.consume_extras(public.orders) from public, anon, authenticated;
revoke all on function public.confirm_online_order(uuid, text) from public, anon, authenticated;
revoke all on function public.place_company_order(uuid) from public, anon, authenticated;
revoke all on function public.skip_delivery(uuid, date, text) from public, anon, authenticated;
revoke all on function public.make_up_delivery(uuid, date, text) from public, anon, authenticated;
revoke all on function public.cancel_order(uuid, numeric) from public, anon, authenticated;

grant execute on function public.create_deliveries(public.orders) to service_role;
grant execute on function public.consume_extras(public.orders) to service_role;
grant execute on function public.confirm_online_order(uuid, text) to service_role;
grant execute on function public.place_company_order(uuid) to service_role;
grant execute on function public.skip_delivery(uuid, date, text) to service_role;
grant execute on function public.make_up_delivery(uuid, date, text) to service_role;
grant execute on function public.cancel_order(uuid, numeric) to service_role;

-- New tables need the same table permissions as the rest (newer Supabase projects don't grant them).
grant all on public.extras, public.waitlist, public.closed_dates, public.delivery_reports to service_role;

-- =============================================================
-- Security hardening. Same as supabase/migrations/003_security.sql.
-- =============================================================
-- Garam Dibba: security hardening (Nov 2026).
-- Rate limits, a security/audit log, and admin database access that requires 2-step login (MFA).
-- Run once in Supabase → SQL Editor → New query → paste this whole file → Run. Safe to re-run.
-- Run AFTER 002_ordering_spec.sql.

-- ─────────────────────────────────────────────────────────────
-- Rate limits (shared across all Vercel server instances)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits int not null
);
alter table public.rate_limits enable row level security;

-- Counts one hit for p_key in a fixed window. Returns 0 when allowed, otherwise the
-- number of seconds until the window resets (for a "try again in…" message).
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns int language plpgsql security definer set search_path = public as $$
declare
  r public.rate_limits;
  win interval := make_interval(secs => p_window_seconds);
begin
  insert into public.rate_limits as rl (key, window_start, hits) values (left(p_key, 200), now(), 1)
  on conflict (key) do update set
    hits = case when rl.window_start < now() - win then 1 else rl.hits + 1 end,
    window_start = case when rl.window_start < now() - win then now() else rl.window_start end
  returning * into r;

  -- Occasional clean-up of stale rows.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  if r.hits > p_limit then
    return greatest(1, ceil(extract(epoch from (r.window_start + win - now())))::int);
  end if;
  return 0;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Security and audit log. Never store passwords, tokens or full card/UPI data here.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  type text not null,
  user_id uuid references public.profiles(id) on delete set null,
  ip text,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists security_events_created_idx on public.security_events (created_at desc);
create index if not exists security_events_type_idx on public.security_events (type, created_at desc);
alter table public.security_events enable row level security;

-- ─────────────────────────────────────────────────────────────
-- Admins only count as admins in the database after 2-step login (aal2).
-- A stolen admin password/email link alone can't read other customers' data.
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create or replace function public.is_rider()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'rider')
      or public.is_admin();
$$;

-- ─────────────────────────────────────────────────────────────
-- Independent review fixes
-- ─────────────────────────────────────────────────────────────

-- A box can only have one report that is open or was decided in the customer's favour,
-- so the same box can't be refunded or re-made twice.
create unique index if not exists delivery_reports_one_upheld
  on public.delivery_reports (delivery_id) where status in ('open', 'refund', 'make_up');

-- Browsers only need to read deliveries (live tracking) and rider_locations (map).
-- Everything else is read by the server, so the publishable key can't read profiles,
-- orders or company data (e.g. a company's join code or wallet) at all.
revoke select on public.profiles, public.orders, public.companies, public.company_topups, public.company_transactions from authenticated;
revoke all on public.profiles, public.orders, public.companies, public.company_topups, public.company_transactions,
  public.deliveries, public.rider_locations, public.extras, public.waitlist, public.closed_dates,
  public.delivery_reports, public.rate_limits, public.security_events from anon;

-- Server-only.
revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
grant all on public.rate_limits, public.security_events to service_role;
grant usage, select on all sequences in schema public to service_role;

-- =============================================================
-- Basket checkout. Same as supabase/migrations/004_basket.sql.
-- =============================================================
-- Garam Dibba: one checkout, several meals (e.g. an Everyday Dabba plan + a Protein Bowl).
-- Each meal stays its own order (own schedule, credits, cancellation); the orders in one
-- basket share a checkout_id and are paid with ONE Razorpay order.
-- Run once in Supabase → SQL Editor after 002 and 003. Safe to re-run.

alter table public.orders add column if not exists checkout_id uuid;
create index if not exists orders_checkout_idx on public.orders (checkout_id);

-- Several orders can now share one Razorpay order / payment.
alter table public.orders drop constraint if exists orders_razorpay_order_id_key;
alter table public.orders drop constraint if exists orders_razorpay_payment_id_key;
create index if not exists orders_razorpay_order_idx on public.orders (razorpay_order_id);
create index if not exists orders_razorpay_payment_idx on public.orders (razorpay_payment_id);
