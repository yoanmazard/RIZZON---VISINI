-- Accès admin fiable : éviter la lecture directe de auth.users dans les policies RLS

create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(u.email)
  from auth.users u
  where u.id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_user_email() to authenticated;

create or replace function public.list_allowed_emails_admin()
returns table (
  id uuid,
  email text,
  role text,
  is_active boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select ae.id, ae.email, ae.role, ae.is_active, ae.created_at
  from public.allowed_emails ae
  where public.get_current_user_role() = 'admin'
  order by ae.email asc;
$$;

grant execute on function public.list_allowed_emails_admin() to authenticated;

create or replace function public.count_active_admins()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.allowed_emails ae
  where ae.role = 'admin'
    and ae.is_active = true;
$$;

grant execute on function public.count_active_admins() to authenticated;

drop policy if exists "allowed_emails_select_scoped" on public.allowed_emails;

create policy "allowed_emails_select_scoped"
  on public.allowed_emails
  for select
  to authenticated
  using (
    public.is_authorized_user()
    and (
      public.is_admin_user()
      or email = public.current_user_email()
    )
  );
