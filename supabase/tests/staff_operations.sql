begin;
do $setup$
declare staff uuid:=gen_random_uuid(); marketer uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); svc uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); q uuid:=gen_random_uuid(); s uuid:=gen_random_uuid();
begin
 insert into auth.users(id) values(staff),(marketer);
 insert into public.profiles(id,role) values(staff,'recepcion'),(marketer,'marketing');
 insert into public.branches(id,name,slug) values(b,'TEST ONLY','test-'||b::text);
 insert into public.services(id,name,slug) values(svc,'TEST ONLY','test-'||svc::text);
 insert into public.patients(id,full_name) values(p,'TEST ONLY');
 insert into public.appointments(id,folio,patient_id,branch_id,starts_at,ends_at,status) values(a,'TEST-'||a::text,p,b,now()-interval '1 hour',now()-interval '30 minutes','confirmed');
 insert into public.appointment_services(appointment_id,service_id) values(a,svc);
 insert into public.qr_codes(id,name) values(q,'TEST ONLY');
 insert into public.tracking_sessions(id,anonymous_token,qr_id,appointment_id,last_stage) values(s,encode(extensions.gen_random_bytes(32),'hex'),q,a,'appointment_completed');
 insert into public.tracking_events(session_id,qr_id,event_type,appointment_id) values(s,q,'qr_scanned',null),(s,q,'qr_scanned',null),(s,q,'appointment_completed',a);
 perform set_config('gubia.test_staff',staff::text,true);perform set_config('gubia.test_marketer',marketer::text,true);perform set_config('gubia.test_appointment',a::text,true);perform set_config('gubia.test_qr',q::text,true);
end $setup$;
select set_config('request.jwt.claim.sub',current_setting('gubia.test_marketer'),true);
set local role authenticated;
do $test$ declare m jsonb; begin
 begin perform public.staff_appointment(current_setting('gubia.test_appointment')::uuid,'attended');raise exception 'Expected role denial';exception when others then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 m:=public.marketing_metrics(now()-interval '1 day',now()+interval '1 day',jsonb_build_object('qr_id',current_setting('gubia.test_qr')));
 if (m->>'scans')::int<>2 or (m->>'visitors')::int<>1 or (m->>'completed')::int<>1 then raise exception 'Funnel counts invalid';end if;
end $test$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('gubia.test_staff'),true);
set local role authenticated;
do $test$ begin
 perform public.staff_appointment(current_setting('gubia.test_appointment')::uuid,'attended',null,200);
 perform public.staff_appointment(current_setting('gubia.test_appointment')::uuid,'attended',null,200);
 begin perform public.staff_appointment(current_setting('gubia.test_appointment')::uuid,'cancelled');raise exception 'Expected terminal state rejection';exception when others then if sqlerrm<>'INVALID_TRANSITION' then raise;end if;end;
 begin update public.appointments set status='cancelled' where id=current_setting('gubia.test_appointment')::uuid;raise exception 'Expected direct update denial';exception when insufficient_privilege then null;end;
end $test$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('gubia.test_marketer'),true);
set local role authenticated;
do $test$ declare m jsonb; begin
 m:=public.marketing_metrics(now()-interval '1 day',now()+interval '1 day',jsonb_build_object('qr_id',current_setting('gubia.test_qr')));
 if (m->>'attended')::int<>1 or (m->>'attributed_revenue')::numeric<>200 or (m->>'conversion_rate')::numeric<>100 then raise exception 'Attendance attribution incorrect';end if;
 if exists(select 1 from public.appointments where id=current_setting('gubia.test_appointment')::uuid) then raise exception 'Clinical row leaked to marketing';end if;
 if (select count(*) from public.tracking_events where appointment_id=current_setting('gubia.test_appointment')::uuid and event_type='appointment_attended')<>1 then raise exception 'Duplicate attendance event';end if;
end $test$;
reset role;
select 'PASS: staff role authorization, terminal states, direct-write denial, attendance event idempotency, aggregate revenue and clinical privacy' as result;
rollback;
