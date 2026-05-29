-- Attribut « en vente » (mise en vente d'un lot), indépendant du statut locatif :
-- un lot peut être loué OU vacant, ET en vente.

alter table public.properties
  add column if not exists for_sale boolean not null default false;

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
  p.postal_code,
  p.city,
  p.door,
  p.usage_type,
  p.dpe_kwh_ep,
  p.ges_grade,
  p.dpe_date,
  p.ges_co2_m2,
  f.annual_rent_ttc,
  f.rent_ttc_per_sqm_hab,
  p.for_sale,
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

grant select on public.properties_overview to anon, authenticated;
