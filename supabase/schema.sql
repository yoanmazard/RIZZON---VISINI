-- Projet RIZZON — schéma métier V1 (cahier des charges §5)
-- Généré automatiquement depuis la base Supabase distante.
-- Source de vérité : supabase/migrations/*.sql

create table if not exists public.allowed_emails (
  id uuid not null default gen_random_uuid(),
  email text not null,
  role text not null default 'owner'::text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.properties (
  id uuid not null default gen_random_uuid(),
  ref_lot text not null,
  main_type text not null,
  nb_pieces integer,
  surface numeric,
  building_name text,
  address text,
  floor text,
  dpe_grade text,
  status text not null default 'Vacant'::text,
  is_annex boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.lot_links (
  id uuid not null default gen_random_uuid(),
  primary_id uuid not null,
  annex_id uuid not null,
  link_source text not null default 'auto'::text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.financials (
  id uuid not null default gen_random_uuid(),
  property_id uuid not null,
  tenant_label text not null default 'Vacant'::text,
  net_rent numeric not null default 0,
  rental_charges numeric not null default 0,
  deposit numeric not null default 0,
  lease_seniority_months integer,
  notice_in_progress boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.simulations (
  id uuid not null default gen_random_uuid(),
  property_id uuid not null,
  scenario_id uuid,
  target_purchase_price numeric,
  target_rent numeric,
  target_resale_price numeric,
  estimated_works numeric default 0,
  notary_fee_rate numeric default 0.08,
  annual_property_tax numeric default 0,
  non_recoverable_charges numeric default 0,
  vacancy_rate numeric default 0,
  mgmt_fee_rate numeric default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.scenarios (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  mode text not null default 'lié'::text,
  property_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.download_history (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  exported_at timestamptz not null default timezone('utc'::text, now()),
  file_name text not null,
  scenario_name text,
  row_count integer not null default 0
);

create or replace view public.properties_overview
with (security_invoker = true)
as
SELECT p.id,
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
    f.tenant_label,
    f.net_rent,
    f.rental_charges,
    f.deposit,
    f.lease_seniority_months,
    f.notice_in_progress,
    p.created_at,
    p.updated_at
   FROM properties p
     LEFT JOIN financials f ON f.property_id = p.id;;
