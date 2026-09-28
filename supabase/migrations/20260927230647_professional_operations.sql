alter table public.profiles add column if not exists branch_id uuid references public.branches(id);
alter table public.appointments add column if not exists checked_in_at timestamptz;
create index if not exists profiles_branch_idx on public.profiles(branch_id);
create index if not exists appointments_branch_start_idx on public.appointments(branch_id,starts_at);

-- Once a user enrolls MFA, an AAL1 session has no business-data permissions.
create or replace function private.current_app_role() returns public.app_role
language sql stable security definer set search_path='' as $$
 select p.role from public.profiles p where p.id=auth.uid() and p.active
 and (not exists(select 1 from auth.mfa_factors f where f.user_id=p.id and f.status='verified') or auth.jwt()->>'aal'='aal2')
$$;
create or replace function private.branch_allowed(p_branch uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(private.current_app_role() in ('superadmin','administrador','marketing') or
 (private.current_app_role() in ('recepcion','consulta') and exists(select 1 from public.profiles p where p.id=auth.uid() and p.branch_id=p_branch)),false)
$$;
revoke all on function private.branch_allowed(uuid) from public,anon;
grant execute on function private.branch_allowed(uuid) to authenticated;
drop policy if exists "staff manage appointments" on public.appointments;
alter policy "staff read appointments" on public.appointments using
 (private.current_app_role() in ('superadmin','administrador','recepcion','consulta') and private.branch_allowed(branch_id));
alter policy "staff read appointment services" on public.appointment_services using
 (exists(select 1 from public.appointments a where a.id=appointment_id));
alter policy "staff read patients" on public.patients using
 (private.current_app_role() in ('superadmin','administrador') or
 (private.current_app_role() in ('recepcion','consulta') and exists(select 1 from public.appointments a where a.patient_id=patients.id)));
alter policy "analytics read sessions" on public.tracking_sessions using
 (private.current_app_role() in ('superadmin','administrador','marketing','consulta') and private.branch_allowed(branch_id));
alter policy "analytics read events" on public.tracking_events using
 (private.current_app_role() in ('superadmin','administrador','marketing','consulta') and private.branch_allowed(branch_id));

create or replace function private.manage_profile(p_id uuid,p_role public.app_role,p_active boolean,p_branch uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare actor public.app_role; target public.profiles%rowtype;
begin
 actor:=private.current_app_role();
 if auth.uid() is null or actor is null or actor not in ('superadmin','administrador') or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'FORBIDDEN';end if;
 if p_id=auth.uid() then raise exception 'SELF_CHANGE_NOT_ALLOWED';end if;
 select * into target from public.profiles where id=p_id for update;
 if not found then raise exception 'NOT_FOUND';end if;
 if p_role is null or p_active is null or p_role='superadmin' or target.role='superadmin' then raise exception 'FORBIDDEN';end if;
 if actor='administrador' and (target.role='administrador' or p_role='administrador') then raise exception 'FORBIDDEN';end if;
 if p_role in ('recepcion','consulta') and (p_branch is null or not exists(select 1 from public.branches where id=p_branch and active)) then raise exception 'BRANCH_REQUIRED';end if;
 update public.profiles set role=p_role,active=p_active,branch_id=case when p_role in ('recepcion','consulta') then p_branch else null end,updated_at=now() where id=p_id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'staff_access_updated','profiles',p_id::text);
end $$;
revoke all on function private.manage_profile(uuid,public.app_role,boolean,uuid) from public,anon;
grant execute on function private.manage_profile(uuid,public.app_role,boolean,uuid) to authenticated;
create or replace function public.manage_profile(p_id uuid,p_role public.app_role,p_active boolean,p_branch uuid default null)
returns void language sql security invoker set search_path='' as $$select private.manage_profile(p_id,p_role,p_active,p_branch)$$;
revoke all on function public.manage_profile(uuid,public.app_role,boolean,uuid) from public,anon;
grant execute on function public.manage_profile(uuid,public.app_role,boolean,uuid) to authenticated;

create or replace function private.check_in(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.appointments%rowtype; tz text;
begin
 if private.current_app_role() is null or private.current_app_role() not in ('superadmin','administrador','recepcion') then raise exception 'FORBIDDEN';end if;
 select * into a from public.appointments where id=p_id for update;
 if not found or not private.branch_allowed(a.branch_id) then raise exception 'FORBIDDEN';end if;
 if a.status not in ('pending','confirmed') then raise exception 'INVALID_TRANSITION';end if;
 select timezone into tz from public.branches where id=a.branch_id;
 if (a.starts_at at time zone tz)::date<>(now() at time zone tz)::date then raise exception 'NOT_TODAY';end if;
 update public.appointments set checked_in_at=coalesce(checked_in_at,now()),status='confirmed' where id=a.id;
end $$;
revoke all on function private.check_in(uuid) from public,anon;
grant execute on function private.check_in(uuid) to authenticated;
create or replace function public.check_in(p_id uuid) returns void language sql security invoker set search_path='' as $$select private.check_in(p_id)$$;
revoke all on function public.check_in(uuid) from public,anon;
grant execute on function public.check_in(uuid) to authenticated;

create or replace function private.staff_slots(p_id uuid,p_date date)
returns table(starts_at timestamptz,ends_at timestamptz,remaining integer)
language plpgsql security definer set search_path='' as $$
declare a public.appointments%rowtype; svc uuid;
begin
 if private.current_app_role() is null or private.current_app_role() not in ('superadmin','administrador','recepcion') then raise exception 'FORBIDDEN';end if;
 select * into a from public.appointments where id=p_id;
 if not found or not private.branch_allowed(a.branch_id) then raise exception 'FORBIDDEN';end if;
 if a.status not in ('pending','confirmed') then raise exception 'INVALID_TRANSITION';end if;
 select service_id into svc from public.appointment_services where appointment_id=a.id;
 return query select * from public.gateway_slots(a.branch_id,svc,p_date,a.id);
end $$;
revoke all on function private.staff_slots(uuid,date) from public,anon;
grant execute on function private.staff_slots(uuid,date) to authenticated;
create or replace function public.staff_slots(p_id uuid,p_date date)
returns table(starts_at timestamptz,ends_at timestamptz,remaining integer)
language sql security invoker set search_path='' as $$select * from private.staff_slots(p_id,p_date)$$;
revoke all on function public.staff_slots(uuid,date) from public,anon;
grant execute on function public.staff_slots(uuid,date) to authenticated;

create or replace function private.staff_appointment(p_id uuid,p_status text default null,p_starts_at timestamptz default null,p_revenue numeric default null)
returns void language plpgsql security definer set search_path='' as $$
declare a public.appointments%rowtype; svc uuid; slot_end timestamptz; tz text; event public.tracking_event_type; s public.tracking_sessions%rowtype;
begin
 if auth.uid() is null or private.current_app_role() not in ('superadmin','administrador','recepcion') or private.current_app_role() is null then raise exception 'FORBIDDEN';end if;
 select * into a from public.appointments where id=p_id for update;
 if not found then raise exception 'NOT_FOUND';end if;
 if not private.branch_allowed(a.branch_id) then raise exception 'FORBIDDEN';end if;
 if p_revenue is not null and (p_revenue<0 or p_revenue>10000000) then raise exception 'INVALID_REVENUE';end if;
 if p_starts_at is not null then
 if a.status not in ('pending','confirmed') then raise exception 'INVALID_TRANSITION';end if;
 select timezone into tz from public.branches where id=a.branch_id;
 select service_id into svc from public.appointment_services where appointment_id=a.id;
 perform pg_advisory_xact_lock(hashtextextended('branch:'||a.branch_id::text,0));
 select ends_at into slot_end from public.gateway_slots(a.branch_id,svc,(p_starts_at at time zone tz)::date,a.id) where starts_at=p_starts_at;
 if slot_end is null then raise exception 'SLOT_UNAVAILABLE';end if;
 update public.appointments set starts_at=p_starts_at,ends_at=slot_end,status='pending',checked_in_at=null,updated_at=now() where id=a.id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'appointment_rescheduled','appointments',a.id::text);
 return;
 end if;
 if p_status not in ('confirmed','attended','cancelled','no_show') or p_status is null then raise exception 'INVALID_TRANSITION';end if;
 if a.status not in ('pending','confirmed') and not (a.status='attended' and p_status='attended') then raise exception 'INVALID_TRANSITION';end if;
 if p_status in ('attended','no_show') and a.starts_at>now() then raise exception 'APPOINTMENT_IN_FUTURE';end if;
 if p_revenue is not null and p_status<>'attended' then raise exception 'INVALID_REVENUE';end if;
 update public.appointments set status=p_status::public.appointment_status,attributed_revenue=coalesce(p_revenue,attributed_revenue),updated_at=now() where id=a.id;
 if a.status::text=p_status then return;end if;
 event:=case p_status when 'attended' then 'appointment_attended'::public.tracking_event_type when 'cancelled' then 'appointment_cancelled'::public.tracking_event_type when 'no_show' then 'appointment_no_show'::public.tracking_event_type else null end;
 if event is not null then
 for s in select * from public.tracking_sessions where appointment_id=a.id loop
 insert into public.tracking_events(session_id,event_type,qr_id,campaign_id,promo_code_id,branch_id,service_id,appointment_id,source,medium)
 values(s.id,event,s.qr_id,s.campaign_id,a.promo_code_id,a.branch_id,s.service_id,a.id,'staff',s.channel);
 update public.tracking_sessions set last_stage=event::text,last_seen_at=now() where id=s.id;
 end loop;
 end if;
end $$;
revoke all on function private.staff_appointment(uuid,text,timestamptz,numeric) from public,anon;
grant execute on function private.staff_appointment(uuid,text,timestamptz,numeric) to authenticated;
create or replace function public.staff_appointment(p_id uuid,p_status text default null,p_starts_at timestamptz default null,p_revenue numeric default null)
returns void language sql security invoker set search_path='' as $$select private.staff_appointment(p_id,p_status,p_starts_at,p_revenue)$$;
revoke all on function public.staff_appointment(uuid,text,timestamptz,numeric) from public,anon;
grant execute on function public.staff_appointment(uuid,text,timestamptz,numeric) to authenticated;

create or replace function private.marketing_metrics(p_from timestamptz,p_to timestamptz,p_filters jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or private.current_app_role() not in ('superadmin','administrador','marketing','consulta') or private.current_app_role() is null then raise exception 'FORBIDDEN';end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '366 days' then raise exception 'INVALID_RANGE';end if;
 with cohort as (
 select s.* from public.tracking_sessions s where private.branch_allowed(s.branch_id) and s.first_seen_at>=p_from and s.first_seen_at<p_to
 and (nullif(p_filters->>'branch_id','') is null or s.branch_id=(p_filters->>'branch_id')::uuid)
 and (nullif(p_filters->>'campaign_id','') is null or s.campaign_id=(p_filters->>'campaign_id')::uuid)
 and (nullif(p_filters->>'qr_id','') is null or s.qr_id=(p_filters->>'qr_id')::uuid)
 and (nullif(p_filters->>'promoter_id','') is null or s.promoter_id=(p_filters->>'promoter_id')::uuid)
 and (nullif(p_filters->>'service_id','') is null or s.service_id=(p_filters->>'service_id')::uuid)
 and (nullif(p_filters->>'channel','') is null or s.channel=p_filters->>'channel')
 ), ev as (select e.* from public.tracking_events e join cohort c on c.id=e.session_id ),
 totals as (select count(*) as visitors,count(*) filter(where appointment_id is not null) as converted,
 count(*) filter(where appointment_id is null and last_seen_at<now()-interval '30 minutes' and last_stage='appointment_started') as abandoned from cohort),
 counts as (select count(*) filter(where event_type='qr_scanned') as scans,count(distinct session_id) filter(where event_type='qr_scanned') as scanned_visitors,
 count(distinct session_id) filter(where event_type='landing_viewed') as landing,count(distinct session_id) filter(where event_type='service_selected') as selected,
 count(distinct session_id) filter(where event_type='appointment_started') as started,
 count(distinct session_id) filter(where event_type='appointment_completed') as completed,
 count(distinct session_id) filter(where event_type='appointment_attended') as attended,
 count(distinct session_id) filter(where event_type='appointment_cancelled') as cancelled,
 count(distinct session_id) filter(where event_type='appointment_no_show') as no_show from ev)
 select to_jsonb(counts)||to_jsonb(totals)||jsonb_build_object('attributed_revenue',(select coalesce(sum(a.attributed_revenue),0) from public.appointments a where a.status='attended' and a.id in(select appointment_id from cohort where qr_id is not null)),
 'conversion_rate',case when totals.visitors=0 then 0 else round(100.0*counts.completed/totals.visitors,2) end) into result from counts,totals;
 return result;
end $$;
revoke all on function private.marketing_metrics(timestamptz,timestamptz,jsonb) from public,anon;
grant execute on function private.marketing_metrics(timestamptz,timestamptz,jsonb) to authenticated;
create or replace function public.marketing_metrics(p_from timestamptz,p_to timestamptz,p_filters jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$select private.marketing_metrics(p_from,p_to,p_filters)$$;
revoke all on function public.marketing_metrics(timestamptz,timestamptz,jsonb) from public,anon;
grant execute on function public.marketing_metrics(timestamptz,timestamptz,jsonb) to authenticated;

create or replace function private.branch_summary(p_from timestamptz,p_to timestamptz)
returns table(branch_id uuid,branch text,appointments bigint,attended bigint,cancelled bigint,no_show bigint,revenue numeric)
language plpgsql stable security definer set search_path='' as $$
begin
 if private.current_app_role() is null or private.current_app_role() not in ('superadmin','administrador','marketing','consulta') then raise exception 'FORBIDDEN';end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '366 days' then raise exception 'INVALID_RANGE';end if;
 return query select b.id,b.name,count(a.id),count(a.id) filter(where a.status='attended'),count(a.id) filter(where a.status='cancelled'),count(a.id) filter(where a.status='no_show'),coalesce(sum(a.attributed_revenue) filter(where a.status='attended'),0)
 from public.branches b left join public.appointments a on a.branch_id=b.id and a.starts_at>=p_from and a.starts_at<p_to
 where private.branch_allowed(b.id) group by b.id,b.name order by count(a.id) desc,b.name;
end $$;
revoke all on function private.branch_summary(timestamptz,timestamptz) from public,anon;
grant execute on function private.branch_summary(timestamptz,timestamptz) to authenticated;
create or replace function public.branch_summary(p_from timestamptz,p_to timestamptz)
returns table(branch_id uuid,branch text,appointments bigint,attended bigint,cancelled bigint,no_show bigint,revenue numeric)
language sql security invoker set search_path='' as $$select * from private.branch_summary(p_from,p_to)$$;
revoke all on function public.branch_summary(timestamptz,timestamptz) from public,anon;
grant execute on function public.branch_summary(timestamptz,timestamptz) to authenticated;

-- Patient cancellation is authorized by the existing unguessable management token.
create or replace function public.gateway_cancel(p_folio text,p_token text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare a public.appointments%rowtype; s public.tracking_sessions%rowtype;
begin
 if p_token is null or p_token!~'^[a-f0-9]{64}$' then raise exception 'NOT_FOUND';end if;
 select * into a from public.appointments where folio=p_folio and management_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if not found then raise exception 'NOT_FOUND';end if;
 if a.status='cancelled' then return true;end if;
 if a.status not in ('pending','confirmed') or a.starts_at<=now() or a.checked_in_at is not null then raise exception 'CONTACT_BRANCH';end if;
 update public.appointments set status='cancelled',updated_at=now() where id=a.id;
 for s in select * from public.tracking_sessions where appointment_id=a.id loop
 insert into public.tracking_events(session_id,event_type,qr_id,campaign_id,promo_code_id,branch_id,service_id,appointment_id,source,medium)
 values(s.id,'appointment_cancelled',s.qr_id,s.campaign_id,a.promo_code_id,a.branch_id,s.service_id,a.id,'patient',s.channel);
 update public.tracking_sessions set last_stage='appointment_cancelled',last_seen_at=now() where id=s.id;
 end loop;
 return true;
end $$;
revoke all on function public.gateway_cancel(text,text) from public,anon,authenticated;
grant execute on function public.gateway_cancel(text,text) to service_role;
