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

-- Server-only.
revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
grant all on public.rate_limits, public.security_events to service_role;
grant usage, select on all sequences in schema public to service_role;
