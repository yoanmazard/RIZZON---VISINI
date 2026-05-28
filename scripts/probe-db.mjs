import pg from 'pg';

const password = 'bipjEd-3gadgi-firryr';
const projectRef = 'qgnqgvwkgynmbxpyjtna';

const attempts = [
  {
    label: 'Direct IPv6',
    config: {
      host: '2a05:d016:c4a:9702:530c:b2f2:1203:f433',
      port: 5432,
      user: 'postgres',
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    },
  },
  {
    label: 'Direct hostname IPv6 family',
    config: {
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      user: 'postgres',
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      family: 6,
    },
  },
  ...['eu-west-1', 'eu-west-3', 'eu-central-1', 'eu-north-1'].map((region) => ({
    label: `Pooler aws-0 ${region}`,
    config: {
      host: `aws-0-${region}.pooler.supabase.com`,
      port: 6543,
      user: `postgres.${projectRef}`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    },
  })),
  {
    label: 'Pooler aws-1 eu-north-1 (production)',
    config: {
      host: 'aws-1-eu-north-1.pooler.supabase.com',
      port: 6543,
      user: `postgres.${projectRef}`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    },
  },
];

for (const attempt of attempts) {
  const client = new pg.Client(attempt.config);
  try {
    await client.connect();
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log(`OK via ${attempt.label}`);
    console.log(result.rows[0]);
    await client.end();
    process.exit(0);
  } catch (error) {
    console.log(`FAIL ${attempt.label}: ${error.message}`);
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

process.exit(1);
