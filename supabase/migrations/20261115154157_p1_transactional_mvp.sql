-- P1 only. No outbound messages, no public portal.
create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
DO $$ begin if not exists(select 1 from pg_roles where rolname='comanda_executor') then create role comanda_executor nologin noinherit; end if; end $$;
grant comanda_executor to postgres;
-- Inherit only the base authenticated schema/API privileges; no service_role or BYPASSRLS.
grant authenticated to comanda_executor with inherit true;
grant usage on schema public, private, auth, extensions to comanda_executor;
grant create on schema public, private to comanda_executor;
grant select (id,email) on auth.users to comanda_executor;
grant execute on function auth.uid() to comanda_executor;
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique check(slug ~ '^[a-z0-9-]+$'),
 timezone text not null default 'Europe/Rome', currency char(3) not null default 'EUR' check(currency='EUR'),
 settings jsonb not null default '{}' check(jsonb_typeof(settings)='object'), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (user_id uuid primary key references auth.users, display_name text not null, locale text not null default 'it', avatar_path text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.organization_memberships (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 user_id uuid not null references auth.users, status text not null default 'invited' check(status in ('active','suspended','invited')),
 unique(organization_id,id),
 unique(organization_id,user_id)
);

create table public.membership_roles (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 membership_id uuid not null, role text not null check(role in ('owner','admin','manager','staff','partner','customer')),
 unique(organization_id,id),
 foreign key(organization_id,membership_id) references public.organization_memberships(organization_id,id),
 unique(organization_id,membership_id,role)
);

create table public.locations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 name text not null, address text not null default '', timezone text not null default 'Europe/Rome', meeting_instructions text, active boolean not null default true,
 unique(organization_id,id)
);

create table public.resources (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 location_id uuid not null, name text not null, kind text not null check(kind in ('kitchen','room','vehicle')), capacity integer not null check(capacity>0), active boolean not null default true,
 unique(organization_id,id),
 foreign key(organization_id,location_id) references public.locations(organization_id,id)
);

create table public.experiences (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 name text not null, description text not null default '', kind text not null default 'class', duration_minutes integer not null check(duration_minutes>0), default_capacity integer not null check(default_capacity>0), booking_mode text not null check(booking_mode in ('shared','private')), language_codes text[] not null default '{it}', color text not null default '#fbbf24', active boolean not null default true,
 unique(organization_id,id)
);

create table public.experience_staff_requirements (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 experience_id uuid not null, operational_role text not null, required_count integer not null check(required_count>0), language_code text, capability text,
 unique(organization_id,id),
 foreign key(organization_id,experience_id) references public.experiences(organization_id,id)
);

create table public.staff_profiles (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 membership_id uuid not null, home_location_id uuid, active boolean not null default true,
 unique(organization_id,id),
 foreign key(organization_id,membership_id) references public.organization_memberships(organization_id,id),
 foreign key(organization_id,home_location_id) references public.locations(organization_id,id),
 unique(organization_id,membership_id)
);

create table public.staff_capabilities (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 staff_id uuid not null, kind text not null check(kind in ('role','language','skill')), value text not null,
 unique(organization_id,id),
 foreign key(organization_id,staff_id) references public.staff_profiles(organization_id,id),
 unique(organization_id,staff_id,kind,value)
);

create table public.staff_availability (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 staff_id uuid not null, starts_at timestamptz not null, ends_at timestamptz not null, kind text not null check(kind in ('available','unavailable')), source text not null default 'manual' check(source='manual'), note text,
 unique(organization_id,id),
 foreign key(organization_id,staff_id) references public.staff_profiles(organization_id,id),
 check(ends_at>starts_at)
);

create table public.services (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 experience_id uuid not null, location_id uuid not null, starts_at timestamptz not null, ends_at timestamptz not null, timezone text not null default 'Europe/Rome', capacity integer not null check(capacity>0), booking_mode text not null check(booking_mode in ('shared','private')), status text not null default 'scheduled' check(status in ('draft','scheduled','completed','cancelled')), language_code text not null default 'it', meeting_point text, dietary_revision integer not null default 1,
 unique(organization_id,id),
 foreign key(organization_id,experience_id) references public.experiences(organization_id,id),
 foreign key(organization_id,location_id) references public.locations(organization_id,id),
 check(ends_at>starts_at)
);

create table public.service_staff_requirements (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 service_id uuid not null, operational_role text not null, required_count integer not null check(required_count>0), capability text, language_code text,
 unique(organization_id,id),
 foreign key(organization_id,service_id) references public.services(organization_id,id)
);

create table public.staff_assignments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 service_id uuid not null, staff_id uuid not null, operational_role text not null, capabilities text[] not null default '{}', status text not null default 'proposed' check(status in ('proposed','accepted','declined','expired','released')), reserved_from timestamptz not null, reserved_to timestamptz not null, response_deadline timestamptz, responded_at timestamptz, decline_reason text, revenue_weight numeric(8,5),
 unique(organization_id,id),
 foreign key(organization_id,service_id) references public.services(organization_id,id),
 foreign key(organization_id,staff_id) references public.staff_profiles(organization_id,id),
 check(reserved_to>reserved_from), exclude using gist (organization_id with =, staff_id with =, tstzrange(reserved_from,reserved_to,'[)') with &&) where(status in ('proposed','accepted'))
);

create table public.resource_reservations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 service_id uuid not null, resource_id uuid not null, reserved_from timestamptz not null, reserved_to timestamptz not null, status text not null default 'active' check(status in ('active','released')),
 unique(organization_id,id),
 foreign key(organization_id,service_id) references public.services(organization_id,id),
 foreign key(organization_id,resource_id) references public.resources(organization_id,id),
 check(reserved_to>reserved_from), exclude using gist (organization_id with =, resource_id with =, tstzrange(reserved_from,reserved_to,'[)') with &&) where(status='active')
);

create table public.partners (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 name text not null, kind text not null default 'other' check(kind in ('tour_operator','ota','hotel','concierge','other')), billing_email text, active boolean not null default true, payment_terms_days integer not null default 0, billing_details jsonb,
 unique(organization_id,id)
);

create table public.invitations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 email text not null, role text not null check(role in ('owner','admin','manager','staff','partner')), partner_id uuid, token_hash text not null unique, expires_at timestamptz not null, accepted_at timestamptz, invited_by uuid not null references auth.users,
 unique(organization_id,id),
 foreign key(organization_id,partner_id) references public.partners(organization_id,id)
);

create table public.channels (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 name text not null, kind text not null check(kind in ('direct','phone','partner','ota','email')), partner_id uuid, integration_mode text not null default 'manual' check(integration_mode='manual'),
 unique(organization_id,id),
 foreign key(organization_id,partner_id) references public.partners(organization_id,id)
);

create table public.contacts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 display_name text not null, email text, phone text, locale text not null default 'it', partner_id uuid,
 unique(organization_id,id),
 foreign key(organization_id,partner_id) references public.partners(organization_id,id)
);

create table public.rate_cards (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 experience_id uuid not null, partner_id uuid, category text not null check(category in ('adult','child','private')), pricing_basis text not null check(pricing_basis in ('per_person','per_group')), unit_gross_minor bigint not null check(unit_gross_minor>=0), tax_rate numeric(5,2) check(tax_rate>=0 and tax_rate<=100), commission_bps integer not null default 0 check(commission_bps between 0 and 10000), currency char(3) not null default 'EUR' check(currency='EUR'), valid_from date not null, valid_to date not null, active boolean not null default true,
 unique(organization_id,id),
 foreign key(organization_id,experience_id) references public.experiences(organization_id,id),
 foreign key(organization_id,partner_id) references public.partners(organization_id,id),
 check(valid_to>=valid_from), exclude using gist(organization_id with =, experience_id with =, (coalesce(partner_id,'00000000-0000-0000-0000-000000000000'::uuid)) with =, category with =, daterange(valid_from,valid_to,'[]') with &&) where(active)
);

