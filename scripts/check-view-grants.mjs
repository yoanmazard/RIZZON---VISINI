import pg from 'pg';
import { getPoolerConfig } from './pooler-config.mjs';

const client = new pg.Client(getPoolerConfig());

try {
  await client.connect();

  const overview = await client.query('select count(*)::int as count from public.properties_overview');
  console.log('properties_overview rows:', overview.rows[0].count);

  const grants = await client.query(`
    select table_name, grantee, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('properties_overview', 'properties', 'financials')
    order by table_name, grantee
  `);
  console.log('grants:', grants.rows);
} finally {
  await client.end();
}
