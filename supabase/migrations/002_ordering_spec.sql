-- Garam Dibba: Website Ordering Spec (Nov 2026).
-- Lunch + dinner slots, delivery fees, add-ons, allergies and preferences, delivery handoff,
-- meal credits (skip / pause / make-up), delivery proof, missing-box reports, waitlist, closed dates.
--
-- Run once in Supabase → SQL Editor → New query → paste this whole file → Run.
-- Safe to re-run. (A fresh project runs supabase/schema.sql, which already includes this.)

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
         refund_due = case when o.payment_method = 'online' and refund > 0 then refund else null end
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
