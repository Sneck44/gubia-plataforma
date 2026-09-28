create table private.notification_jobs(
 id uuid primary key default gen_random_uuid(),appointment_id uuid not null references public.appointments(id) on delete cascade,
 kind text not null check(kind in ('confirmation','reminder','cancelled')), scheduled_start timestamptz not null,
 due_at timestamptz not null,expires_at timestamptz not null,status text not null default 'queued' check(status in ('queued','processing','accepted','failed','cancelled')),
 attempts integer not null default 0,first_attempt_at timestamptz,last_attempt_at timestamptz,provider_id text,created_at timestamptz not null default now(),
 unique(appointment_id,kind,scheduled_start)
);
alter table private.notification_jobs enable row level security;
create index notification_jobs_due_idx on private.notification_jobs(status,due_at);
grant usage on schema private to service_role;
grant select,update on private.notification_jobs to service_role;
revoke all on private.notification_jobs from public,anon,authenticated;
create function private.queue_appointment_mail() returns trigger language plpgsql security definer set search_path='' as $$
declare email text;
begin
 select p.email into email from public.patients p where p.id=NEW.patient_id;
 if email is null or email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or NEW.privacy_accepted_at is null then return NEW;end if;
 if TG_OP='UPDATE' then
 if NEW.starts_at is distinct from OLD.starts_at or NEW.status in ('cancelled','attended','no_show') or NEW.checked_in_at is not null then
 update private.notification_jobs set status='cancelled' where appointment_id=NEW.id and status in ('queued','processing');
 end if;
 if NEW.status='cancelled' and OLD.status<>'cancelled' then
 insert into private.notification_jobs(appointment_id,kind,scheduled_start,due_at,expires_at) values(NEW.id,'cancelled',NEW.starts_at,now(),now()+interval '1 day') on conflict do nothing;
 end if;
 end if;
 if NEW.status in ('pending','confirmed') and NEW.starts_at>now() and NEW.checked_in_at is null then
 insert into private.notification_jobs(appointment_id,kind,scheduled_start,due_at,expires_at) values(NEW.id,'confirmation',NEW.starts_at,now(),least(NEW.starts_at,now()+interval '1 day')) on conflict do nothing;
 if NEW.starts_at>now()+interval '24 hours' then
 insert into private.notification_jobs(appointment_id,kind,scheduled_start,due_at,expires_at) values(NEW.id,'reminder',NEW.starts_at,NEW.starts_at-interval '24 hours',NEW.starts_at) on conflict do nothing;
 end if;
 end if;
 return NEW;
end $$;
revoke all on function private.queue_appointment_mail() from public,anon,authenticated;
create trigger queue_appointment_mail after insert or update on public.appointments for each row execute function private.queue_appointment_mail();

create function public.claim_notification_jobs() returns table(id uuid,kind text,recipient text,folio text,branch text,starts_at timestamptz,timezone text)
language plpgsql security invoker set search_path='' as $$
begin
 update private.notification_jobs j set status='failed' where j.status in ('queued','processing') and (j.expires_at<=now() or (j.first_attempt_at<now()-interval '23 hours') or (j.attempts>=3 and j.last_attempt_at<now()-interval '10 minutes'));
 update private.notification_jobs j set status='queued' where j.status='processing' and j.last_attempt_at<now()-interval '10 minutes' and j.attempts<3;
 return query with picked as (select j.id from private.notification_jobs j where j.status='queued' and j.due_at<=now() order by j.due_at for update skip locked limit 10),
 claimed as (update private.notification_jobs j set status='processing',attempts=j.attempts+1,first_attempt_at=coalesce(j.first_attempt_at,now()),last_attempt_at=now() where j.id in(select p.id from picked p) returning j.*)
 select c.id,c.kind,p.email,a.folio,b.name,c.scheduled_start,b.timezone from claimed c join public.appointments a on a.id=c.appointment_id join public.patients p on p.id=a.patient_id join public.branches b on b.id=a.branch_id;
end $$;
revoke all on function public.claim_notification_jobs() from public,anon,authenticated;
grant execute on function public.claim_notification_jobs() to service_role;
create function public.finish_notification_job(p_id uuid,p_provider text default null) returns void language sql security invoker set search_path='' as $$
 update private.notification_jobs set status=case when p_provider is not null then 'accepted' when attempts>=3 then 'failed' else 'queued' end,provider_id=p_provider,due_at=now()+interval '5 minutes' where id=p_id and status='processing';
$$;
revoke all on function public.finish_notification_job(uuid,text) from public,anon,authenticated;
grant execute on function public.finish_notification_job(uuid,text) to service_role;
create function public.notification_job_valid(p_id uuid) returns boolean language sql security invoker set search_path='' as $$
 select exists(select 1 from private.notification_jobs j join public.appointments a on a.id=j.appointment_id where j.id=p_id and j.status='processing' and j.expires_at>now() and a.starts_at=j.scheduled_start and ((j.kind='cancelled' and a.status='cancelled') or (j.kind<>'cancelled' and a.status in ('pending','confirmed') and a.checked_in_at is null)));
$$;
revoke all on function public.notification_job_valid(uuid) from public,anon,authenticated;
grant execute on function public.notification_job_valid(uuid) to service_role;
create function private.notification_status() returns table(id uuid,folio text,kind text,due_at timestamptz,status text,attempts integer,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if private.current_app_role() is null or private.current_app_role() not in ('superadmin','administrador') then raise exception 'FORBIDDEN';end if;
 return query select j.id,a.folio,j.kind,j.due_at,j.status,j.attempts,j.created_at from private.notification_jobs j join public.appointments a on a.id=j.appointment_id order by j.created_at desc limit 100;
end $$;
revoke all on function private.notification_status() from public,anon;
grant execute on function private.notification_status() to authenticated;
create function public.notification_status() returns table(id uuid,folio text,kind text,due_at timestamptz,status text,attempts integer,created_at timestamptz)
language sql security invoker set search_path='' as $$select * from private.notification_status()$$;
revoke all on function public.notification_status() from public,anon;
grant execute on function public.notification_status() to authenticated;
