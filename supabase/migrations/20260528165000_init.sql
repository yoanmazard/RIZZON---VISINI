-- Plateforme d'analyse d'acquisition immobilière — Sci Mazard et frères
-- Schéma V1 conforme au cahier des charges (28/05/2026)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Liste blanche des accès (1 à 2 e-mails autorisés)
-- ---------------------------------------------------------------------------

create table public.allowed_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'owner'
    check (role in ('owner', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint allowed_emails_email_unique unique (email),
  constraint allowed_emails_email_lowercase check (email = lower(email))
);

comment on table public.allowed_emails is
  'Liste blanche des comptes autorisés (Google OAuth + MFA obligatoire).';

create or replace function public.is_authorized_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_emails ae
    join auth.users u on lower(u.email) = lower(ae.email)
    where u.id = auth.uid()
      and ae.is_active = true
  );
$$;

-- ---------------------------------------------------------------------------
-- Lots immobiliers
-- ---------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  ref_lot text not null,
  main_type text not null,
  nb_pieces integer,
  surface numeric(10, 2),
  building_name text,
  address text,
  floor text,
  dpe_grade text,
  status text not null default 'Vacant'
    check (status in ('Loué', 'Vacant')),
  is_annex boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint properties_ref_lot_unique unique (ref_lot)
);

comment on table public.properties is 'Lots : appartements, garages, caves, parkings.';
comment on column public.properties.ref_lot is 'Mapping CSV : N° Lot / Code unique.';
comment on column public.properties.main_type is 'Mapping CSV : Type de lot.';
comment on column public.properties.nb_pieces is 'Mapping CSV : Nb de pièces (nullable pour annexes).';
comment on column public.properties.surface is 'Mapping CSV : Surface habitable ou Surface utile.';
comment on column public.properties.building_name is 'Mapping CSV : Immeuble / Nom Bâtiment.';
comment on column public.properties.address is 'Mapping CSV : Adresse du lot + Ville.';
comment on column public.properties.floor is 'Mapping CSV : Etage.';
comment on column public.properties.dpe_grade is 'Mapping CSV : DPE.';
comment on column public.properties.status is 'Calculé à l''import (cf. règle Loué/Vacant).';
comment on column public.properties.is_annex is 'true si garage, cave ou parking.';

create index properties_status_idx on public.properties (status);
create index properties_building_name_idx on public.properties (building_name);
create index properties_is_annex_idx on public.properties (is_annex);

create trigger properties_set_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Associations appartement / annexes (N annexes par lot principal)
-- ---------------------------------------------------------------------------

create table public.lot_links (
  id uuid primary key default gen_random_uuid(),
  primary_id uuid not null references public.properties (id) on delete cascade,
  annex_id uuid not null references public.properties (id) on delete cascade,
  link_source text not null default 'auto'
    check (link_source in ('auto', 'manuel')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint lot_links_primary_annex_unique unique (primary_id, annex_id),
  constraint lot_links_no_self_link check (primary_id <> annex_id)
);

comment on table public.lot_links is
  'Liens appartement ↔ annexes. Reconstruit depuis N° lot secondaire / Désignation.';
comment on column public.lot_links.link_source is 'auto (CSV) ou manuel (correction UI).';

create index lot_links_primary_id_idx on public.lot_links (primary_id);
create index lot_links_annex_id_idx on public.lot_links (annex_id);

-- ---------------------------------------------------------------------------
-- Données financières actuelles (pseudonymisées)
-- ---------------------------------------------------------------------------

create table public.financials (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  tenant_label text not null default 'Vacant',
  net_rent numeric(12, 2) not null default 0,
  rental_charges numeric(12, 2) not null default 0,
  deposit numeric(12, 2) not null default 0,
  lease_seniority_months integer,
  notice_in_progress boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint financials_property_unique unique (property_id),
  constraint financials_tenant_label_check check (
    tenant_label = 'Vacant' or tenant_label ~ '^Locataire [0-9]+$'
  )
);

comment on table public.financials is
  'Données financières pseudonymisées. Aucune donnée nominative.';
comment on column public.financials.tenant_label is 'Locataire 1, Locataire 2… ou Vacant.';
comment on column public.financials.net_rent is 'Loyer HORS charges — mapping CSV : Loyer HT.';
comment on column public.financials.rental_charges is 'Mapping CSV : Provisions HT/TTC.';
comment on column public.financials.deposit is 'Mapping CSV : DDG.';
comment on column public.financials.lease_seniority_months is
  'Ancienneté du bail en mois (dérivée, non nominative).';
comment on column public.financials.notice_in_progress is 'Mapping CSV : Préavis en cours.';

create index financials_tenant_label_idx on public.financials (tenant_label);

create trigger financials_set_updated_at
before update on public.financials
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Scénarios de groupement / arbitrage
-- ---------------------------------------------------------------------------

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  mode text not null default 'lié'
    check (mode in ('lié', 'délié')),
  property_ids uuid[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.scenarios is
  'Scénarios sauvegardés : panier d''acquisition, modes lié/délié.';
comment on column public.scenarios.mode is 'lié (ensemble) ou délié (arbitrage séparé).';
comment on column public.scenarios.property_ids is 'Lots inclus dans le scénario.';

create index scenarios_user_id_idx on public.scenarios (user_id);
create index scenarios_created_at_idx on public.scenarios (created_at desc);

create trigger scenarios_set_updated_at
before update on public.scenarios
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Hypothèses d'acquisition par lot
-- ---------------------------------------------------------------------------

create table public.simulations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  scenario_id uuid references public.scenarios (id) on delete cascade,
  target_purchase_price numeric(14, 2),
  target_rent numeric(12, 2),
  target_resale_price numeric(14, 2),
  estimated_works numeric(14, 2) default 0,
  notary_fee_rate numeric(5, 4) default 0.08,
  annual_property_tax numeric(12, 2) default 0,
  non_recoverable_charges numeric(12, 2) default 0,
  vacancy_rate numeric(5, 4) default 0,
  mgmt_fee_rate numeric(5, 4) default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint simulations_vacancy_rate_range check (vacancy_rate >= 0 and vacancy_rate <= 1),
  constraint simulations_mgmt_fee_rate_range check (mgmt_fee_rate >= 0 and mgmt_fee_rate <= 1),
  constraint simulations_notary_fee_rate_range check (notary_fee_rate >= 0 and notary_fee_rate <= 1)
);

comment on table public.simulations is
  'Hypothèses acquéreur : prix, loyer cible, travaux, charges, vacance.';
comment on column public.simulations.scenario_id is
  'Null = hypothèse individuelle sur fiche lot ; renseigné si scénario sauvegardé.';
comment on column public.simulations.notary_fee_rate is
  'Taux frais de notaire (défaut 8 %, paramétrable en UI).';

create index simulations_property_id_idx on public.simulations (property_id);
create index simulations_scenario_id_idx on public.simulations (scenario_id);

create trigger simulations_set_updated_at
before update on public.simulations
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Historique des exports Excel
-- ---------------------------------------------------------------------------

create table public.download_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exported_at timestamptz not null default timezone('utc', now()),
  file_name text not null,
  scenario_name text,
  row_count integer not null default 0 check (row_count >= 0)
);

