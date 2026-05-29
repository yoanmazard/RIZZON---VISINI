-- Schéma étendu état locatif (152 colonnes) — compatible dashboard RIZZON V1

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  postal_code text,
  city text,
  district text,
  construction_date date,
  syndic text,
  building_code text,
  building_sub_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint buildings_name_unique unique (name)
);

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mandate_ref text,
  vat_regime text,
  vat_intra text,
  mandate_type text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists owners_name_mandate_unique
  on public.owners (name, coalesce(mandate_ref, ''));

create table if not exists public.tenant_pseudonyms (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  source_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint tenant_pseudonyms_label_unique unique (label),
  constraint tenant_pseudonyms_source_hash_unique unique (source_hash),
  constraint tenant_pseudonyms_label_check check (label ~ '^Locataire [0-9]+$')
);

alter table public.properties
  add column if not exists building_id uuid references public.buildings (id) on delete set null,
  add column if not exists detail_type text,
  add column if not exists designation text,
  add column if not exists usage_type text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists staircase text,
  add column if not exists door text,
  add column if not exists dpe_kwh_ep numeric(12, 2),
  add column if not exists ges_grade text,
  add column if not exists dpe_date date,
  add column if not exists ges_co2_m2 numeric(12, 4),
  add column if not exists surface_carrez numeric(10, 2),
  add column if not exists surface_corrigee numeric(10, 2),
  add column if not exists surface_plancher numeric(10, 2),
  add column if not exists surface_terrain numeric(10, 2),
  add column if not exists surface_utile numeric(10, 2),
  add column if not exists surface_utile_nette numeric(10, 2),
  add column if not exists surface_utile_brute numeric(10, 2),
  add column if not exists surface_ponderee numeric(10, 2),
  add column if not exists fiscality text,
  add column if not exists is_conventionne_lot text,
  add column if not exists completion_date date,
  add column if not exists gli text,
  add column if not exists heating_energy text,
  add column if not exists is_conventionne text,
  add column if not exists tenant_protected_65 boolean not null default false,
  add column if not exists notice_in_progress boolean not null default false;

create index if not exists properties_building_id_idx on public.properties (building_id);

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  pseudonym_id uuid references public.tenant_pseudonyms (id) on delete set null,
  owner_id uuid references public.owners (id) on delete set null,
  tenant_label text not null default 'Vacant',
  is_current boolean not null default true,
  contract_ref text,
  external_ref text,
  lease_model text,
  lease_type text,
  tenant_type text,
  contract_object text,
  payment_mode text,
  lre_active boolean,
  renewed_start_date date,
  end_date date,
  initial_effect_date date,
  termination_date date,
  contractual_exit_date date,
  last_renewal_date date,
  desired_exit_date date,
  entry_date date,
  duration_months integer,
  tacit_renewal boolean,
  notice_in_progress boolean not null default false,
  tacit_renewal_accord boolean,
  renewal_in_progress boolean,
  nb_colocataires integer,
  nb_garants integer,
  nb_cautions integer,
  occupation_days integer,
  occupation_pct numeric(8, 4),
  relance_cycle text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists leases_contract_ref_unique
  on public.leases (contract_ref)
  where contract_ref is not null;

create index if not exists leases_property_id_idx on public.leases (property_id);
create index if not exists leases_is_current_idx on public.leases (is_current);

create unique index if not exists leases_current_property_unique
  on public.leases (property_id)
  where is_current = true;

create trigger leases_set_updated_at
before update on public.leases
for each row execute function public.set_updated_at();

alter table public.financials
  add column if not exists lease_id uuid references public.leases (id) on delete set null,
  add column if not exists deposit_type text,
  add column if not exists rent_ttc numeric(12, 2),
  add column if not exists provisions_ht numeric(12, 2),
  add column if not exists provisions_ttc numeric(12, 2),
  add column if not exists provisions_tf numeric(12, 2),
  add column if not exists provisions_tom numeric(12, 2),
  add column if not exists rent_capped numeric(12, 2),
  add column if not exists balance numeric(14, 2),
  add column if not exists vat_management text,
  add column if not exists next_dunning_date date,
  add column if not exists overrun numeric(12, 2),
  add column if not exists cumul_rent_ht numeric(14, 2),
  add column if not exists cumul_rent_ttc numeric(14, 2),
  add column if not exists billing_frequency text,
  add column if not exists payment_due text,
  add column if not exists revision_frequency text,
  add column if not exists last_invoice text,
  add column if not exists manual_ventilation boolean,
  add column if not exists rent_ht_per_sqm_hab numeric(12, 4),
  add column if not exists rent_ttc_per_sqm_hab numeric(12, 4),
  add column if not exists annual_rent_ht numeric(14, 2),
  add column if not exists annual_rent_ttc numeric(14, 2),
  add column if not exists annual_prov_ht numeric(14, 2),
  add column if not exists annual_prov_ttc numeric(14, 2);

