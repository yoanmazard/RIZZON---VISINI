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
  console.log('Tables:', tables.rows.map((row) => row.table_name).join(', '));
  console.log('Migrations:', migrations.rows);
} finally {
  await client.end();
}
