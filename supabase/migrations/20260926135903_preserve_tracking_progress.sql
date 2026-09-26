create or replace function public.gateway_track(p_token text,p_event text,p_qr text default null,p_branch uuid default null,p_service uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.tracking_sessions%rowtype; q public.qr_codes%rowtype; token text:=p_token; campaign uuid; promo uuid;
begin
 if p_event not in ('qr_scanned','landing_viewed','service_selected','appointment_started') then raise exception 'INVALID_EVENT'; end if;
 if token ~ '^[a-f0-9]{64}$' then
 select * into s from public.tracking_sessions where anonymous_token=encode(extensions.digest(token,'sha256'),'hex') and expires_at>now() for update;
 end if;
 if p_event='qr_scanned' then
 select * into q from public.qr_codes where public.qr_codes.token=p_qr and active and not archived;
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
 update public.tracking_sessions set last_seen_at=now(),last_stage=case
 when appointment_id is not null then last_stage
 when array_position(array['qr_scanned','landing_viewed','service_selected','appointment_started'],p_event)
   > coalesce(array_position(array['qr_scanned','landing_viewed','service_selected','appointment_started'],last_stage),0)
 then p_event else last_stage end,
 branch_id=coalesce(p_branch,branch_id),service_id=coalesce(p_service,service_id) where id=s.id returning * into s;
 insert into public.tracking_events(session_id,event_type,qr_id,promo_code_id,campaign_id,branch_id,service_id,source,medium)
 values(s.id,p_event::public.tracking_event_type,coalesce(q.id,s.qr_id),coalesce(promo,s.promo_code_id),coalesce(campaign,s.campaign_id),coalesce(p_branch,s.branch_id),coalesce(p_service,s.service_id),'web',coalesce(q.channel,s.channel));
 return jsonb_build_object('token',token,'destination',coalesce(q.destination,'/agendar'),'branch_id',s.branch_id,'service_id',s.service_id);
end $$;