comment on table public.download_history is
  'Audit des exports .xlsx (banquier, courtier).';

create index download_history_user_id_idx on public.download_history (user_id);
create index download_history_exported_at_idx on public.download_history (exported_at desc);

-- ---------------------------------------------------------------------------
-- Vue pratique pour le tableau de bord
-- ---------------------------------------------------------------------------

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
  f.tenant_label,
  f.net_rent,
  f.rental_charges,
  f.deposit,
  f.lease_seniority_months,
  f.notice_in_progress,
  p.created_at,
  p.updated_at
from public.properties p
left join public.financials f on f.property_id = p.id;

comment on view public.properties_overview is
  'Vue lecture seule : lots + financials pour le data grid.';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.allowed_emails enable row level security;
alter table public.properties enable row level security;
alter table public.lot_links enable row level security;
alter table public.financials enable row level security;
alter table public.scenarios enable row level security;
alter table public.simulations enable row level security;
alter table public.download_history enable row level security;

-- allowed_emails : lecture pour utilisateurs autorisés ; écriture réservée au service role
create policy "allowed_emails_select_authenticated"
  on public.allowed_emails
  for select
  to authenticated
  using (public.is_authorized_user());

-- Portefeuille partagé entre les comptes autorisés (1 investisseur, 1-2 accès)
create policy "properties_all_authorized"
  on public.properties
  for all
  to authenticated
  using (public.is_authorized_user())
  with check (public.is_authorized_user());

create policy "lot_links_all_authorized"
  on public.lot_links
  for all
  to authenticated
  using (public.is_authorized_user())
  with check (public.is_authorized_user());

create policy "financials_all_authorized"
  on public.financials
  for all
  to authenticated
  using (public.is_authorized_user())
  with check (public.is_authorized_user());

create policy "simulations_all_authorized"
  on public.simulations
  for all
  to authenticated
  using (public.is_authorized_user())
  with check (public.is_authorized_user());

create policy "scenarios_select_own_or_authorized"
  on public.scenarios
  for select
  to authenticated
  using (public.is_authorized_user());

create policy "scenarios_insert_own"
  on public.scenarios
  for insert
  to authenticated
  with check (public.is_authorized_user() and user_id = auth.uid());

create policy "scenarios_update_own"
  on public.scenarios
  for update
  to authenticated
  using (public.is_authorized_user() and user_id = auth.uid())
  with check (public.is_authorized_user() and user_id = auth.uid());

create policy "scenarios_delete_own"
  on public.scenarios
  for delete
  to authenticated
  using (public.is_authorized_user() and user_id = auth.uid());

create policy "download_history_select_own"
  on public.download_history
  for select
  to authenticated
  using (public.is_authorized_user() and user_id = auth.uid());

create policy "download_history_insert_own"
  on public.download_history
  for insert
  to authenticated
  with check (public.is_authorized_user() and user_id = auth.uid());
