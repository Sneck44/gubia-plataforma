-- Public traffic is mediated by an Edge Function. Privileged RPCs are service_role only.
alter table public.branches add column booking_enabled boolean not null default false;
alter table public.branches add column city text;
alter table public.branches add column state text;
alter table public.branches add column published_hours text;
alter table public.branches add column source_url text;
alter table public.branch_hours add constraint hours_order check(closes_at>opens_at);
alter table public.branch_hours add constraint hours_bounds check(slot_minutes between 5 and 480 and capacity between 1 and 100);
alter table public.services add constraint service_price_nonnegative check(price is null or price>=0);
alter table public.promo_codes add constraint promo_percentage_bound check(discount_type<>'percentage' or discount_value<=100);
alter table public.promo_codes add constraint promo_date_order check(starts_at is null or ends_at is null or ends_at>starts_at);
alter table public.promo_codes add column draft boolean not null default false;
alter table public.promo_codes add column channel text;
alter table public.campaigns add constraint campaign_date_order check(starts_at is null or ends_at is null or ends_at>starts_at);
alter table public.qr_codes alter column promo_code_id drop not null;
alter table public.qr_codes add column name text not null default 'QR';
alter table public.qr_codes add column kind text not null default 'campaign';
alter table public.qr_codes add column campaign_id uuid references public.campaigns(id);
alter table public.qr_codes add column promoter_id uuid references public.promoters(id);
alter table public.qr_codes add column branch_id uuid references public.branches(id);
alter table public.qr_codes add column service_id uuid references public.services(id);
alter table public.qr_codes add column channel text;
alter table public.qr_codes add column destination text not null default '/agendar' check(destination='/agendar');
alter table public.qr_codes add column archived boolean not null default false;
alter table public.qr_codes add column created_by uuid references auth.users(id) default auth.uid();
alter table public.tracking_sessions add column qr_id uuid references public.qr_codes(id);
alter table public.tracking_sessions add column branch_id uuid references public.branches(id);
alter table public.tracking_sessions add column service_id uuid references public.services(id);
alter table public.tracking_sessions add column channel text;
alter table public.tracking_sessions add column promoter_id uuid references public.promoters(id);
alter table public.tracking_sessions add column appointment_id uuid references public.appointments(id);
alter table public.tracking_sessions add column last_stage text not null default 'landing_viewed';
alter table public.tracking_sessions add column expires_at timestamptz not null default now()+interval '30 days';
alter table public.tracking_events add column qr_id uuid references public.qr_codes(id);
alter table public.tracking_events add column service_id uuid references public.services(id);
alter table public.appointments add column management_hash text;
alter table public.appointments add column idempotency_key uuid unique;
alter table public.appointments add column privacy_accepted_at timestamptz;
alter table public.appointments add column privacy_version text;
alter table public.appointments add column marketing_consent boolean not null default false;
alter table public.appointments add column quoted_total numeric(12,2);
alter table public.audit_logs add column result text not null default 'success';
create index on public.tracking_sessions(qr_id,first_seen_at);
create index on public.tracking_sessions(appointment_id);
create index on public.tracking_events(qr_id,occurred_at);
create index on public.tracking_events(session_id,event_type,occurred_at);

create table private.rate_limits(bucket text primary key, count integer not null, expires_at timestamptz not null);
alter table private.rate_limits enable row level security;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.rate_limits to service_role;

