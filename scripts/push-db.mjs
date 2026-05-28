import { spawnSync } from 'child_process';
import { getPoolerUrl } from './pooler-config.mjs';

const result = spawnSync(
  'supabase',
  ['db', 'push', '--db-url', getPoolerUrl(), '--yes'],
  { stdio: 'inherit', shell: true },
);

process.exit(result.status ?? 1);
