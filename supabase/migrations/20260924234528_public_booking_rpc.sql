
create or replace function public.book_appointment(
 p_full_name text,p_phone text,p_email text,p_branch_id uuid,p_service_id uuid,p_starts_at timestamptz,p_promo_code text default null,p_notes text default null,p_source text default 'web'
) returns table(appointment_id uuid, folio text) language plpgsql security definer set search_path=public,pg_temp as $$
declare v_service public.services%rowtype; v_hours public.branch_hours%rowtype; v_patient uuid; v_end timestamptz; v_count int; v_folio text; v_appt uuid; v_promo uuid;
begin
 if coalesce(trim(p_full_name),'')='' or coalesce(trim(p_phone),'')='' then raise exception 'Nombre y teléfono son obligatorios'; end if;
 select * into v_service from public.services where id=p_service_id and active=true; if not found then raise exception 'Servicio no disponible'; end if;
 if not exists(select 1 from public.branch_services where branch_id=p_branch_id and service_id=p_service_id and active=true) then raise exception 'Servicio no disponible en sucursal'; end if;
 select * into v_hours from public.branch_hours where branch_id=p_branch_id and weekday=extract(dow from p_starts_at at time zone 'America/Mexico_City')::int and active=true;
 if not found then raise exception 'Sucursal cerrada'; end if;
 if (p_starts_at at time zone 'America/Mexico_City')::time < v_hours.opens_at or (p_starts_at at time zone 'America/Mexico_City')::time >= v_hours.closes_at then raise exception 'Horario no disponible'; end if;
 v_end:=p_starts_at+make_interval(mins=>v_service.duration_minutes);
 if exists(select 1 from public.blocked_slots where branch_id=p_branch_id and starts_at<v_end and ends_at>p_starts_at) then raise exception 'Horario bloqueado'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_branch_id::text||date(p_starts_at at time zone 'America/Mexico_City')::text,0));
 select count(*) into v_count from public.appointments where branch_id=p_branch_id and status in ('pending','confirmed','attended') and starts_at<v_end and ends_at>p_starts_at;
 if v_count>=v_hours.capacity then raise exception 'Horario sin capacidad'; end if;
 if p_promo_code is not null and trim(p_promo_code)<>'' then
   select id into v_promo from public.promo_codes where upper(code)=upper(trim(p_promo_code)) and status='active' and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()) and (branch_id is null or branch_id=p_branch_id) and (service_id is null or service_id=p_service_id);
   if v_promo is null then raise exception 'Código promocional no válido'; end if;
 end if;
 select id into v_patient from public.patients where phone=p_phone order by created_at limit 1;
 if v_patient is null then insert into public.patients(full_name,phone,email) values(trim(p_full_name),trim(p_phone),nullif(trim(p_email),'')) returning id into v_patient; end if;
 v_folio:='GUB-'||to_char(now(),'YYMMDD')||'-'||upper(substr(encode(gen_random_bytes(4),'hex'),1,6));
 insert into public.appointments(folio,patient_id,branch_id,starts_at,ends_at,status,origin,promo_code_id,notes) values(v_folio,v_patient,p_branch_id,p_starts_at,v_end,'confirmed',p_source,v_promo,p_notes) returning id into v_appt;
 insert into public.appointment_services(appointment_id,service_id,price_snapshot) values(v_appt,p_service_id,v_service.price);
 if v_promo is not null then insert into public.promo_redemptions(promo_code_id,appointment_id) values(v_promo,v_appt); end if;
 return query select v_appt,v_folio;
end $$;
revoke all on function public.book_appointment(text,text,text,uuid,uuid,timestamptz,text,text,text) from public;
grant execute on function public.book_appointment(text,text,text,uuid,uuid,timestamptz,text,text,text) to anon,authenticated;

create policy "public active branches" on public.branches for select to anon using(active=true);
create policy "public active services" on public.services for select to anon using(active=true);
create policy "public active branch services" on public.branch_services for select to anon using(active=true);
create policy "public active hours" on public.branch_hours for select to anon using(active=true);
grant select on public.branches,public.services,public.branch_services,public.branch_hours to anon;

