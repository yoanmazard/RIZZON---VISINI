-- Rôles admin / owner — restrictions données source et audit exports

create or replace function public.is_admin_user()
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
      and ae.role = 'admin'
  );
$$;

-- Données source : lecture pour tous les comptes autorisés, écriture admin uniquement
drop policy if exists "properties_all_authorized" on public.properties;
drop policy if exists "lot_links_all_authorized" on public.lot_links;
drop policy if exists "financials_all_authorized" on public.financials;

create policy "properties_select_authorized"
  on public.properties
  for select
  to authenticated
  using (public.is_authorized_user());

create policy "properties_write_admin"
  on public.properties
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "lot_links_select_authorized"
  on public.lot_links
  for select
  to authenticated
  using (public.is_authorized_user());

create policy "lot_links_write_admin"
  on public.lot_links
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "financials_select_authorized"
  on public.financials
  for select
  to authenticated
  using (public.is_authorized_user());

create policy "financials_write_admin"
  on public.financials
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Audit exports : enregistrement pour tous, consultation admin uniquement
drop policy if exists "download_history_select_own" on public.download_history;

create policy "download_history_select_admin"
  on public.download_history
  for select
  to authenticated
  using (public.is_admin_user());
