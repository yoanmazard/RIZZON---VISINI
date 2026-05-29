-- PostgREST upsert : contraintes UNIQUE explicites (pas d'index partiels)

drop index if exists public.leases_contract_ref_unique;

alter table public.leases
  drop constraint if exists leases_contract_ref_key;

alter table public.leases
  add constraint leases_contract_ref_key unique (contract_ref);

alter table public.owners
  drop constraint if exists owners_name_mandate_key;

alter table public.owners
  add constraint owners_name_mandate_key unique (name, mandate_ref);
