const password = process.env.SUPABASE_DB_PASSWORD ?? 'bipjEd-3gadgi-firryr';
const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'qgnqgvwkgynmbxpyjtna';
const poolerHost =
  process.env.SUPABASE_POOLER_HOST ?? 'aws-1-eu-north-1.pooler.supabase.com';
const poolerPort = Number(process.env.SUPABASE_POOLER_PORT ?? 6543);

export function getPoolerConfig() {
  return {
    host: poolerHost,
    port: poolerPort,
    user: `postgres.${projectRef}`,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  };
}

export function getPoolerUrl() {
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://postgres.${projectRef}:${encodedPassword}@${poolerHost}:${poolerPort}/postgres`;
}
