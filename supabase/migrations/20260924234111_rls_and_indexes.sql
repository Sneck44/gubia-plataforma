
create policy "staff read branch services" on public.branch_services for select to authenticated using (public.current_app_role() is not null);
create policy "staff read branch hours" on public.branch_hours for select to authenticated using (public.current_app_role() is not null);
create policy "staff manage blocked slots" on public.blocked_slots for all to authenticated using (public.current_app_role() in ('superadmin','administrador','recepcion')) with check (public.current_app_role() in ('superadmin','administrador','recepcion'));
create policy "staff read appointment services" on public.appointment_services for select to authenticated using (public.current_app_role() is not null);
create policy "marketing read campaigns" on public.campaigns for select to authenticated using (public.current_app_role() in ('superadmin','administrador','marketing','consulta'));
create policy "marketing read promoters" on public.promoters for select to authenticated using (public.current_app_role() in ('superadmin','administrador','marketing','consulta'));
create policy "marketing read qr" on public.qr_codes for select to authenticated using (public.current_app_role() in ('superadmin','administrador','marketing','consulta'));
create policy "analytics read sessions" on public.tracking_sessions for select to authenticated using (public.current_app_role() in ('superadmin','administrador','marketing','consulta'));
create policy "analytics read events" on public.tracking_events for select to authenticated using (public.current_app_role() in ('superadmin','administrador','marketing','consulta'));
create policy "staff read redemptions" on public.promo_redemptions for select to authenticated using (public.current_app_role() in ('superadmin','administrador','marketing','consulta'));
create policy "admins read audit" on public.audit_logs for select to authenticated using (public.current_app_role() in ('superadmin','administrador'));

create index idx_appointment_services_service on public.appointment_services(service_id);
create index idx_appointments_created_by on public.appointments(created_by);
create index idx_appointments_promo on public.appointments(promo_code_id);
create index idx_audit_actor on public.audit_logs(actor_id);
create index idx_blocked_branch on public.blocked_slots(branch_id);
create index idx_blocked_creator on public.blocked_slots(created_by);
create index idx_branch_services_service on public.branch_services(service_id);
create index idx_promo_branch on public.promo_codes(branch_id);
create index idx_promo_promoter on public.promo_codes(promoter_id);
create index idx_promo_service on public.promo_codes(service_id);
create index idx_redemption_promo on public.promo_redemptions(promo_code_id);
create index idx_qr_promo on public.qr_codes(promo_code_id);
create index idx_event_appointment on public.tracking_events(appointment_id);
create index idx_event_branch on public.tracking_events(branch_id);
create index idx_event_campaign on public.tracking_events(campaign_id);
create index idx_event_session on public.tracking_events(session_id);
create index idx_session_campaign on public.tracking_sessions(campaign_id);
create index idx_session_promo on public.tracking_sessions(promo_code_id);

