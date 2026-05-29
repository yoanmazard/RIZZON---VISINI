import pg from 'pg';
import { getPoolerConfig } from './pooler-config.mjs';

const client = new pg.Client(getPoolerConfig());

const checks = [
  {
    label: 'Tables RIZZON',
    sql: `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
        and table_name in (
          'allowed_emails', 'buildings', 'download_history', 'financials',
          'lease_revisions', 'lease_secondary_lots', 'leases', 'lot_links',
          'owners', 'properties', 'scenarios', 'simulations', 'tenant_pseudonyms'
        )
      order by table_name
    `,
    expect: 13,
  },
  {
    label: 'Vue properties_overview',
    sql: `
      select count(*)::int as count
      from information_schema.views
      where table_schema = 'public'
        and table_name = 'properties_overview'
    `,
    expect: 1,
  },
  {
    label: 'Fonctions auth/admin',
    sql: `
      select count(*)::int as count
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'is_authorized_user',
          'is_admin_user',
          'get_current_user_role',
          'current_user_email',
          'list_allowed_emails_admin',
          'count_active_admins'
        )
    `,
    expect: 6,
  },
  {
    label: 'Comptes autorisés',
    sql: `
      select count(*)::int as count
      from public.allowed_emails
      where is_active = true
    `,
    expect: 3,
  },
  {
    label: 'Tables étrangères absentes',
    sql: `
      select count(*)::int as count
      from information_schema.tables
      where table_schema = 'public'
        and table_name like 'prioritization%'
    `,
    expect: 0,
  },
];

try {
  await client.connect();
  console.log('=== Audit Supabase RIZZON ===\n');

  let ok = true;

  for (const check of checks) {
    const result = await client.query(check.sql);
    const value =
      check.expect === 7
        ? result.rows.length
        : check.expect === 1 && result.rows[0]?.count !== undefined
          ? result.rows[0].count
          : result.rows[0]?.count ?? result.rows.length;

    const pass = value === check.expect;
    if (!pass) ok = false;

    console.log(`${pass ? 'OK' : 'FAIL'} · ${check.label} (${value}/${check.expect})`);
    if (check.label === 'Tables RIZZON') {
      console.log('   ', result.rows.map((row) => row.table_name).join(', '));
    }
    if (check.label === 'Comptes autorisés') {
      const accounts = await client.query(
        'select email, role from public.allowed_emails order by email',
      );
      for (const row of accounts.rows) {
        console.log(`    - ${row.email} (${row.role})`);
      }
    }
  }

  console.log(`\n${ok ? 'Supabase RIZZON prêt.' : 'Des écarts subsistent.'}`);
  process.exit(ok ? 0 : 1);
} finally {
  await client.end();
}