create table public.bookings (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 service_id uuid not null, contact_id uuid not null, partner_id uuid, channel_id uuid not null, code text not null, external_reference text, adults integer not null check(adults>=0), children integer not null default 0 check(children>=0), status text not null check(status in ('held','confirmed','completed','no_show','expired','cancelled')), hold_expires_at timestamptz, confirmed_at timestamptz, cancelled_at timestamptz, cancellation_reason text, customer_user_id uuid references auth.users,
 unique(organization_id,id),
 foreign key(organization_id,service_id) references public.services(organization_id,id),
 foreign key(organization_id,contact_id) references public.contacts(organization_id,id),
 foreign key(organization_id,partner_id) references public.partners(organization_id,id),
 foreign key(organization_id,channel_id) references public.channels(organization_id,id),
 unique(organization_id,code), check(adults+children>0), check(status<>'held' or hold_expires_at is not null)
);

create table public.booking_requests (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 contact_id uuid, partner_id uuid, channel_id uuid not null, desired_experience_id uuid, desired_service_id uuid, requested_at timestamptz not null default now(), adults integer not null check(adults>=0), children integer not null default 0 check(children>=0), status text not null default 'pending_review' check(status in ('draft','pending_review','awaiting_customer','approved','rejected','withdrawn')), requested_changes jsonb, target_booking_id uuid, approved_booking_id uuid, source_reference text,
 unique(organization_id,id),
 foreign key(organization_id,contact_id) references public.contacts(organization_id,id),
 foreign key(organization_id,partner_id) references public.partners(organization_id,id),
 foreign key(organization_id,channel_id) references public.channels(organization_id,id),
 foreign key(organization_id,desired_experience_id) references public.experiences(organization_id,id),
 foreign key(organization_id,desired_service_id) references public.services(organization_id,id),
 foreign key(organization_id,target_booking_id) references public.bookings(organization_id,id),
 foreign key(organization_id,approved_booking_id) references public.bookings(organization_id,id),
 check(adults+children>0)
);

create table public.booking_financials (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 booking_id uuid not null, currency char(3) not null default 'EUR', gross_minor bigint not null, tax_minor bigint, net_minor bigint, commission_minor bigint not null default 0, pricing_snapshot jsonb not null, settlement_party text not null check(settlement_party in ('customer','partner')), due_at timestamptz,
 unique(organization_id,id),
 foreign key(organization_id,booking_id) references public.bookings(organization_id,id),
 unique(organization_id,booking_id)
);

create table public.booking_price_lines (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 booking_id uuid not null, label text not null, category text not null, quantity numeric(12,3) not null, unit_gross_minor bigint not null, line_gross_minor bigint not null, tax_rate numeric(5,2), tax_minor bigint,
 unique(organization_id,id),
 foreign key(organization_id,booking_id) references public.bookings(organization_id,id)
);

create table public.participants (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 booking_id uuid not null, display_name text, category text not null check(category in ('adult','child')), ordinal integer not null, dietary_collection_status text not null default 'unknown' check(dietary_collection_status in ('unknown','declared_none','provided')),
 unique(organization_id,id),
 foreign key(organization_id,booking_id) references public.bookings(organization_id,id),
 unique(organization_id,booking_id,ordinal)
);

create table public.booking_operational_contacts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 booking_id uuid not null, contact_name text not null, phone text, meeting_note text,
 unique(organization_id,id),
 foreign key(organization_id,booking_id) references public.bookings(organization_id,id),
 unique(organization_id,booking_id)
);

create table public.payment_entries (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 booking_id uuid not null, kind text not null check(kind in ('receipt','refund','reversal','adjustment')), amount_minor bigint not null check(amount_minor>0), currency char(3) not null default 'EUR' check(currency='EUR'), payer_type text not null check(payer_type in ('customer','partner')), method text not null check(method in ('cash','bank','provider')), status text not null check(status in ('pending','settled','failed')), occurred_at timestamptz not null default now(), external_reference text, reverses_entry_id uuid, recorded_by uuid not null references auth.users,
 unique(organization_id,id),
 foreign key(organization_id,booking_id) references public.bookings(organization_id,id),
 foreign key(organization_id,reverses_entry_id) references public.payment_entries(organization_id,id),
 unique(organization_id,reverses_entry_id)
);

create table public.dietary_requirements (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 participant_id uuid not null, type text not null check(type in ('allergy','intolerance','preference','religious')), label text not null, severity text not null check(severity in ('unspecified','low','high','critical')), source text not null, verification_status text not null default 'unreviewed' check(verification_status in ('unreviewed','verified','needs_clarification')), declared_at timestamptz not null default now(), verified_by uuid references auth.users, verified_at timestamptz, revision integer not null default 1, expires_at timestamptz not null,
 unique(organization_id,id),
 foreign key(organization_id,participant_id) references public.participants(organization_id,id)
);

create table public.dietary_instructions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 dietary_requirement_id uuid not null, instruction text not null, authored_by uuid not null references auth.users,
 unique(organization_id,id),
 foreign key(organization_id,dietary_requirement_id) references public.dietary_requirements(organization_id,id)
);

create table public.service_notes (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 service_id uuid not null, booking_id uuid, visibility text not null check(visibility in ('backoffice','assigned_staff','partner')), partner_id uuid, body text not null, author_id uuid not null references auth.users,
 unique(organization_id,id),
 foreign key(organization_id,service_id) references public.services(organization_id,id),
 foreign key(organization_id,booking_id) references public.bookings(organization_id,id),
 foreign key(organization_id,partner_id) references public.partners(organization_id,id)
);

create table public.dietary_acknowledgements (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 service_id uuid not null, assignment_id uuid not null, dietary_revision integer not null, acknowledged_by uuid not null references auth.users, acknowledged_at timestamptz not null default now(),
 unique(organization_id,id),
 foreign key(organization_id,service_id) references public.services(organization_id,id),
 foreign key(organization_id,assignment_id) references public.staff_assignments(organization_id,id),
 unique(organization_id,assignment_id,dietary_revision)
);

create table public.privacy_records (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 participant_id uuid, contact_id uuid, purpose text not null, lawful_basis text not null, special_category_condition text, notice_version text not null, recorded_at timestamptz not null default now(), withdrawn_at timestamptz, recorded_by uuid not null references auth.users, evidence_reference text,
 unique(organization_id,id),
 foreign key(organization_id,participant_id) references public.participants(organization_id,id),
 foreign key(organization_id,contact_id) references public.contacts(organization_id,id),
 check(participant_id is not null or contact_id is not null)
);

create table private.command_receipts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 actor_id uuid not null references auth.users, operation text not null, idempotency_key text not null, request_hash text not null, result_entity_id uuid, status text not null default 'completed',
 unique(organization_id,id),
 unique(organization_id,operation,idempotency_key)
);

