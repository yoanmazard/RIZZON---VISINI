import pg from 'pg';
import { getPoolerConfig } from './pooler-config.mjs';

const client = new pg.Client(getPoolerConfig());

try {
  await client.connect();

  const fks = await client.query(`
    select
      tc.table_name,
      kcu.column_name,
      ccu.table_name as foreign_table_name,
      ccu.column_name as foreign_column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
      and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and tc.table_name like 'prioritization%'
  `);

  const counts = await client.query(`
    select 'prioritization_sessions' as table_name, count(*)::int as count from public.prioritization_sessions
    union all
    select 'prioritization_items', count(*)::int from public.prioritization_items
  `);

  console.log('counts', counts.rows);
  console.log('fks', fks.rows);

  const items = await client.query('select * from public.prioritization_items limit 3');
  console.log('sample items', items.rows);
} finally {
  await client.end();
}
