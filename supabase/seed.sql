-- Projet RIZZON

insert into public.allowed_emails (email, role)
values
  ('yoan@mmimm.fr', 'admin'),
  ('yoan.mazard@gmail.com', 'owner'),
  ('arnaud.visini@gmail.com', 'owner')
on conflict (email) do update
set role = excluded.role,
    is_active = true;
