import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getPoolerConfig } from './pooler-config.mjs';

const client = new pg.Client({
  ...getPoolerConfig(),
  prepare: false,
});

const root = dirname(fileURLToPath(import.meta.url));
const seedSql = readFileSync(join(root, '..', 'supabase', 'seed.sql'), 'utf8');

try {
  await client.connect();
  await client.query(seedSql);
  const { rows } = await client.query(
    'select email, role from public.allowed_emails order by email',
  );
  console.log('Seed OK:', rows);
} finally {
  await client.end();
}
