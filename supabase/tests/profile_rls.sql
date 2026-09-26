-- Run as postgres against a disposable database with migrations applied.
-- Fixture writes are transaction-scoped and always rolled back on success.
begin;
create temporary table security_test_users(label text,id uuid) on commit drop;
insert into security_test_users values ('superadmin',gen_random_uuid()),('marketing',gen_random_uuid()),('recepcion',gen_random_uuid()),('consulta',gen_random_uuid()),('inactive',gen_random_uuid());
insert into auth.users(id) select id from security_test_users;
insert into public.profiles(id,role,active) select id,case when label='inactive' then 'superadmin' else label end::public.app_role,label<>'inactive' from security_test_users;
insert into public.branches(id,name,slug) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','TEST ONLY','test-security-transaction');
insert into public.patients(id,full_name) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','TEST ONLY');
insert into public.appointments(id,folio,patient_id,branch_id,starts_at,ends_at) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','TEST-SECURITY-TRANSACTION','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',now()+interval '1 day',now()+interval '1 day 30 minutes');
select set_config('request.jwt.claim.sub',(select id::text from security_test_users where label='superadmin'),true);
set local role authenticated;
do $test$ begin
 if (select count(*) from public.profiles) <> 5 then raise exception 'Profile visibility failed: superadmin'; end if;
 if (select count(*) from public.appointments where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 1 then raise exception 'Appointment visibility failed: superadmin'; end if;
 if (select count(*) from public.patients where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 1 then raise exception 'Patient visibility failed: superadmin'; end if;
end $test$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from security_test_users where label='recepcion'),true);
set local role authenticated;
do $test$ begin
 if (select count(*) from public.profiles) <> 1 then raise exception 'Profile visibility failed: recepcion'; end if;
 if (select count(*) from public.appointments where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 1 then raise exception 'Appointment visibility failed: recepcion'; end if;
 if (select count(*) from public.patients where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 1 then raise exception 'Patient visibility failed: recepcion'; end if;
end $test$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from security_test_users where label='consulta'),true);
set local role authenticated;
do $test$ begin
 if (select count(*) from public.profiles) <> 1 then raise exception 'Profile visibility failed: consulta'; end if;
 if (select count(*) from public.appointments where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 1 then raise exception 'Appointment visibility failed: consulta'; end if;
 if (select count(*) from public.patients where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 1 then raise exception 'Patient visibility failed: consulta'; end if;
end $test$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from security_test_users where label='marketing'),true);
set local role authenticated;
do $test$ begin
 if (select count(*) from public.profiles) <> 1 then raise exception 'Profile visibility failed: marketing'; end if;
 if (select count(*) from public.appointments where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 0 then raise exception 'Appointment visibility failed: marketing'; end if;
 if (select count(*) from public.patients where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 0 then raise exception 'Patient visibility failed: marketing'; end if;
end $test$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from security_test_users where label='inactive'),true);
set local role authenticated;
do $test$ begin
 if (select count(*) from public.profiles) <> 1 then raise exception 'Profile visibility failed: inactive'; end if;
 if (select count(*) from public.appointments where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 0 then raise exception 'Appointment visibility failed: inactive'; end if;
 if (select count(*) from public.patients where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 0 then raise exception 'Patient visibility failed: inactive'; end if;
end $test$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role authenticated;
do $test$ begin
 if public.current_app_role() is not null then raise exception 'Missing identity granted role'; end if;
 if (select count(*) from public.profiles)<>0 then raise exception 'Missing identity can read profiles'; end if;
end $test$;
reset role;
set local role anon;
do $test$ begin
 if exists(select 1 from public.appointments) or exists(select 1 from public.patients) then raise exception 'Anonymous clinical access'; end if;

end $test$;
reset role;
do $test$ begin
 if has_function_privilege('anon','private.current_app_role()','execute') then raise exception 'Anonymous private helper access'; end if;
end $test$;
select 'PASS: 5 profile/clinical role cases, missing identity and anonymous denial; all fixtures rolled back' as result;
rollback;
