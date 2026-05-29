import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export function loadSupabaseAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }

  const candidates = [
    join(homedir(), '.supabase', 'access-token'),
    join(homedir(), 'AppData', 'Roaming', 'supabase', 'access-token'),
    join(homedir(), 'AppData', 'Local', 'supabase', 'access-token'),
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    const token = readFileSync(filePath, 'utf8').trim();
    if (token) return token;
  }

  return null;
}
