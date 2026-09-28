begin;
do $setup$
declare staff uuid:=gen_random_uuid(); viewer uuid:=gen_random_uuid(); admin uuid:=gen_random_uuid(); b1 uuid:=gen_random_uuid(); b2 uuid:=gen_random_uuid(); p1 uuid:=gen_random_uuid(); p2 uuid:=gen_random_uuid(); a1 uuid:=gen_random_uuid(); a2 uuid:=gen_random_uuid();
begin
 insert into auth.users(id) values(staff),(viewer),(admin);
 insert into public.branches(id,name,slug) values(b1,'TEST SCOPE 1','test-'||b1),(b2,'TEST SCOPE 2','test-'||b2);
 insert into public.profiles(id,role,branch_id) values(staff,'recepcion',b1),(viewer,'consulta',b1),(admin,'administrador',null);
 insert into public.patients(id,full_name) values(p1,'TEST SCOPE PATIENT 1'),(p2,'TEST SCOPE PATIENT 2');
 insert into public.appointments(id,folio,patient_id,branch_id,starts_at,ends_at,status) values(a1,'TEST-'||a1,p1,b1,now()+interval '1 minute',now()+interval '31 minutes','pending'),(a2,'TEST-'||a2,p2,b2,now()+interval '1 minute',now()+interval '31 minutes','pending');
 perform set_config('gubia.staff',staff::text,true);perform set_config('gubia.admin',admin::text,true);perform set_config('gubia.viewer',viewer::text,true);perform set_config('gubia.a1',a1::text,true);perform set_config('gubia.a2',a2::text,true);perform set_config('gubia.b1',b1::text,true);perform set_config('gubia.b2',b2::text,true);perform set_config('gubia.p2',p2::text,true);
end $setup$;
select set_config('request.jwt.claim.sub',current_setting('gubia.staff'),true);
set local role authenticated;
do $test$ begin
 if (select count(*) from public.appointments where id in(current_setting('gubia.a1')::uuid,current_setting('gubia.a2')::uuid))<>1 then raise exception 'BRANCH_LEAK';end if;
 if exists(select 1 from public.patients where id=current_setting('gubia.p2')::uuid) then raise exception 'PATIENT_LEAK';end if;
 begin perform public.staff_appointment(current_setting('gubia.a2')::uuid,'confirmed');raise exception 'CROSS_BRANCH_WRITE';exception when others then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 begin perform public.check_in(current_setting('gubia.a2')::uuid);raise exception 'CROSS_BRANCH_CHECKIN';exception when others then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 begin perform public.staff_slots(current_setting('gubia.a2')::uuid,current_date);raise exception 'CROSS_BRANCH_SLOTS';exception when others then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 perform public.check_in(current_setting('gubia.a1')::uuid);perform public.check_in(current_setting('gubia.a1')::uuid);
 if not exists(select 1 from public.appointments where id=current_setting('gubia.a1')::uuid and checked_in_at is not null and status='confirmed') then raise exception 'CHECKIN_FAILED';end if;
end $test$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('gubia.admin'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('gubia.admin'),'aal','aal1')::text,true);
set local role authenticated;
do $test$ begin
 begin perform public.manage_profile(current_setting('gubia.staff')::uuid,'recepcion',false,current_setting('gubia.b1')::uuid);raise exception 'MFA_BYPASS';exception when others then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
end $test$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('gubia.admin'),'aal','aal2')::text,true);
set local role authenticated;
do $test$ begin
 begin perform public.manage_profile(current_setting('gubia.staff')::uuid,'administrador',true,null);raise exception 'PRIVILEGE_ESCALATION';exception when others then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 perform public.manage_profile(current_setting('gubia.staff')::uuid,'recepcion',false,current_setting('gubia.b1')::uuid);
end $test$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('gubia.staff'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('gubia.staff'),'aal','aal1')::text,true);
set local role authenticated;
do $test$ begin
 if exists(select 1 from public.appointments where id=current_setting('gubia.a1')::uuid) then raise exception 'DISABLED_ACCOUNT_ACCESS';end if;
end $test$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('gubia.viewer'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('gubia.viewer'),'aal','aal1')::text,true);
set local role authenticated;
do $test$ begin
 if exists(select 1 from public.branch_summary(now()-interval '1 day',now()+interval '1 day') where branch_id=current_setting('gubia.b2')::uuid) then raise exception 'SUMMARY_BRANCH_LEAK';end if;
end $test$;
reset role;
select 'PASS: branch isolation, patient privacy, cross-branch write/slots/check-in denial, check-in, MFA guard, privilege escalation denial, immediate disable and scoped summary' as result;
rollback;
