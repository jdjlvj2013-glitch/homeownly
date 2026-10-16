-- HomeOwnly: Supabase setup. Paste into Supabase Dashboard > SQL Editor and click Run.
-- Safe to re-run.

-- updated_at trigger function
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

-- 1) One row of app state per user (private)
create table if not exists public.profiles_state (
  user_id    uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.profiles_state enable row level security;

drop policy if exists "state: owner select" on public.profiles_state;
drop policy if exists "state: owner insert" on public.profiles_state;
drop policy if exists "state: owner update" on public.profiles_state;
drop policy if exists "state: owner delete" on public.profiles_state;
create policy "state: owner select" on public.profiles_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "state: owner insert" on public.profiles_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "state: owner update" on public.profiles_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "state: owner delete" on public.profiles_state for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists profiles_state_updated_at on public.profiles_state;
create trigger profiles_state_updated_at before update on public.profiles_state
  for each row execute function public.set_updated_at();

-- 2) Public read-only unit snapshots for QR labels.
-- snapshot must contain equipment info + visit dates/work/company only:
-- never owner name, address, costs or notes (the app strips these before upload).
create table if not exists public.unit_shares (
  unit_id    text primary key check (char_length(unit_id) between 6 and 64),
  owner      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  snapshot   jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists unit_shares_owner_idx on public.unit_shares(owner);
alter table public.unit_shares enable row level security;

drop policy if exists "shares: public select" on public.unit_shares;
drop policy if exists "shares: owner insert" on public.unit_shares;
drop policy if exists "shares: owner update" on public.unit_shares;
drop policy if exists "shares: owner delete" on public.unit_shares;
create policy "shares: public select" on public.unit_shares for select to anon, authenticated using (true);
create policy "shares: owner insert" on public.unit_shares for insert to authenticated with check ((select auth.uid()) = owner);
create policy "shares: owner update" on public.unit_shares for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "shares: owner delete" on public.unit_shares for delete to authenticated using ((select auth.uid()) = owner);

drop trigger if exists unit_shares_updated_at on public.unit_shares;
create trigger unit_shares_updated_at before update on public.unit_shares
  for each row execute function public.set_updated_at();

-- Grants (RLS still applies on top of these)
grant usage on schema public to anon, authenticated;
grant select on public.unit_shares to anon;
grant select, insert, update, delete on public.unit_shares to authenticated;
grant select, insert, update, delete on public.profiles_state to authenticated;
revoke all on public.profiles_state from anon;