create unique index if not exists financials_lease_id_unique
  on public.financials (lease_id)
  where lease_id is not null;

create table if not exists public.lease_revisions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  lease_id uuid not null references public.leases (id) on delete cascade,
  reference_index text,
  reference_value numeric(12, 4),
  last_revision_date date,
  last_index text,
  last_value numeric(12, 4),
  next_revision_date date,
  next_index text,
  scale text,
  next_value numeric(12, 4),
  created_at timestamptz not null default timezone('utc', now()),
  constraint lease_revisions_lease_unique unique (lease_id)
);

create table if not exists public.lease_secondary_lots (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases (id) on delete cascade,
  annex_property_id uuid references public.properties (id) on delete set null,
  designation text,
  detail text,
  ref_lot_secondary text,
  surface numeric(10, 2),
  surface_carrez numeric(10, 2),
  surface_corrigee numeric(10, 2),
  surface_plancher numeric(10, 2),
  surface_terrain numeric(10, 2),
  surface_utile numeric(10, 2),
  surface_utile_nette numeric(10, 2),
  surface_utile_brute numeric(10, 2),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists lease_secondary_lots_lease_id_idx
  on public.lease_secondary_lots (lease_id);

create trigger buildings_set_updated_at
before update on public.buildings
for each row execute function public.set_updated_at();

create or replace view public.properties_overview
with (security_invoker = true)
as
select
  p.id,
  p.ref_lot,
  p.main_type,
  p.nb_pieces,
  p.surface,
  p.building_name,
  p.address,
  p.floor,
  p.dpe_grade,
  p.status,
  p.is_annex,
  coalesce(f.tenant_label, l.tenant_label, 'Vacant') as tenant_label,
  f.net_rent,
  f.rental_charges,
  f.deposit,
  f.lease_seniority_months,
  coalesce(f.notice_in_progress, l.notice_in_progress, p.notice_in_progress) as notice_in_progress,
  p.created_at,
  p.updated_at
from public.properties p
left join public.financials f on f.property_id = p.id
left join lateral (
  select tenant_label, notice_in_progress
  from public.leases ls
  where ls.property_id = p.id
    and ls.is_current = true
  order by ls.updated_at desc
  limit 1
) l on true;

alter table public.buildings enable row level security;
alter table public.owners enable row level security;
alter table public.tenant_pseudonyms enable row level security;
alter table public.leases enable row level security;
alter table public.lease_revisions enable row level security;
alter table public.lease_secondary_lots enable row level security;

create policy "buildings_select_authorized"
  on public.buildings for select to authenticated
  using (public.is_authorized_user());

create policy "buildings_write_admin"
  on public.buildings for all to authenticated
  using (public.is_admin_user()) with check (public.is_admin_user());

create policy "owners_select_authorized"
  on public.owners for select to authenticated
  using (public.is_authorized_user());

create policy "owners_write_admin"
  on public.owners for all to authenticated
  using (public.is_admin_user()) with check (public.is_admin_user());

create policy "tenant_pseudonyms_select_authorized"
  on public.tenant_pseudonyms for select to authenticated
  using (public.is_authorized_user());

create policy "tenant_pseudonyms_write_admin"
  on public.tenant_pseudonyms for all to authenticated
  using (public.is_admin_user()) with check (public.is_admin_user());

create policy "leases_select_authorized"
  on public.leases for select to authenticated
  using (public.is_authorized_user());

create policy "leases_write_admin"
  on public.leases for all to authenticated
  using (public.is_admin_user()) with check (public.is_admin_user());

create policy "lease_revisions_select_authorized"
  on public.lease_revisions for select to authenticated
  using (public.is_authorized_user());

create policy "lease_revisions_write_admin"
  on public.lease_revisions for all to authenticated
  using (public.is_admin_user()) with check (public.is_admin_user());

create policy "lease_secondary_lots_select_authorized"
  on public.lease_secondary_lots for select to authenticated
  using (public.is_authorized_user());

create policy "lease_secondary_lots_write_admin"
  on public.lease_secondary_lots for all to authenticated
  using (public.is_admin_user()) with check (public.is_admin_user());
