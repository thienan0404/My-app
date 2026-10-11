-- THIENAN GROWTH 3.0 — Run in Supabase SQL Editor
-- Each signed-in user owns exactly one encrypted-in-transit (HTTPS) JSON payload.
-- Data is NOT end-to-end encrypted; Supabase operators/project admins may access it.
create table if not exists public.growth_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.growth_profiles enable row level security;

-- Only the authenticated owner may read/write their own data.
revoke all on table public.growth_profiles from anon;
grant select, insert, update, delete on public.growth_profiles to authenticated;

drop policy if exists "Read own growth data" on public.growth_profiles;
create policy "Read own growth data" on public.growth_profiles
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Insert own growth data" on public.growth_profiles;
create policy "Insert own growth data" on public.growth_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Update own growth data" on public.growth_profiles;
create policy "Update own growth data" on public.growth_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Delete own growth data" on public.growth_profiles;
create policy "Delete own growth data" on public.growth_profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Important: Do not publish service_role keys in browser code.
-- Enable Auth Email OTP/Magic Link and allow your deployed site URL in Redirect URLs.