create table private.audit_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 actor_id uuid references auth.users, actor_kind text not null default 'user', action text not null, entity_type text not null, entity_id uuid not null, changed_fields text[] not null default '{}', reason text, request_id uuid not null default gen_random_uuid(),
 unique(organization_id,id)
);
alter table public.organizations enable row level security;
alter table public.organizations owner to comanda_executor;
revoke all on public.organizations from anon, authenticated;
grant select on public.organizations to authenticated;
alter table public.profiles enable row level security;
alter table public.profiles owner to comanda_executor;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
alter table public.organization_memberships enable row level security;
alter table public.organization_memberships owner to comanda_executor;
revoke all on public.organization_memberships from anon, authenticated;
grant select on public.organization_memberships to authenticated;
create index on public.organization_memberships(organization_id);
alter table public.membership_roles enable row level security;
alter table public.membership_roles owner to comanda_executor;
revoke all on public.membership_roles from anon, authenticated;
grant select on public.membership_roles to authenticated;
create index on public.membership_roles(organization_id);
alter table public.locations enable row level security;
alter table public.locations owner to comanda_executor;
revoke all on public.locations from anon, authenticated;
grant select on public.locations to authenticated;
create index on public.locations(organization_id);
alter table public.resources enable row level security;
alter table public.resources owner to comanda_executor;
revoke all on public.resources from anon, authenticated;
grant select on public.resources to authenticated;
create index on public.resources(organization_id);
alter table public.experiences enable row level security;
alter table public.experiences owner to comanda_executor;
revoke all on public.experiences from anon, authenticated;
grant select on public.experiences to authenticated;
create index on public.experiences(organization_id);
alter table public.experience_staff_requirements enable row level security;
alter table public.experience_staff_requirements owner to comanda_executor;
revoke all on public.experience_staff_requirements from anon, authenticated;
grant select on public.experience_staff_requirements to authenticated;
create index on public.experience_staff_requirements(organization_id);
alter table public.staff_profiles enable row level security;
alter table public.staff_profiles owner to comanda_executor;
revoke all on public.staff_profiles from anon, authenticated;
grant select on public.staff_profiles to authenticated;
create index on public.staff_profiles(organization_id);
alter table public.staff_capabilities enable row level security;
alter table public.staff_capabilities owner to comanda_executor;
revoke all on public.staff_capabilities from anon, authenticated;
grant select on public.staff_capabilities to authenticated;
create index on public.staff_capabilities(organization_id);
alter table public.staff_availability enable row level security;
alter table public.staff_availability owner to comanda_executor;
revoke all on public.staff_availability from anon, authenticated;
grant select on public.staff_availability to authenticated;
create index on public.staff_availability(organization_id);
alter table public.services enable row level security;
alter table public.services owner to comanda_executor;
revoke all on public.services from anon, authenticated;
grant select on public.services to authenticated;
create index on public.services(organization_id);
alter table public.service_staff_requirements enable row level security;
alter table public.service_staff_requirements owner to comanda_executor;
revoke all on public.service_staff_requirements from anon, authenticated;
grant select on public.service_staff_requirements to authenticated;
create index on public.service_staff_requirements(organization_id);
alter table public.staff_assignments enable row level security;
alter table public.staff_assignments owner to comanda_executor;
revoke all on public.staff_assignments from anon, authenticated;
grant select on public.staff_assignments to authenticated;
create index on public.staff_assignments(organization_id);
alter table public.resource_reservations enable row level security;
alter table public.resource_reservations owner to comanda_executor;
revoke all on public.resource_reservations from anon, authenticated;
grant select on public.resource_reservations to authenticated;
create index on public.resource_reservations(organization_id);
alter table public.partners enable row level security;
alter table public.partners owner to comanda_executor;
revoke all on public.partners from anon, authenticated;
grant select on public.partners to authenticated;
create index on public.partners(organization_id);
alter table public.invitations enable row level security;
alter table public.invitations owner to comanda_executor;
revoke all on public.invitations from anon, authenticated;
grant select on public.invitations to authenticated;
create index on public.invitations(organization_id);
alter table public.channels enable row level security;
alter table public.channels owner to comanda_executor;
revoke all on public.channels from anon, authenticated;
grant select on public.channels to authenticated;
create index on public.channels(organization_id);
alter table public.contacts enable row level security;
alter table public.contacts owner to comanda_executor;
revoke all on public.contacts from anon, authenticated;
grant select on public.contacts to authenticated;
create index on public.contacts(organization_id);
alter table public.rate_cards enable row level security;
alter table public.rate_cards owner to comanda_executor;
revoke all on public.rate_cards from anon, authenticated;
grant select on public.rate_cards to authenticated;
create index on public.rate_cards(organization_id);
alter table public.bookings enable row level security;
alter table public.bookings owner to comanda_executor;
revoke all on public.bookings from anon, authenticated;
grant select on public.bookings to authenticated;
create index on public.bookings(organization_id);
alter table public.booking_requests enable row level security;
alter table public.booking_requests owner to comanda_executor;
revoke all on public.booking_requests from anon, authenticated;
grant select on public.booking_requests to authenticated;
create index on public.booking_requests(organization_id);
alter table public.booking_financials enable row level security;
alter table public.booking_financials owner to comanda_executor;
revoke all on public.booking_financials from anon, authenticated;
grant select on public.booking_financials to authenticated;
create index on public.booking_financials(organization_id);
alter table public.booking_price_lines enable row level security;
alter table public.booking_price_lines owner to comanda_executor;
revoke all on public.booking_price_lines from anon, authenticated;
grant select on public.booking_price_lines to authenticated;
create index on public.booking_price_lines(organization_id);
alter table public.participants enable row level security;
alter table public.participants owner to comanda_executor;
revoke all on public.participants from anon, authenticated;
grant select on public.participants to authenticated;
create index on public.participants(organization_id);
alter table public.booking_operational_contacts enable row level security;
alter table public.booking_operational_contacts owner to comanda_executor;
revoke all on public.booking_operational_contacts from anon, authenticated;
grant select on public.booking_operational_contacts to authenticated;
create index on public.booking_operational_contacts(organization_id);
alter table public.payment_entries enable row level security;
alter table public.payment_entries owner to comanda_executor;
revoke all on public.payment_entries from anon, authenticated;
grant select on public.payment_entries to authenticated;
create index on public.payment_entries(organization_id);
alter table public.dietary_requirements enable row level security;
alter table public.dietary_requirements owner to comanda_executor;
revoke all on public.dietary_requirements from anon, authenticated;
grant select on public.dietary_requirements to authenticated;
create index on public.dietary_requirements(organization_id);
alter table public.dietary_instructions enable row level security;
alter table public.dietary_instructions owner to comanda_executor;
revoke all on public.dietary_instructions from anon, authenticated;
grant select on public.dietary_instructions to authenticated;
create index on public.dietary_instructions(organization_id);
alter table public.service_notes enable row level security;
alter table public.service_notes owner to comanda_executor;
revoke all on public.service_notes from anon, authenticated;
grant select on public.service_notes to authenticated;
create index on public.service_notes(organization_id);
alter table public.dietary_acknowledgements enable row level security;
alter table public.dietary_acknowledgements owner to comanda_executor;
revoke all on public.dietary_acknowledgements from anon, authenticated;
grant select on public.dietary_acknowledgements to authenticated;
create index on public.dietary_acknowledgements(organization_id);
alter table public.privacy_records enable row level security;
alter table public.privacy_records owner to comanda_executor;
revoke all on public.privacy_records from anon, authenticated;
grant select on public.privacy_records to authenticated;
create index on public.privacy_records(organization_id);
alter table private.command_receipts enable row level security;
alter table private.command_receipts owner to comanda_executor;
revoke all on private.command_receipts from anon, authenticated;
create index on private.command_receipts(organization_id);
alter table private.audit_events enable row level security;
alter table private.audit_events owner to comanda_executor;
revoke all on private.audit_events from anon, authenticated;
create index on private.audit_events(organization_id);