create or replace function public.gateway_rate_limit(p_bucket text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if length(p_bucket)>200 or p_limit not between 1 and 1000 or p_seconds not between 1 and 86400 then raise exception 'INVALID_LIMIT'; end if;
 insert into private.rate_limits(bucket,count,expires_at) values(p_bucket,1,now()+make_interval(secs=>p_seconds))
 on conflict(bucket) do update set count=case when private.rate_limits.expires_at<=now() then 1 else private.rate_limits.count+1 end,
 expires_at=case when private.rate_limits.expires_at<=now() then excluded.expires_at else private.rate_limits.expires_at end returning count into n;
 return n<=p_limit;
end $$;

create or replace function public.gateway_slots(p_branch uuid,p_service uuid,p_date date,p_exclude uuid default null)
returns table(starts_at timestamptz,ends_at timestamptz,remaining integer)
language plpgsql security invoker set search_path='' as $$
declare b public.branches%rowtype; s public.services%rowtype; h public.branch_hours%rowtype;
begin
 select * into b from public.branches where id=p_branch and active and booking_enabled;
 if not found then return; end if;
 if p_date<(now() at time zone b.timezone)::date or p_date>(now() at time zone b.timezone)::date+90 then return; end if;
 select * into s from public.services where id=p_service and active;
 if not found then return; end if;
 if not exists(select 1 from public.branch_services where branch_id=p_branch and service_id=p_service and active) then return; end if;
 select * into h from public.branch_hours where branch_id=p_branch and weekday=extract(dow from p_date)::int and active;
 if not found then return; end if;
 return query
 with slots as (
 select t as st,t+make_interval(mins=>s.duration_minutes) as en
 from generate_series((p_date+h.opens_at) at time zone b.timezone,
 ((p_date+h.closes_at) at time zone b.timezone)-make_interval(mins=>s.duration_minutes),make_interval(mins=>h.slot_minutes)) t
 ), counts as (
 select st,en,h.capacity-(select count(*)::int from public.appointments a where a.branch_id=p_branch
 and (p_exclude is null or a.id<>p_exclude) and a.status in ('pending','confirmed','attended') and a.starts_at<en and a.ends_at>st) as free
 from slots where st>now()+interval '5 minutes'
 and not exists(select 1 from public.blocked_slots x where x.branch_id=p_branch and x.starts_at<en and x.ends_at>st)
 ) select st,en,free from counts where free>0 order by st;
end $$;

create or replace function public.gateway_track(p_token text,p_event text,p_qr text default null,p_branch uuid default null,p_service uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.tracking_sessions%rowtype; q public.qr_codes%rowtype; token text:=p_token; campaign uuid; promo uuid;
begin
 if p_event not in ('qr_scanned','landing_viewed','service_selected','appointment_started') then raise exception 'INVALID_EVENT'; end if;
 if token ~ '^[a-f0-9]{64}$' then
 select * into s from public.tracking_sessions where anonymous_token=encode(extensions.digest(token,'sha256'),'hex') and expires_at>now() for update;
 end if;
 if p_event='qr_scanned' then
 select * into q from public.qr_codes where token=p_qr and active and not archived;
 if not found then raise exception 'QR_UNAVAILABLE'; end if;
 campaign:=q.campaign_id;promo:=q.promo_code_id;
 if promo is not null then select coalesce(campaign,c.campaign_id) into campaign from public.promo_codes c where id=promo; end if;
 end if;
 if s.id is null then
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.tracking_sessions(anonymous_token,qr_id,campaign_id,promo_code_id,channel,promoter_id,branch_id,service_id)
 values(encode(extensions.digest(token,'sha256'),'hex'),q.id,campaign,promo,q.channel,q.promoter_id,q.branch_id,q.service_id) returning * into s;
 end if;
 if p_branch is not null and not exists(select 1 from public.branches where id=p_branch and active and booking_enabled) then raise exception 'BRANCH_UNAVAILABLE'; end if;
 if p_service is not null and not exists(select 1 from public.services where id=p_service and active) then raise exception 'SERVICE_UNAVAILABLE'; end if;
 -- First touch attribution is retained. A later QR scan is attributed as a separate scan event.
 update public.tracking_sessions set last_seen_at=now(),last_stage=case when appointment_id is null then p_event else last_stage end,
 branch_id=coalesce(p_branch,branch_id),service_id=coalesce(p_service,service_id) where id=s.id;
 insert into public.tracking_events(session_id,event_type,qr_id,promo_code_id,campaign_id,branch_id,service_id,source,medium)
 values(s.id,p_event::public.tracking_event_type,coalesce(q.id,s.qr_id),coalesce(promo,s.promo_code_id),coalesce(campaign,s.campaign_id),coalesce(p_branch,s.branch_id),coalesce(p_service,s.service_id),'web',coalesce(q.channel,s.channel));
 return jsonb_build_object('token',token,'destination',coalesce(q.destination,'/agendar'),'branch_id',s.branch_id,'service_id',s.service_id);
end $$;

create or replace function public.gateway_book(p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 branch uuid:=(p_payload->>'branch_id')::uuid; service uuid:=(p_payload->>'service_id')::uuid;
 start_time timestamptz:=(p_payload->>'starts_at')::timestamptz; request_key uuid:=(p_payload->>'request_id')::uuid;
 management_token text:=p_payload->>'management_token'; session_token text:=p_payload->>'session_token';
 full_name text:=btrim(p_payload->>'name'); phone text:=regexp_replace(p_payload->>'phone','[^0-9+]','','g'); email text:=nullif(btrim(p_payload->>'email'),'');
 session_row public.tracking_sessions%rowtype; existing public.appointments%rowtype;
 svc public.services%rowtype; promotion public.promo_codes%rowtype; tz text; slot_end timestamptz; patient uuid; appointment uuid; v_folio text; total numeric;
begin
 if request_key is null or management_token is null or management_token !~ '^[a-f0-9]{64}$' or session_token is null or session_token !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_REQUEST'; end if;
 if full_name is null or length(full_name) not between 2 and 120 or phone is null or phone !~ '^\+?[0-9]{10,15}$' or (email is not null and (length(email)>254 or email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')) then raise exception 'INVALID_CONTACT'; end if;
 if p_payload->>'privacy_accepted'<>'true' or p_payload->>'privacy_accepted' is null then raise exception 'PRIVACY_REQUIRED'; end if;
 select * into session_row from public.tracking_sessions where anonymous_token=encode(extensions.digest(session_token,'sha256'),'hex') and expires_at>now() for update;
 if not found then raise exception 'SESSION_EXPIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('request:'||request_key::text,0));
 select * into existing from public.appointments where idempotency_key=request_key;
 if found then
 if existing.management_hash<>encode(extensions.digest(management_token,'sha256'),'hex') or session_row.appointment_id is distinct from existing.id then raise exception 'INVALID_REQUEST'; end if;
 return jsonb_build_object('appointment_id',existing.id,'folio',existing.folio,'starts_at',existing.starts_at,'quoted_total',existing.quoted_total);
 end if;
 if session_row.appointment_id is not null then raise exception 'SESSION_ALREADY_BOOKED'; end if;
 select timezone into tz from public.branches where id=branch and active and booking_enabled;
 if not found or start_time is null then raise exception 'BRANCH_UNAVAILABLE'; end if;
 -- One lock per branch serializes overlapping intervals, including different service durations.
 perform pg_advisory_xact_lock(hashtextextended('branch:'||branch::text,0));
 select x.ends_at into slot_end from public.gateway_slots(branch,service,(start_time at time zone tz)::date) x where x.starts_at=start_time;
 if slot_end is null then raise exception 'SLOT_UNAVAILABLE'; end if;
 select * into svc from public.services where id=service and active;
 total:=svc.price;
 if nullif(btrim(p_payload->>'promo_code'),'') is not null then
 select * into promotion from public.promo_codes where upper(code)=upper(btrim(p_payload->>'promo_code')) for update;
 if not found or promotion.status<>'active' or promotion.draft or (promotion.starts_at is not null and promotion.starts_at>now()) or (promotion.ends_at is not null and promotion.ends_at<=now()) or (promotion.branch_id is not null and promotion.branch_id<>branch) or (promotion.service_id is not null and promotion.service_id<>service) then raise exception 'PROMO_INVALID'; end if;
 if promotion.usage_limit is not null and (select count(*) from public.promo_redemptions where promo_code_id=promotion.id)>=promotion.usage_limit then raise exception 'PROMO_EXHAUSTED'; end if;
 if total is null then raise exception 'PRICE_REQUIRED_FOR_PROMO'; end if;
 total:=greatest(0,round(case when promotion.discount_type='percentage' then total*(1-promotion.discount_value/100) else total-promotion.discount_value end,2));
 end if;
 -- Phone possession is not proof of patient identity. Never attach to an existing person by phone alone.
 insert into public.patients(full_name,phone,email) values(full_name,phone,email) returning id into patient;
 v_folio:='GUB-'||upper(encode(extensions.gen_random_bytes(8),'hex'));
 insert into public.appointments(folio,patient_id,branch_id,starts_at,ends_at,status,origin,promo_code_id,management_hash,idempotency_key,privacy_accepted_at,privacy_version,marketing_consent,quoted_total)
 values(v_folio,patient,branch,start_time,slot_end,'pending',case when session_row.qr_id is null then 'web' else 'qr' end,promotion.id,encode(extensions.digest(management_token,'sha256'),'hex'),request_key,now(),'gubia-web-2014-review-pending',coalesce((p_payload->>'marketing_consent')::boolean,false),total) returning id into appointment;
 insert into public.appointment_services(appointment_id,service_id,price_snapshot) values(appointment,service,svc.price);
 if promotion.id is not null then insert into public.promo_redemptions(promo_code_id,appointment_id) values(promotion.id,appointment); end if;
 update public.tracking_sessions set appointment_id=appointment,last_stage='appointment_completed',last_seen_at=now(),branch_id=branch,service_id=service where id=session_row.id;
 insert into public.tracking_events(session_id,event_type,qr_id,campaign_id,promo_code_id,branch_id,service_id,appointment_id,source,medium)
 values(session_row.id,'appointment_completed',session_row.qr_id,session_row.campaign_id,coalesce(promotion.id,session_row.promo_code_id),branch,service,appointment,'web',session_row.channel);
 return jsonb_build_object('appointment_id',appointment,'folio',v_folio,'starts_at',start_time,'quoted_total',total);
end $$;

create or replace function public.gateway_lookup(p_folio text,p_token text)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('folio',a.folio,'starts_at',a.starts_at,'ends_at',a.ends_at,'status',a.status,'quoted_total',a.quoted_total,'branch',b.name,'address',b.address,'timezone',b.timezone,
 'services',(select jsonb_agg(jsonb_build_object('name',s.name,'preparation',s.preparation)) from public.appointment_services x join public.services s on s.id=x.service_id where x.appointment_id=a.id))
 from public.appointments a join public.branches b on b.id=a.branch_id
 where a.folio=p_folio and length(p_token)=64 and a.management_hash=encode(extensions.digest(p_token,'sha256'),'hex')
$$;

-- Auditing only stores identifiers and operation names, never patient contact or clinical content.
create or replace function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,result) values(auth.uid(),TG_OP,TG_TABLE_NAME,coalesce(to_jsonb(NEW)->>'id',to_jsonb(OLD)->>'id'),'success');
 if TG_OP='DELETE' then return OLD; end if; return NEW;
end $$;
revoke all on function private.audit_change() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['branches','services','branch_hours','blocked_slots','campaigns','promoters','promo_codes','qr_codes','appointments','profiles'] loop
 execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',t);
 end loop;
end $$;
revoke insert,update,delete on public.audit_logs from anon,authenticated,service_role;
revoke insert,update,delete on public.appointments,public.appointment_services from authenticated;
revoke execute on function public.book_appointment(text,text,text,uuid,uuid,timestamptz,text,text,text) from public,anon,authenticated;

-- Only the trusted gateway can run public-traffic transactions; no SECURITY DEFINER API exposed.
revoke all on function public.gateway_rate_limit(text,integer,integer),public.gateway_slots(uuid,uuid,date,uuid),public.gateway_track(text,text,text,uuid,uuid),public.gateway_book(jsonb),public.gateway_lookup(text,text) from public,anon,authenticated;
grant execute on function public.gateway_rate_limit(text,integer,integer),public.gateway_slots(uuid,uuid,date,uuid),public.gateway_track(text,text,text,uuid,uuid),public.gateway_book(jsonb),public.gateway_lookup(text,text) to service_role;

do $$ declare t text; begin
 foreach t in array array['branches','services','branch_services','branch_hours'] loop
 execute format('create policy "catalog write" on public.%I for all to authenticated using (public.current_app_role() in (''superadmin'',''administrador'')) with check (public.current_app_role() in (''superadmin'',''administrador''))',t);
 end loop;
 foreach t in array array['qr_codes','promoters'] loop
 execute format('create policy "marketing write" on public.%I for all to authenticated using (public.current_app_role() in (''superadmin'',''administrador'',''marketing'')) with check (public.current_app_role() in (''superadmin'',''administrador'',''marketing''))',t);
 end loop;
end $$;
