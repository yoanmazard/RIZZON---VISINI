-- Liste blanche : lecture restreinte aux admins (liste complète) ou à sa propre ligne

drop policy if exists "allowed_emails_select_authenticated" on public.allowed_emails;

create policy "allowed_emails_select_scoped"
  on public.allowed_emails
  for select
  to authenticated
  using (
    public.is_authorized_user()
    and (
      public.is_admin_user()
      or email = (
        select lower(u.email)
        from auth.users u
        where u.id = auth.uid()
      )
    )
  );

create policy "allowed_emails_write_admin"
  on public.allowed_emails
  for insert
  to authenticated
  with check (public.is_admin_user());

create policy "allowed_emails_update_admin"
  on public.allowed_emails
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "allowed_emails_delete_admin"
  on public.allowed_emails
  for delete
  to authenticated
  using (public.is_admin_user());
