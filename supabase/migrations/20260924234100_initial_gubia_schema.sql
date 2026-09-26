
create extension if not exists pgcrypto;

create type public.app_role as enum ('superadmin','administrador','recepcion','marketing','consulta');
create type public.appointment_status as enum ('pending','confirmed','attended','cancelled','no_show','rescheduled');
create type public.promo_status as enum ('active','paused','expired','exhausted');
create type public.discount_type as enum ('percentage','fixed');
create type public.tracking_event_type as enum ('qr_scanned','landing_viewed','service_selected','appointment_started','appointment_completed','appointment_cancelled','appointment_attended','appointment_no_show');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text,
 role public.app_role not null default 'consulta',
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.branches (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
 address text, phone text, timezone text not null default 'America/Mexico_City',
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.services (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
 category text, description text, price numeric(12,2), preparation text,
 duration_minutes int not null default 30 check(duration_minutes > 0),
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.branch_services (
 branch_id uuid references public.branches(id) on delete cascade,
 service_id uuid references public.services(id) on delete cascade,
 active boolean not null default true, primary key(branch_id,service_id)
);
create table public.patients (
 id uuid primary key default gen_random_uuid(), full_name text not null, phone text, email text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.branch_hours (
 id uuid primary key default gen_random_uuid(), branch_id uuid not null references public.branches(id) on delete cascade,
 weekday smallint not null check(weekday between 0 and 6), opens_at time not null, closes_at time not null,
 slot_minutes int not null default 30 check(slot_minutes > 0), capacity int not null default 1 check(capacity > 0),
 active boolean not null default true, unique(branch_id,weekday)
);
create table public.blocked_slots (
 id uuid primary key default gen_random_uuid(), branch_id uuid not null references public.branches(id) on delete cascade,
 starts_at timestamptz not null, ends_at timestamptz not null, reason text, created_by uuid references auth.users(id),
 check(ends_at > starts_at)
);
create table public.campaigns (
 id uuid primary key default gen_random_uuid(), name text not null, description text,
 starts_at timestamptz, ends_at timestamptz, active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.promoters (
 id uuid primary key default gen_random_uuid(), name text not null, email text, phone text, active boolean not null default true
);
create table public.promo_codes (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, description text,
 discount_type public.discount_type not null, discount_value numeric(12,2) not null check(discount_value >= 0),
 starts_at timestamptz, ends_at timestamptz, branch_id uuid references public.branches(id),
 service_id uuid references public.services(id), campaign_id uuid references public.campaigns(id),
 promoter_id uuid references public.promoters(id), usage_limit int check(usage_limit is null or usage_limit > 0),
 status public.promo_status not null default 'active', created_at timestamptz not null default now()
);
create table public.appointments (
 id uuid primary key default gen_random_uuid(), folio text not null unique,
 patient_id uuid not null references public.patients(id), branch_id uuid not null references public.branches(id),
 starts_at timestamptz not null, ends_at timestamptz not null, status public.appointment_status not null default 'pending',
 origin text not null default 'web', promo_code_id uuid references public.promo_codes(id),
 notes text, attributed_revenue numeric(12,2), created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(ends_at > starts_at)
);
create table public.appointment_services (
 appointment_id uuid references public.appointments(id) on delete cascade,
 service_id uuid references public.services(id), price_snapshot numeric(12,2), primary key(appointment_id,service_id)
);
create table public.qr_codes (
 id uuid primary key default gen_random_uuid(), promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
 token text not null unique default encode(gen_random_bytes(16),'hex'), active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.tracking_sessions (
 id uuid primary key default gen_random_uuid(), anonymous_token text not null unique,
 promo_code_id uuid references public.promo_codes(id), campaign_id uuid references public.campaigns(id),
 first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now()
);
create table public.tracking_events (
 id bigint generated always as identity primary key, session_id uuid references public.tracking_sessions(id) on delete set null,
 event_type public.tracking_event_type not null, promo_code_id uuid references public.promo_codes(id),
 campaign_id uuid references public.campaigns(id), branch_id uuid references public.branches(id),
 appointment_id uuid references public.appointments(id), source text, medium text, occurred_at timestamptz not null default now()
);
create table public.promo_redemptions (
 id uuid primary key default gen_random_uuid(), promo_code_id uuid not null references public.promo_codes(id),
 appointment_id uuid not null unique references public.appointments(id) on delete cascade,
 redeemed_at timestamptz not null default now()
);
create table public.audit_logs (
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id),
 action text not null, entity_type text not null, entity_id text, created_at timestamptz not null default now()
);

create index idx_appointments_branch_start on public.appointments(branch_id,starts_at);
create index idx_appointments_patient on public.appointments(patient_id);
create index idx_tracking_events_time on public.tracking_events(occurred_at);
create index idx_tracking_events_promo on public.tracking_events(promo_code_id,event_type);
create index idx_promo_campaign on public.promo_codes(campaign_id);

alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.services enable row level security;
alter table public.branch_services enable row level security;
alter table public.patients enable row level security;
alter table public.branch_hours enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.campaigns enable row level security;
alter table public.promoters enable row level security;
alter table public.promo_codes enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;
alter table public.qr_codes enable row level security;
alter table public.tracking_sessions enable row level security;
alter table public.tracking_events enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_app_role() returns public.app_role language sql stable security invoker set search_path='' as $$
 select role from public.profiles where id=(select auth.uid()) and active=true
$$;
create policy "staff read branches" on public.branches for select to authenticated using (public.current_app_role() is not null);
create policy "staff read services" on public.services for select to authenticated using (public.current_app_role() is not null);
create policy "staff read patients" on public.patients for select to authenticated using (public.current_app_role() in ('superadmin','administrador','recepcion','consulta'));
create policy "staff manage appointments" on public.appointments for all to authenticated
 using (public.current_app_role() in ('superadmin','administrador','recepcion'))
 with check (public.current_app_role() in ('superadmin','administrador','recepcion'));
create policy "staff read appointments" on public.appointments for select to authenticated using (public.current_app_role() is not null);
create policy "marketing read promos" on public.promo_codes for select to authenticated using (public.current_app_role() in ('superadmin','administrador','marketing','consulta'));
create policy "marketing manage promos" on public.promo_codes for all to authenticated
 using (public.current_app_role() in ('superadmin','administrador','marketing'))
 with check (public.current_app_role() in ('superadmin','administrador','marketing'));
create policy "admins read profiles" on public.profiles for select to authenticated using (id=(select auth.uid()) or public.current_app_role() in ('superadmin','administrador'));

grant usage on schema public to authenticated;
grant select,insert,update,delete on public.branches,public.services,public.branch_services,public.patients,public.branch_hours,public.blocked_slots,public.campaigns,public.promoters,public.promo_codes,public.appointments,public.appointment_services,public.qr_codes,public.tracking_sessions,public.tracking_events,public.promo_redemptions to authenticated;
grant select on public.profiles,public.audit_logs to authenticated;
grant usage,select on all sequences in schema public to authenticated;