create index on public.services(organization_id,starts_at);
create index on public.bookings(organization_id,service_id,status);
create index on public.staff_availability(organization_id,staff_id,starts_at,ends_at);
create index on public.contacts(organization_id,lower(email));
create index on public.participants(organization_id,booking_id);
create index on public.dietary_requirements(organization_id,participant_id);
create function private.has_role(org uuid, roles text[]) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.organization_memberships m join public.membership_roles r on r.organization_id=m.organization_id and r.membership_id=m.id where m.organization_id=org and m.user_id=auth.uid() and m.status='active' and r.role=any(roles));
$$;
create function private.is_member(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.organization_memberships where organization_id=org and user_id=auth.uid() and status='active');
$$;
create function private.own_staff(org uuid, staff uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_member(org) and exists(select 1 from public.staff_profiles s join public.organization_memberships m on m.organization_id=s.organization_id and m.id=s.membership_id where s.organization_id=org and s.id=staff and m.user_id=auth.uid() and s.active);
$$;
create function private.assigned(org uuid, service uuid, personal boolean default false, dietary boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_member(org) and exists(select 1 from public.staff_assignments a join public.services s on s.organization_id=a.organization_id and s.id=a.service_id where a.organization_id=org and a.service_id=service and private.own_staff(org,a.staff_id) and a.status in ('proposed','accepted') and (not personal or (a.status='accepted' and now() between s.starts_at-interval '48 hours' and s.ends_at+interval '24 hours')) and (not dietary or a.capabilities && array['kitchen','tour']));
$$;
create function private.participant_access(org uuid, participant uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.participants participant_row join public.bookings booking_row on booking_row.organization_id=participant_row.organization_id and booking_row.id=participant_row.booking_id where participant_row.organization_id=org and participant_row.id=participant and booking_row.status in ('confirmed','completed') and private.assigned(org,booking_row.service_id,true,true));
$$;
alter function private.has_role(uuid,text[]) owner to comanda_executor; revoke all on function private.has_role(uuid,text[]) from public; grant execute on function private.has_role(uuid,text[]) to authenticated;
alter function private.is_member(uuid) owner to comanda_executor; revoke all on function private.is_member(uuid) from public; grant execute on function private.is_member(uuid) to authenticated;
alter function private.own_staff(uuid,uuid) owner to comanda_executor; revoke all on function private.own_staff(uuid,uuid) from public; grant execute on function private.own_staff(uuid,uuid) to authenticated;
alter function private.assigned(uuid,uuid,boolean,boolean) owner to comanda_executor; revoke all on function private.assigned(uuid,uuid,boolean,boolean) from public; grant execute on function private.assigned(uuid,uuid,boolean,boolean) to authenticated;
alter function private.participant_access(uuid,uuid) owner to comanda_executor; revoke all on function private.participant_access(uuid,uuid) from public; grant execute on function private.participant_access(uuid,uuid) to authenticated;
grant usage on schema private to authenticated;
create policy member_read on public.organizations for select to authenticated using(private.is_member(id));
create policy self_read on public.profiles for select to authenticated using(user_id=(select auth.uid()));
create policy authorized_read on public.organization_memberships for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or (user_id=(select auth.uid()) and status='active'));
create policy authorized_read on public.membership_roles for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or exists(select 1 from public.organization_memberships m where m.id=membership_id and m.organization_id=organization_id and m.user_id=(select auth.uid()) and m.status='active'));
create policy authorized_read on public.locations for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.resources for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.experiences for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.experience_staff_requirements for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.staff_profiles for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or private.own_staff(organization_id,id));
create policy authorized_read on public.staff_capabilities for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or private.own_staff(organization_id,staff_id));
create policy authorized_read on public.staff_availability for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or private.own_staff(organization_id,staff_id));
create policy authorized_read on public.services for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or private.assigned(organization_id,id));
create policy authorized_read on public.service_staff_requirements for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or private.assigned(organization_id,service_id));
create policy authorized_read on public.staff_assignments for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or private.own_staff(organization_id,staff_id));
create policy authorized_read on public.resource_reservations for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.partners for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.invitations for select to authenticated using(private.has_role(organization_id,array['owner','admin']));
create policy authorized_read on public.channels for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.contacts for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.rate_cards for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.bookings for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.booking_requests for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.booking_financials for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.booking_price_lines for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.participants for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or exists(select 1 from public.bookings booking_row where booking_row.id=booking_id and booking_row.organization_id=organization_id and private.assigned(booking_row.organization_id,booking_row.service_id,true,false)));
create policy authorized_read on public.booking_operational_contacts for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.payment_entries for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.dietary_requirements for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or private.participant_access(organization_id,participant_id));
create policy authorized_read on public.dietary_instructions for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or exists(select 1 from public.dietary_requirements d where d.id=dietary_requirement_id and d.organization_id=organization_id and private.participant_access(d.organization_id,d.participant_id)));
create policy authorized_read on public.service_notes for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or (visibility='assigned_staff' and private.assigned(organization_id,service_id,true,false)));
create policy authorized_read on public.dietary_acknowledgements for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
create policy authorized_read on public.privacy_records for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']));
-- Internal invariants. Caller-facing commands below hold the organization row lock.
create function private.check_capacity(org uuid, sid uuid, pax integer, excluding uuid default null) returns void language plpgsql set search_path='' as $$
declare s public.services; occupied integer; groups integer;
begin
 select * into strict s from public.services where organization_id=org and id=sid for update;
 if s.status<>'scheduled' then raise exception 'SERVICE_NOT_SCHEDULED'; end if;
 select coalesce(sum(adults+children),0),count(*) into occupied,groups from public.bookings where organization_id=org and service_id=sid and id is distinct from excluding and (status='confirmed' or (status='held' and hold_expires_at>clock_timestamp()));
 if pax<=0 or occupied+pax>s.capacity or (s.booking_mode='private' and groups>0) then raise exception 'CAPACITY_EXCEEDED'; end if;
end $$;
create function private.check_staff(org uuid, staff uuid, sid uuid, start_time timestamptz, end_time timestamptz, op_role text) returns void language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.staff_profiles s join public.organization_memberships m on m.organization_id=s.organization_id and m.id=s.membership_id where s.organization_id=org and s.id=staff and s.active and m.status='active') then raise exception 'STAFF_INACTIVE'; end if;
 if not exists(select 1 from public.staff_capabilities where organization_id=org and staff_id=staff and kind='role' and value=op_role) then raise exception 'QUALIFICATION_REQUIRED'; end if;
 if not exists(select 1 from public.staff_availability where organization_id=org and staff_id=staff and kind='available' and starts_at<=start_time and ends_at>=end_time) or exists(select 1 from public.staff_availability where organization_id=org and staff_id=staff and kind='unavailable' and tstzrange(starts_at,ends_at,'[)') && tstzrange(start_time,end_time,'[)')) then raise exception 'STAFF_UNAVAILABLE'; end if;
 if exists(select 1 from public.service_staff_requirements r where r.organization_id=org and r.service_id=sid and r.operational_role=op_role and r.language_code is not null and not exists(select 1 from public.staff_capabilities c where c.organization_id=org and c.staff_id=staff and c.kind='language' and c.value=r.language_code)) then raise exception 'LANGUAGE_REQUIRED'; end if;
end $$;
create function private.readiness(org uuid, sid uuid) returns text language sql stable set search_path='' as $$
 select case when exists(select 1 from public.service_staff_requirements r where r.organization_id=org and r.service_id=sid and r.required_count>(select count(*) from public.staff_assignments a join public.staff_profiles sp on sp.organization_id=a.organization_id and sp.id=a.staff_id join public.organization_memberships m on m.organization_id=sp.organization_id and m.id=sp.membership_id where a.organization_id=org and a.service_id=sid and a.operational_role=r.operational_role and a.status='accepted' and sp.active and m.status='active' and (r.capability is null or r.capability=any(a.capabilities)))) then 'needs_staff'
 when exists(select 1 from public.participants participant_row join public.bookings booking_row on booking_row.organization_id=participant_row.organization_id and booking_row.id=participant_row.booking_id where booking_row.organization_id=org and booking_row.service_id=sid and (booking_row.status='confirmed' or (booking_row.status='held' and booking_row.hold_expires_at>now())) and (participant_row.dietary_collection_status='unknown' or exists(select 1 from public.dietary_requirements dietary_row where dietary_row.organization_id=org and dietary_row.participant_id=participant_row.id and dietary_row.verification_status<>'verified'))) then 'needs_dietary_review'
 when exists(select 1 from public.staff_assignments assignment_row join public.services service_row on service_row.organization_id=assignment_row.organization_id and service_row.id=assignment_row.service_id where assignment_row.organization_id=org and assignment_row.service_id=sid and assignment_row.status='accepted' and assignment_row.capabilities && array['kitchen','tour'] and exists(select 1 from public.dietary_requirements dietary_row join public.participants participant_row on participant_row.organization_id=dietary_row.organization_id and participant_row.id=dietary_row.participant_id join public.bookings booking_row on booking_row.organization_id=participant_row.organization_id and booking_row.id=participant_row.booking_id where booking_row.organization_id=org and booking_row.service_id=sid and booking_row.status in ('held','confirmed')) and not exists(select 1 from public.dietary_acknowledgements acknowledgement_row where acknowledgement_row.organization_id=org and acknowledgement_row.assignment_id=assignment_row.id and acknowledgement_row.dietary_revision=service_row.dietary_revision)) then 'needs_dietary_review' else 'ready' end;
