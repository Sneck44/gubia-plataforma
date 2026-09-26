begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.current_app_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $function$
 select p.role from public.profiles p
 where (select auth.uid()) is not null
 and p.id = (select auth.uid()) and p.active = true
$function$;
revoke all on function private.current_app_role() from public, anon;
grant execute on function private.current_app_role() to authenticated;
create or replace function public.current_app_role()
returns public.app_role
language sql stable security invoker set search_path = ''
as $function$ select private.current_app_role() $function$;
revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;
alter policy "staff read appointments" on public.appointments
using (public.current_app_role() in ('superadmin','administrador','recepcion','consulta'));
alter policy "staff read appointment services" on public.appointment_services
using (public.current_app_role() in ('superadmin','administrador','recepcion','consulta'));
commit;
