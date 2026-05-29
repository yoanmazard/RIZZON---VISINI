-- Correction e-mail yoan.mazard + fonction rôle fiable (contourne la RLS en lecture)

create or replace function public.get_current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ae.role
  from public.allowed_emails ae
  join auth.users u on lower(u.email) = ae.email
  where u.id = auth.uid()
    and ae.is_active = true
  limit 1;
$$;

grant execute on function public.get_current_user_role() to authenticated;

-- Corriger yoan.mazard@gmail.fr → yoan.mazard@gmail.com
insert into public.allowed_emails (email, role, is_active)
values ('yoan.mazard@gmail.com', 'owner', true)
on conflict (email) do update
set role = excluded.role,
    is_active = true;

delete from public.allowed_emails
where email = 'yoan.mazard@gmail.fr';

-- Garantir yoan@mmimm.fr admin
insert into public.allowed_emails (email, role, is_active)
values ('yoan@mmimm.fr', 'admin', true)
on conflict (email) do update
set role = 'admin',
    is_active = true;
