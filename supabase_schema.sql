-- THIENAN GROWTH 3.0 — Run in Supabase SQL Editor
-- Each signed-in user owns exactly one encrypted-in-transit (HTTPS) JSON payload.
-- Data is NOT end-to-end encrypted; Supabase operators/project admins may access it.
create table if not exists public.growth_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Existing snapshot users keep their data. Revision enables atomic sync retries.
alter table public.growth_profiles add column if not exists revision bigint not null default 0;

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

-- A read and compare-and-swap in one transaction. The caller's identity is
-- derived from auth.uid(); invoker security keeps all owner RLS policies active.
create or replace function public.sync_growth_profile(expected_revision bigint, next_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  profile public.growth_profiles%rowtype;
  accepted boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if next_payload is not null and (jsonb_typeof(next_payload) <> 'object' or octet_length(next_payload::text) > 2097152) then
    raise exception 'Invalid or oversized sync data';
  end if;
  insert into public.growth_profiles(user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select * into profile from public.growth_profiles where user_id = auth.uid() for update;
  if next_payload is not null and profile.revision = expected_revision then
    update public.growth_profiles set payload = next_payload, revision = revision + 1, updated_at = now()
      where user_id = auth.uid() returning * into profile;
    accepted := true;
  end if;
  return jsonb_build_object('payload',profile.payload,'revision',profile.revision,'applied',accepted);
end;
$$;
revoke all on function public.sync_growth_profile(bigint,jsonb) from public, anon;
grant execute on function public.sync_growth_profile(bigint,jsonb) to authenticated;
