import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getPoolerConfig } from './pooler-config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');

const client = new pg.Client({
  ...getPoolerConfig(),
  prepare: false,
});

function getVersion(fileName) {
  return fileName.match(/^(\d+)/)?.[1] ?? null;
}

function getName(fileName) {
  return fileName.replace(/^\d+_/, '').replace(/\.sql$/, '');
}

try {
  await client.connect();

  const { rows } = await client.query(`
    select version
    from supabase_migrations.schema_migrations
  `);
  const applied = new Set(rows.map((row) => row.version));

  const pending = readdirSync(root)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .filter((file) => {
      const version = getVersion(file);
      return version && !applied.has(version);
    });

  if (pending.length === 0) {
    console.log('Aucune migration en attente.');
    process.exit(0);
  }

  for (const file of pending) {
    const version = getVersion(file);
    const sql = readFileSync(join(root, file), 'utf8');
    console.log(`Applying ${file}...`);

    await client.query('begin');
    try {
      await client.query(sql);
      await client.query(
        'insert into supabase_migrations.schema_migrations(version, name) values ($1, $2)',
        [version, getName(file)],
      );
      await client.query('commit');
      console.log(`OK ${file}`);
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }
} finally {
  await client.end();
}