$$;
create function private.price_booking(org uuid, bid uuid) returns void language plpgsql set search_path='' as $$
declare b public.bookings; s public.services; r public.rate_cards; cat text; qty integer; total bigint:=0; taxes bigint:=0; commission bigint:=0; line bigint; tax bigint; snapshot jsonb:='[]';
begin
 select * into strict b from public.bookings where organization_id=org and id=bid;
 select * into strict s from public.services where organization_id=org and id=b.service_id;
 delete from public.booking_price_lines where organization_id=org and booking_id=bid;
 foreach cat in array (case when s.booking_mode='private' then array['private'] else array['adult','child'] end) loop
  qty:=case cat when 'private' then 1 when 'adult' then b.adults else b.children end;
  if qty=0 then continue; end if;
  select * into r from public.rate_cards where organization_id=org and experience_id=s.experience_id and active and category=cat and (s.starts_at at time zone s.timezone)::date between valid_from and valid_to and (partner_id is not distinct from b.partner_id or partner_id is null) order by partner_id nulls last limit 1;
  if not found then raise exception 'RATE_NOT_FOUND'; end if;
  if (cat='private')<>(r.pricing_basis='per_group') then raise exception 'INVALID_PRICING_BASIS'; end if;
  line:=qty*r.unit_gross_minor; tax:=case when r.tax_rate is null then null else round(line-line/(1+r.tax_rate/100)) end;
  total:=total+line; taxes:=taxes+tax; commission:=commission+round(line*r.commission_bps/10000.0);
  insert into public.booking_price_lines(organization_id,booking_id,label,category,quantity,unit_gross_minor,line_gross_minor,tax_rate,tax_minor) values(org,bid,cat,cat,qty,r.unit_gross_minor,line,r.tax_rate,tax);
  snapshot:=snapshot||jsonb_build_array(jsonb_build_object('rate_id',r.id,'category',cat,'quantity',qty,'unit_minor',r.unit_gross_minor,'tax_rate',r.tax_rate,'commission_bps',r.commission_bps));
 end loop;
 insert into public.booking_financials(organization_id,booking_id,gross_minor,tax_minor,net_minor,commission_minor,pricing_snapshot,settlement_party) values(org,bid,total,taxes,total-taxes,commission,snapshot,case when b.partner_id is null then 'customer' else 'partner' end)
 on conflict(organization_id,booking_id) do update set gross_minor=excluded.gross_minor,tax_minor=excluded.tax_minor,net_minor=excluded.net_minor,commission_minor=excluded.commission_minor,pricing_snapshot=excluded.pricing_snapshot,version=public.booking_financials.version+1,updated_at=now();
end $$;
create function private.sync_participants(org uuid, bid uuid, allow_removal boolean default false) returns void language plpgsql set search_path='' as $$
declare b public.bookings; i integer;
begin
 select * into strict b from public.bookings where organization_id=org and id=bid;
 if exists(select 1 from public.participants where organization_id=org and booking_id=bid and ordinal>b.adults+b.children) then
  -- Never silently discard collected personal/dietary evidence (even with generic confirmation).
  if exists(select 1 from public.participants p where p.organization_id=org and p.booking_id=bid and p.ordinal>b.adults+b.children and (p.display_name is not null or p.dietary_collection_status<>'unknown' or exists(select 1 from public.dietary_requirements d where d.participant_id=p.id))) then raise exception 'PARTICIPANT_REMOVAL_REQUIRES_REVIEW'; end if;
  if not allow_removal then raise exception 'CONFIRM_PARTICIPANT_REMOVAL'; end if;
  delete from public.participants where organization_id=org and booking_id=bid and ordinal>b.adults+b.children;
 end if;
 for i in 1..b.adults+b.children loop
  insert into public.participants(organization_id,booking_id,ordinal,category) values(org,bid,i,case when i<=b.adults then 'adult' else 'child' end)
  on conflict(organization_id,booking_id,ordinal) do update set category=excluded.category;
 end loop;
end $$;

-- Single, explicitly allowlisted command boundary. No dynamic SQL or privileged client.
create function public.command(p_org uuid,p_operation text,p_payload jsonb,p_key text) returns uuid language plpgsql security definer set search_path='' as $$
declare
 result uuid:=gen_random_uuid(); fingerprint text; receipt private.command_receipts; sid uuid; bid uuid; old_sid uuid; target uuid;
 s public.services; b public.bookings; req public.booking_requests; a public.staff_assignments; x record; exp public.experiences; pay public.payment_entries; member_row public.organization_memberships;
 start_time timestamptz; end_time timestamptz; shift interval; caps text[]; role_name text; mode text; n integer;
