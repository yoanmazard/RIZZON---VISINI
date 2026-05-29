import pg from 'pg';
import { getPoolerConfig } from './pooler-config.mjs';

const client = new pg.Client(getPoolerConfig());

try {
  await client.connect();
  const tables = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `);
  const migrations = await client.query(`
    select version, name
    from supabase_migrations.schema_migrations
    order by version
  `);
  const expected = [
    'allowed_emails',
    'buildings',
    'download_history',
    'financials',
    'lease_revisions',
    'lease_secondary_lots',
    'leases',
    'lot_links',
    'owners',
    'properties',
    'scenarios',
    'simulations',
    'tenant_pseudonyms',
  ];

  const present = new Set(tables.rows.map((row) => row.table_name));
  const missing = expected.filter((name) => !present.has(name));
  const extra = tables.rows
    .map((row) => row.table_name)
    .filter((name) => !expected.includes(name));

  console.log('Tables:', tables.rows.map((row) => row.table_name).join(', '));
  if (missing.length > 0) {
    console.log('MISSING:', missing.join(', '));
  }
  if (extra.length > 0) {
    console.log('EXTRA (hors schéma RIZZON):', extra.join(', '));
  }
  console.log('Migrations:', migrations.rows);
} finally {
  await client.end();
}
