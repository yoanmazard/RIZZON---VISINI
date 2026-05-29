import pg from 'pg';
import { getPoolerConfig } from './pooler-config.mjs';

const client = new pg.Client(getPoolerConfig());

try {
  await client.connect();
  const rows = await client.query(
    'select email, role, is_active from public.allowed_emails order by email',
  );
  console.log('allowed_emails:', rows.rows);

  const fns = await client.query(`
    select proname
    from pg_proc
    join pg_namespace n on n.oid = pg_proc.pronamespace
    where n.nspname = 'public'
      and proname in ('get_current_user_role', 'is_admin_user', 'list_allowed_emails_admin')
  `);
  console.log('functions:', fns.rows.map((row) => row.proname));
} finally {
  await client.end();
}