begin
 if auth.uid() is null or not private.is_member(p_org) then raise exception 'FORBIDDEN'; end if;
 -- Consistent order for ALL mutations, including membership revocation and catalog changes.
 perform 1 from public.organizations where id=p_org for update;
 if not private.is_member(p_org) then raise exception 'FORBIDDEN'; end if;
 if not private.has_role(p_org,array['owner','admin','manager']) and p_operation not in ('respond_assignment','acknowledge_dietary','set_availability') then raise exception 'FORBIDDEN'; end if;
 if p_key is null or length(p_key) not between 8 and 200 or jsonb_typeof(p_payload)<>'object' or pg_column_size(p_payload)>32768 then raise exception 'INVALID_COMMAND'; end if;
 fingerprint:=encode(extensions.digest((jsonb_build_object('actor',auth.uid(),'payload',p_payload))::text,'sha256'),'hex');
 select * into receipt from private.command_receipts where organization_id=p_org and operation=p_operation and idempotency_key=p_key;
 if found then
  if receipt.request_hash<>fingerprint then raise exception 'IDEMPOTENCY_MISMATCH'; end if;
  return receipt.result_entity_id;
 end if;
 sid:=(p_payload->>'service_id')::uuid; bid:=(p_payload->>'booking_id')::uuid; target:=(p_payload->>'id')::uuid;
 if p_operation in ('save_location','save_resource','save_experience','save_requirement','save_rate','save_staff','save_capability','save_partner','save_channel','set_membership','create_invitation') and not private.has_role(p_org,array['owner','admin']) then raise exception 'FORBIDDEN'; end if;
 case p_operation
 when 'save_location' then
  insert into public.locations(id,organization_id,name,address,timezone) values(result,p_org,p_payload->>'name',coalesce(p_payload->>'address',''),coalesce(p_payload->>'timezone','Europe/Rome'));
 when 'save_resource' then
  insert into public.resources(id,organization_id,location_id,name,kind,capacity) values(result,p_org,(p_payload->>'location_id')::uuid,p_payload->>'name',p_payload->>'kind',(p_payload->>'capacity')::integer);
 when 'save_experience' then
  insert into public.experiences(id,organization_id,name,description,kind,duration_minutes,default_capacity,booking_mode) values(result,p_org,p_payload->>'name',coalesce(p_payload->>'description',''),coalesce(p_payload->>'kind','class'),(p_payload->>'duration_minutes')::integer,(p_payload->>'capacity')::integer,p_payload->>'booking_mode');
 when 'save_requirement' then
  insert into public.experience_staff_requirements(id,organization_id,experience_id,operational_role,required_count,capability,language_code) values(result,p_org,(p_payload->>'experience_id')::uuid,p_payload->>'operational_role',(p_payload->>'required_count')::integer,p_payload->>'capability',p_payload->>'language_code');
 when 'save_rate' then
  insert into public.rate_cards(id,organization_id,experience_id,partner_id,category,pricing_basis,unit_gross_minor,tax_rate,commission_bps,valid_from,valid_to) values(result,p_org,(p_payload->>'experience_id')::uuid,(p_payload->>'partner_id')::uuid,p_payload->>'category',p_payload->>'pricing_basis',(p_payload->>'unit_gross_minor')::bigint,(p_payload->>'tax_rate')::numeric,coalesce((p_payload->>'commission_bps')::integer,0),(p_payload->>'valid_from')::date,(p_payload->>'valid_to')::date);
 when 'save_staff' then
  insert into public.staff_profiles(id,organization_id,membership_id,home_location_id) values(result,p_org,(p_payload->>'membership_id')::uuid,(p_payload->>'location_id')::uuid);
 when 'save_capability' then
  insert into public.staff_capabilities(id,organization_id,staff_id,kind,value) values(result,p_org,(p_payload->>'staff_id')::uuid,p_payload->>'kind',p_payload->>'value');
 when 'set_availability' then
  if not private.has_role(p_org,array['owner','admin','manager']) and not private.own_staff(p_org,(p_payload->>'staff_id')::uuid) then raise exception 'FORBIDDEN'; end if;
  start_time:=(p_payload->>'starts_at')::timestamptz; end_time:=(p_payload->>'ends_at')::timestamptz;
  if p_payload->>'kind'='unavailable' and exists(select 1 from public.staff_assignments where organization_id=p_org and staff_id=(p_payload->>'staff_id')::uuid and status in ('proposed','accepted') and tstzrange(reserved_from,reserved_to,'[)') && tstzrange(start_time,end_time,'[)')) then raise exception 'RELEASE_ASSIGNMENTS_FIRST'; end if;
  insert into public.staff_availability(id,organization_id,staff_id,starts_at,ends_at,kind) values(result,p_org,(p_payload->>'staff_id')::uuid,start_time,end_time,p_payload->>'kind');
 when 'save_partner' then
  insert into public.partners(id,organization_id,name,kind) values(result,p_org,p_payload->>'name',p_payload->>'kind');
 when 'save_channel' then
  insert into public.channels(id,organization_id,name,kind,partner_id) values(result,p_org,p_payload->>'name',p_payload->>'kind',(p_payload->>'partner_id')::uuid);
 when 'save_contact' then
  insert into public.contacts(id,organization_id,display_name,email,phone,partner_id) values(result,p_org,p_payload->>'display_name',nullif(lower(p_payload->>'email'),''),nullif(p_payload->>'phone',''),(p_payload->>'partner_id')::uuid);
 when 'create_service' then
  select * into strict exp from public.experiences where organization_id=p_org and id=(p_payload->>'experience_id')::uuid and active;
  start_time:=(p_payload->>'starts_at')::timestamptz; end_time:=start_time+make_interval(mins=>exp.duration_minutes);
  insert into public.services(id,organization_id,experience_id,location_id,starts_at,ends_at,capacity,booking_mode,language_code,timezone) values(result,p_org,exp.id,(p_payload->>'location_id')::uuid,start_time,end_time,coalesce((p_payload->>'capacity')::integer,exp.default_capacity),exp.booking_mode,coalesce(p_payload->>'language_code','it'),coalesce(p_payload->>'timezone','Europe/Rome'));
  insert into public.service_staff_requirements(organization_id,service_id,operational_role,required_count,capability,language_code) select p_org,result,operational_role,required_count,capability,language_code from public.experience_staff_requirements where organization_id=p_org and experience_id=exp.id;
 when 'create_request' then
  insert into public.booking_requests(id,organization_id,contact_id,partner_id,channel_id,desired_experience_id,desired_service_id,adults,children,source_reference) values(result,p_org,(p_payload->>'contact_id')::uuid,(p_payload->>'partner_id')::uuid,(p_payload->>'channel_id')::uuid,(p_payload->>'experience_id')::uuid,sid,(p_payload->>'adults')::integer,coalesce((p_payload->>'children')::integer,0),p_payload->>'source_reference');
 when 'set_request_status' then
  if p_payload->>'status' not in ('pending_review','awaiting_customer','rejected','withdrawn') then raise exception 'INVALID_STATUS'; end if;
  update public.booking_requests set status=p_payload->>'status',version=version+1,updated_at=now() where organization_id=p_org and id=target and version=(p_payload->>'expected_version')::integer and status<>'approved';
  if not found then raise exception 'VERSION_CONFLICT'; end if; result:=target;
 when 'create_hold','confirm_request' then
  select * into strict req from public.booking_requests where organization_id=p_org and id=target for update;
  if req.version is distinct from (p_payload->>'expected_version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  if req.status not in ('pending_review','awaiting_customer') or req.approved_booking_id is not null then raise exception 'REQUEST_ALREADY_PROCESSED'; end if;
  sid:=coalesce(sid,req.desired_service_id);
  select * into strict s from public.services where organization_id=p_org and id=sid;
  if req.desired_experience_id is not null and s.experience_id<>req.desired_experience_id then raise exception 'EXPERIENCE_MISMATCH'; end if;
  perform private.check_capacity(p_org,sid,req.adults+req.children);
  if p_operation='confirm_request' and private.readiness(p_org,sid)='needs_staff' and nullif(p_payload->>'override_reason','') is null then raise exception 'STAFF_REQUIRED'; end if;
  insert into public.bookings(id,organization_id,service_id,contact_id,partner_id,channel_id,code,adults,children,status,hold_expires_at,confirmed_at) values(result,p_org,sid,req.contact_id,req.partner_id,req.channel_id,'C-'||upper(substr(result::text,1,8)),req.adults,req.children,case when p_operation='create_hold' then 'held' else 'confirmed' end,case when p_operation='create_hold' then clock_timestamp()+interval '15 minutes' end,case when p_operation='confirm_request' then now() end);
  perform private.price_booking(p_org,result); perform private.sync_participants(p_org,result);
  insert into public.booking_operational_contacts(organization_id,booking_id,contact_name,phone) select p_org,result,display_name,phone from public.contacts where organization_id=p_org and id=req.contact_id;
  update public.booking_requests set approved_booking_id=result,status='approved',version=version+1,updated_at=now() where id=req.id;
 when 'confirm_booking','change_booking','cancel_booking','set_booking_status' then
  select * into strict b from public.bookings where organization_id=p_org and id=bid for update;
  if b.version is distinct from (p_payload->>'expected_version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  if b.status not in ('held','confirmed') then raise exception 'INVALID_STATUS'; end if;
  old_sid:=b.service_id; sid:=coalesce(sid,b.service_id); result:=bid;
  if p_operation='cancel_booking' then
   if nullif(p_payload->>'reason','') is null then raise exception 'REASON_REQUIRED'; end if;
   update public.bookings set status='cancelled',cancelled_at=now(),cancellation_reason=p_payload->>'reason',version=version+1,updated_at=now() where id=bid;
  elsif p_operation='set_booking_status' then
   if b.status<>'confirmed' or p_payload->>'status' not in ('completed','no_show') then raise exception 'INVALID_STATUS'; end if;
   update public.bookings set status=p_payload->>'status',version=version+1,updated_at=now() where id=bid;
  else
   if b.status='held' and b.hold_expires_at<=clock_timestamp() then raise exception 'HOLD_EXPIRED'; end if;
   perform private.check_capacity(p_org,sid,coalesce((p_payload->>'adults')::integer,b.adults)+coalesce((p_payload->>'children')::integer,b.children),bid);
   if (p_operation='confirm_booking' or (b.status='confirmed' and sid<>old_sid)) and private.readiness(p_org,sid)='needs_staff' and nullif(p_payload->>'override_reason','') is null then raise exception 'STAFF_REQUIRED'; end if;
   if p_operation='confirm_booking' and exists(select 1 from public.dietary_requirements d join public.participants p on p.organization_id=d.organization_id and p.id=d.participant_id where p.organization_id=p_org and p.booking_id=bid and d.verification_status<>'verified') then raise exception 'DIETARY_REVIEW_REQUIRED'; end if;
   update public.bookings set service_id=sid,adults=coalesce((p_payload->>'adults')::integer,adults),children=coalesce((p_payload->>'children')::integer,children),status=case when p_operation='confirm_booking' then 'confirmed' else status end,confirmed_at=case when p_operation='confirm_booking' then now() else confirmed_at end,version=version+1,updated_at=now() where id=bid;
   if p_operation='change_booking' then perform private.price_booking(p_org,bid); perform private.sync_participants(p_org,bid,coalesce((p_payload->>'allow_removal')::boolean,false)); end if;
  end if;
  update public.services set dietary_revision=dietary_revision+1,version=version+1 where organization_id=p_org and id in (old_sid,sid);
 when 'assign_staff' then
  select * into strict s from public.services where organization_id=p_org and id=sid and status='scheduled';
  start_time:=s.starts_at-make_interval(mins=>coalesce((p_payload->>'buffer_before')::integer,0)); end_time:=s.ends_at+make_interval(mins=>coalesce((p_payload->>'buffer_after')::integer,0));
  if start_time>s.starts_at or end_time<s.ends_at then raise exception 'INVALID_BUFFER'; end if;
  perform private.check_staff(p_org,(p_payload->>'staff_id')::uuid,sid,start_time,end_time,p_payload->>'operational_role');
  select coalesce(array_agg(distinct capability) filter(where capability is not null),'{}') into caps from public.service_staff_requirements where organization_id=p_org and service_id=sid and operational_role=p_payload->>'operational_role';
  insert into public.staff_assignments(id,organization_id,service_id,staff_id,operational_role,capabilities,reserved_from,reserved_to,response_deadline) values(result,p_org,sid,(p_payload->>'staff_id')::uuid,p_payload->>'operational_role',caps,start_time,end_time,s.starts_at);
 when 'respond_assignment','release_assignment','acknowledge_dietary' then
  select * into strict a from public.staff_assignments where organization_id=p_org and id=target for update;
  result:=a.id;
  if p_operation<>'release_assignment' and not private.own_staff(p_org,a.staff_id) then raise exception 'ONLY_ASSIGNEE'; end if;
  if a.version is distinct from (p_payload->>'expected_version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  if p_operation='acknowledge_dietary' then
   select * into strict s from public.services where organization_id=p_org and id=a.service_id;
   if a.status<>'accepted' or not a.capabilities && array['kitchen','tour'] or s.dietary_revision is distinct from (p_payload->>'dietary_revision')::integer then raise exception 'DIETARY_REVISION_CONFLICT'; end if;
   insert into public.dietary_acknowledgements(organization_id,service_id,assignment_id,dietary_revision,acknowledged_by) values(p_org,s.id,a.id,s.dietary_revision,auth.uid()) on conflict do nothing;
  else
   mode:=case when p_operation='release_assignment' then 'released' else p_payload->>'status' end;
   if (p_operation='respond_assignment' and (a.status<>'proposed' or mode not in ('accepted','declined') or a.response_deadline<=now())) or (p_operation='release_assignment' and a.status not in ('proposed','accepted')) then raise exception 'INVALID_STATUS'; end if;
   update public.staff_assignments set status=mode,responded_at=now(),version=version+1,updated_at=now() where id=target;
  end if;
 when 'reserve_resource' then
  select * into strict s from public.services where organization_id=p_org and id=sid and status='scheduled';
  if not exists(select 1 from public.resources where organization_id=p_org and id=(p_payload->>'resource_id')::uuid and active and location_id=s.location_id and capacity>=s.capacity) then raise exception 'RESOURCE_INCOMPATIBLE'; end if;
  insert into public.resource_reservations(id,organization_id,service_id,resource_id,reserved_from,reserved_to) values(result,p_org,sid,(p_payload->>'resource_id')::uuid,s.starts_at,s.ends_at);
 when 'reschedule_service' then
  select * into strict s from public.services where organization_id=p_org and id=sid for update;
  if s.version is distinct from (p_payload->>'expected_version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  if s.status<>'scheduled' then raise exception 'INVALID_STATUS'; end if;
  start_time:=coalesce((p_payload->>'starts_at')::timestamptz,s.starts_at); shift:=start_time-s.starts_at; end_time:=s.ends_at+shift;
  for x in select * from public.staff_assignments where organization_id=p_org and service_id=sid and status in ('proposed','accepted') loop
   perform private.check_staff(p_org,x.staff_id,sid,x.reserved_from+shift,x.reserved_to+shift,x.operational_role);
  end loop;
  update public.staff_assignments set reserved_from=reserved_from+shift,reserved_to=reserved_to+shift,response_deadline=start_time,version=version+1 where organization_id=p_org and service_id=sid and status in ('proposed','accepted');
  if exists(select 1 from public.resource_reservations rr join public.resources r on r.organization_id=rr.organization_id and r.id=rr.resource_id where rr.organization_id=p_org and rr.service_id=sid and rr.status='active' and (r.location_id<>coalesce((p_payload->>'location_id')::uuid,s.location_id) or r.capacity<coalesce((p_payload->>'capacity')::integer,s.capacity))) then raise exception 'RESOURCE_INCOMPATIBLE'; end if;
  update public.resource_reservations set reserved_from=reserved_from+shift,reserved_to=reserved_to+shift,version=version+1 where organization_id=p_org and service_id=sid and status='active';
  select coalesce(sum(adults+children),0) into n from public.bookings where organization_id=p_org and service_id=sid and (status='confirmed' or (status='held' and hold_expires_at>clock_timestamp()));
  if coalesce((p_payload->>'capacity')::integer,s.capacity)<n then raise exception 'CAPACITY_EXCEEDED'; end if;
  update public.services set starts_at=start_time,ends_at=end_time,location_id=coalesce((p_payload->>'location_id')::uuid,location_id),capacity=coalesce((p_payload->>'capacity')::integer,capacity),version=version+1,updated_at=now() where id=sid; result:=sid;
 when 'record_payment_entry' then
  select * into strict b from public.bookings where organization_id=p_org and id=bid;
  if p_payload->>'kind'='adjustment' then raise exception 'USE_RECEIPT_REFUND_OR_REVERSAL'; end if;
  if p_payload->>'kind'='reversal' then
   select * into strict pay from public.payment_entries where organization_id=p_org and id=(p_payload->>'reverses_entry_id')::uuid and booking_id=bid and kind in ('receipt','refund') and status='settled';
   insert into public.payment_entries(id,organization_id,booking_id,kind,amount_minor,payer_type,method,status,reverses_entry_id,recorded_by) values(result,p_org,bid,'reversal',pay.amount_minor,pay.payer_type,pay.method,'settled',pay.id,auth.uid());
  else
   if nullif(p_payload->>'reverses_entry_id','') is not null then raise exception 'INVALID_REVERSAL'; end if;
   insert into public.payment_entries(id,organization_id,booking_id,kind,amount_minor,currency,payer_type,method,status,external_reference,recorded_by) values(result,p_org,bid,p_payload->>'kind',(p_payload->>'amount_minor')::bigint,coalesce(p_payload->>'currency','EUR'),case when b.partner_id is null then 'customer' else 'partner' end,p_payload->>'method','settled',p_payload->>'external_reference',auth.uid());
  end if;
 when 'update_participant' then
  update public.participants set display_name=nullif(p_payload->>'display_name',''),dietary_collection_status=coalesce(p_payload->>'dietary_collection_status',dietary_collection_status),version=version+1,updated_at=now() where organization_id=p_org and id=target and version=(p_payload->>'expected_version')::integer returning booking_id into bid;
  if not found then raise exception 'VERSION_CONFLICT'; end if;
  if p_payload->>'dietary_collection_status'='declared_none' and exists(select 1 from public.dietary_requirements where organization_id=p_org and participant_id=target) then raise exception 'DIETARY_CONTRADICTION'; end if;
  result:=target;
  update public.services set dietary_revision=dietary_revision+1,version=version+1 where id=(select service_id from public.bookings where organization_id=p_org and id=bid);
 when 'save_dietary' then
  select booking_row.service_id into strict sid from public.participants participant_row join public.bookings booking_row on booking_row.organization_id=participant_row.organization_id and booking_row.id=participant_row.booking_id where participant_row.organization_id=p_org and participant_row.id=(p_payload->>'participant_id')::uuid;
  select * into strict s from public.services where organization_id=p_org and id=sid;
  insert into public.dietary_requirements(id,organization_id,participant_id,type,label,severity,source,expires_at) values(result,p_org,(p_payload->>'participant_id')::uuid,p_payload->>'type',p_payload->>'label',p_payload->>'severity',p_payload->>'source',s.ends_at+interval '90 days');
  update public.participants set dietary_collection_status='provided',version=version+1 where organization_id=p_org and id=(p_payload->>'participant_id')::uuid;
  update public.services set dietary_revision=dietary_revision+1,version=version+1 where id=sid;
 when 'verify_dietary' then
  if p_payload->>'verification_status' not in ('verified','needs_clarification') then raise exception 'INVALID_STATUS'; end if;
  update public.dietary_requirements set verification_status=p_payload->>'verification_status',verified_by=auth.uid(),verified_at=now(),revision=revision+1,version=version+1,updated_at=now() where organization_id=p_org and id=target and version=(p_payload->>'expected_version')::integer returning participant_id into bid;
  if not found then raise exception 'VERSION_CONFLICT'; end if;
  if nullif(p_payload->>'instruction','') is not null then insert into public.dietary_instructions(organization_id,dietary_requirement_id,instruction,authored_by) values(p_org,target,p_payload->>'instruction',auth.uid()); end if;
  update public.services set dietary_revision=dietary_revision+1,version=version+1 where id=(select booking_row.service_id from public.bookings booking_row join public.participants participant_row on participant_row.organization_id=booking_row.organization_id and participant_row.booking_id=booking_row.id where participant_row.organization_id=p_org and participant_row.id=bid); result:=target;
 when 'save_privacy' then
  insert into public.privacy_records(id,organization_id,participant_id,contact_id,purpose,lawful_basis,special_category_condition,notice_version,evidence_reference,recorded_by) values(result,p_org,(p_payload->>'participant_id')::uuid,(p_payload->>'contact_id')::uuid,p_payload->>'purpose',p_payload->>'lawful_basis',p_payload->>'special_category_condition',p_payload->>'notice_version',p_payload->>'evidence_reference',auth.uid());
 when 'save_note' then
  if bid is not null and not exists(select 1 from public.bookings where organization_id=p_org and id=bid and service_id=sid) then raise exception 'BOOKING_SERVICE_MISMATCH'; end if;
  insert into public.service_notes(id,organization_id,service_id,booking_id,visibility,body,author_id) values(result,p_org,sid,bid,'backoffice',p_payload->>'body',auth.uid());
 when 'set_membership' then
  select * into strict member_row from public.organization_memberships where organization_id=p_org and id=target;
  role_name:=p_payload->>'role';
  if (role_name in ('owner','admin') or exists(select 1 from public.membership_roles where organization_id=p_org and membership_id=target and role in ('owner','admin'))) and not private.has_role(p_org,array['owner']) then raise exception 'OWNER_REQUIRED'; end if;
  if exists(select 1 from public.membership_roles where organization_id=p_org and membership_id=target and role='owner') and (role_name is distinct from 'owner' or p_payload->>'status'<>'active') and (select count(*) from public.membership_roles r join public.organization_memberships m on m.organization_id=r.organization_id and m.id=r.membership_id where r.organization_id=p_org and r.role='owner' and m.status='active')<=1 then raise exception 'LAST_OWNER'; end if;
  if member_row.version is distinct from (p_payload->>'expected_version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  update public.organization_memberships set status=p_payload->>'status',version=version+1,updated_at=now() where id=target;
  delete from public.membership_roles where organization_id=p_org and membership_id=target;
  insert into public.membership_roles(organization_id,membership_id,role) values(p_org,target,role_name); result:=target;
 when 'create_invitation' then
  role_name:=p_payload->>'role';
  if role_name in ('owner','admin') and not private.has_role(p_org,array['owner']) then raise exception 'OWNER_REQUIRED'; end if;
  if length(p_payload->>'token_hash')<>64 then raise exception 'INVALID_TOKEN'; end if;
  insert into public.invitations(id,organization_id,email,role,token_hash,expires_at,invited_by) values(result,p_org,lower(p_payload->>'email'),role_name,p_payload->>'token_hash',now()+interval '72 hours',auth.uid());
 else raise exception 'UNKNOWN_COMMAND';
 end case;
 if p_operation in ('confirm_request','confirm_booking','change_booking') and sid is not null and nullif(p_payload->>'override_reason','') is not null then
  insert into public.service_notes(organization_id,service_id,visibility,body,author_id) values(p_org,sid,'backoffice','Deroga copertura staff: '||(p_payload->>'override_reason'),auth.uid());
 end if;
 insert into private.command_receipts(organization_id,actor_id,operation,idempotency_key,request_hash,result_entity_id) values(p_org,auth.uid(),p_operation,p_key,fingerprint,result);
 -- Audit records names only, never values or free-text reasons that may contain health data.
 insert into private.audit_events(organization_id,actor_id,action,entity_type,entity_id,changed_fields,reason) values(p_org,auth.uid(),p_operation,'command',result,array(select k from jsonb_object_keys(p_payload) k where k=any(array['address','adults','allow_removal','amount_minor','body','booking_id','booking_mode','buffer_after','buffer_before','capability','capacity','category','channel_id','children','commission_bps','contact_id','currency','description','dietary_collection_status','dietary_revision','display_name','duration_minutes','email','ends_at','evidence_reference','expected_version','experience_id','external_reference','id','instruction','kind','label','language_code','lawful_basis','location_id','membership_id','method','name','notice_version','operational_role','override_reason','participant_id','partner_id','phone','pricing_basis','purpose','reason','required_count','resource_id','reverses_entry_id','role','service_id','severity','source','source_reference','special_category_condition','staff_id','starts_at','status','tax_rate','timezone','token_hash','type','unit_gross_minor','valid_from','valid_to','value','verification_status'])),case when nullif(p_payload->>'override_reason','') is not null then 'staff_override' end);
 return result;
end $$;

create function public.accept_invitation(token text) returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.invitations; membership uuid; email_address text;
begin
 if auth.uid() is null then raise exception 'FORBIDDEN'; end if;
 select email into email_address from auth.users where id=auth.uid();
 select * into strict inv from public.invitations where token_hash=encode(extensions.digest(token,'sha256'),'hex');
 perform 1 from public.organizations where id=inv.organization_id for update;
 select * into strict inv from public.invitations where id=inv.id for update;
 if inv.accepted_at is not null or inv.expires_at<=now() or inv.email<>lower(email_address) then raise exception 'INVALID_INVITATION'; end if;
 if exists(select 1 from public.organization_memberships where organization_id=inv.organization_id and user_id=auth.uid()) then raise exception 'MEMBERSHIP_ALREADY_EXISTS'; end if;
 insert into public.organization_memberships(organization_id,user_id,status) values(inv.organization_id,auth.uid(),'active') returning id into membership;
 insert into public.membership_roles(organization_id,membership_id,role) values(inv.organization_id,membership,inv.role);
 update public.invitations set accepted_at=now() where id=inv.id;
 insert into private.audit_events(organization_id,actor_id,action,entity_type,entity_id) values(inv.organization_id,auth.uid(),'accept_invitation','membership',membership);
 return inv.organization_id;
end $$;
create function public.service_readiness(p_org uuid,p_service uuid) returns text language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(p_org,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
 return private.readiness(p_org,p_service);
end $$;
create function public.audit_log(p_org uuid) returns setof private.audit_events language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(p_org,array['owner','admin','manager']) then raise exception 'FORBIDDEN'; end if;
 return query select * from private.audit_events where organization_id=p_org order by created_at desc limit 100;
end $$;
-- Explicit ownership, fixed search_path, no PUBLIC execution on privileged functions.
DO $$ declare f record; begin
 for f in select p.oid::regprocedure as signature,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' or (n.nspname='public' and p.proname in ('command','accept_invitation','service_readiness','audit_log')) loop
  execute format('alter function %s owner to comanda_executor', f.signature);
  execute format('revoke all on function %s from public,anon,authenticated', f.signature);
  if f.nspname='public' or f.signature::text ~ '(has_role|is_member|own_staff|assigned|participant_access)' then execute format('grant execute on function %s to authenticated',f.signature); end if;
 end loop;
end $$;

create function private.booking_access(org uuid,bid uuid,dietary boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_member(org) and exists(select 1 from public.bookings booking_row where booking_row.organization_id=org and booking_row.id=bid and booking_row.status in ('confirmed','completed') and private.assigned(org,booking_row.service_id,true,dietary));
$$;
create function private.profile_access(person uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organization_memberships m where m.user_id=person and private.has_role(m.organization_id,array['owner','admin','manager']));
$$;
alter function private.booking_access(uuid,uuid,boolean) owner to comanda_executor;
alter function private.profile_access(uuid) owner to comanda_executor;
revoke all on function private.booking_access(uuid,uuid,boolean),private.profile_access(uuid) from public;
grant execute on function private.booking_access(uuid,uuid,boolean),private.profile_access(uuid) to authenticated;
drop policy self_read on public.profiles;
create policy self_read on public.profiles for select to authenticated using(user_id=(select auth.uid()) or private.profile_access(user_id));
drop policy authorized_read on public.participants;
create policy authorized_read on public.participants for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or private.booking_access(organization_id,booking_id,true));
drop policy authorized_read on public.booking_operational_contacts;
create policy authorized_read on public.booking_operational_contacts for select to authenticated using(private.has_role(organization_id,array['owner','admin','manager']) or private.booking_access(organization_id,booking_id,false));

revoke create on schema public, private from comanda_executor;
