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
