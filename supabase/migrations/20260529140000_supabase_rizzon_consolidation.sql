-- Nettoyage Supabase RIZZON : retirer tables étrangères + consolider droits API

drop table if exists public.prioritization_items cascade;
drop table if exists public.prioritization_sessions cascade;

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant all on all sequences in schema public to postgres, service_role;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.is_authorized_user() to authenticated;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.get_current_user_role() to authenticated;
grant execute on function public.current_user_email() to authenticated;
grant execute on function public.list_allowed_emails_admin() to authenticated;
grant execute on function public.count_active_admins() to authenticated;

grant select on public.properties_overview to anon, authenticated;

-- Garantir les comptes RIZZON
insert into public.allowed_emails (email, role, is_active)
values
  ('yoan@mmimm.fr', 'admin', true),
  ('yoan.mazard@gmail.com', 'owner', true),
  ('arnaud.visini@gmail.com', 'owner', true)
on conflict (email) do update
set role = excluded.role,
    is_active = true;
