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

  for (const { table_name } of tables.rows) {
    const cols = await client.query(
      `
      select column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
      order by ordinal_position
    `,
      [table_name],
    );

    console.log(`\n=== ${table_name} ===`);
    for (const col of cols.rows) {
      console.log(`  ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`);
    }
  }

  const views = await client.query(`
    select table_name
    from information_schema.views
    where table_schema = 'public'
    order by table_name
  `);
  console.log('\n=== views ===', views.rows.map((r) => r.table_name).join(', '));
} finally {
  await client.end();
}
