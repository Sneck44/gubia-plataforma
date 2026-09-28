begin;
do $test$
declare b uuid:=gen_random_uuid();p uuid:=gen_random_uuid();a uuid:=gen_random_uuid(); n integer; job uuid;
begin
 insert into public.branches(id,name,slug) values(b,'TEST MAIL','test-'||b);
 insert into public.patients(id,full_name,email) values(p,'TEST MAIL','nobody@example.invalid');
 insert into public.appointments(id,folio,patient_id,branch_id,starts_at,ends_at,status,privacy_accepted_at) values(a,'TEST-'||a,p,b,now()+interval '2 days',now()+interval '2 days 30 minutes','pending',now());
 select count(*) into n from private.notification_jobs where appointment_id=a;if n<>2 then raise exception 'QUEUE_NOT_CREATED';end if;
 update public.appointments set status='confirmed' where id=a;
 select count(*) into n from private.notification_jobs where appointment_id=a;if n<>2 then raise exception 'DUPLICATE_CONFIRMATION';end if;
 select id into job from public.claim_notification_jobs() where folio='TEST-'||a;
 if job is null or not public.notification_job_valid(job) then raise exception 'CLAIM_FAILED';end if;
 perform public.finish_notification_job(job,null);
 if (select status from private.notification_jobs where id=job)<>'queued' then raise exception 'RETRY_FAILED';end if;
 update public.appointments set status='cancelled' where id=a;
 if public.notification_job_valid(job) then raise exception 'STALE_NOTIFICATION_VALID';end if;
 if (select count(*) from private.notification_jobs where appointment_id=a and status='queued' and kind='cancelled')<>1 then raise exception 'CANCEL_NOTIFICATION_MISSING';end if;
 if has_function_privilege('authenticated','public.claim_notification_jobs()','execute') or has_table_privilege('authenticated','private.notification_jobs','SELECT') then raise exception 'QUEUE_EXPOSED';end if;
end $test$;
select 'PASS: confirmation/reminder queue, deduplication, claim, retry, stale cancellation and access denial; no email sent' as result;
rollback;
