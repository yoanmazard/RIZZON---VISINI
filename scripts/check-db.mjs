import pg from 'pg';
import { getPoolerConfig } from './pooler-config.mjs';

const client = new pg.Client(getPoolerConfig());

try {
  await client.connect();

  const version = await client.query('SELECT version()');
  const schemas = await client.query(`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    ORDER BY schema_name
  `);
  const tables = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name
  `);
  const extensions = await client.query(`
    SELECT extname, extversion
    FROM pg_extension
    ORDER BY extname
  `);

  console.log('=== Connexion OK ===');
  console.log('Version:', version.rows[0].version.split(',')[0]);
  console.log('\n=== Schémas ===');
  for (const row of schemas.rows) console.log('-', row.schema_name);
  console.log('\n=== Tables ===');
  if (tables.rows.length === 0) console.log('(aucune table applicative)');
  for (const row of tables.rows) console.log(`- ${row.table_schema}.${row.table_name}`);
  console.log('\n=== Extensions ===');
  for (const row of extensions.rows) console.log(`- ${row.extname} (${row.extversion})`);
} catch (error) {
  console.error('Erreur de connexion:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
