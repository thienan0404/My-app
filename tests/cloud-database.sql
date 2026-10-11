begin;
do $$
begin
  if not (select relrowsecurity from pg_class where oid='public.growth_profiles'::regclass) then raise exception 'RLS disabled'; end if;
  if has_function_privilege('anon','public.sync_growth_profile(bigint,jsonb)','execute') then raise exception 'Anonymous RPC access'; end if;
  if has_table_privilege('anon','public.growth_profiles','select') then raise exception 'Anonymous table access'; end if;
end $$;
-- Temporary identities and data are discarded by ROLLBACK.
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
set local role authenticated;
do $$
declare response jsonb;
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
  response:=public.sync_growth_profile(null,null);
  if (response->>'revision')::bigint<>0 then raise exception 'Initial revision'; end if;
  response:=public.sync_growth_profile(0,'{"completed":{"gym":true}}'::jsonb);
  if not (response->>'applied')::boolean then raise exception 'Write failed'; end if;
  response:=public.sync_growth_profile(0,'{"completed":{"code":true}}'::jsonb);
  if (response->>'applied')::boolean then raise exception 'Stale write accepted'; end if;
  if response->'payload'->'completed'->>'gym'<>'true' then raise exception 'Existing data overwritten'; end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
  if exists(select 1 from public.growth_profiles) then raise exception 'Other user data visible'; end if;
  response:=public.sync_growth_profile(null,null);
  if response->'payload'<>'{}'::jsonb then raise exception 'Account isolation failed'; end if;
  update public.growth_profiles set payload='{"bad":true}'::jsonb where user_id='00000000-0000-4000-8000-000000000001';
  if found then raise exception 'Other account can modify data'; end if;
end $$;
rollback;
select 'PASS: RLS isolation, anonymous access denied, atomic sync, stale-write rejection; fixtures rolled back' as verification;
