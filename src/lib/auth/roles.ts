import type { SupabaseClient } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'owner';

export function getAdminEmailsFromEnv() {
  return (process.env.ADMIN_EMAILS ?? 'yoan@mmimm.fr')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminRole(role: string | null | undefined) {
  return role === 'admin';
}

export async function resolveUserRole(
  supabase: SupabaseClient,
  email: string,
): Promise<AppRole> {
  const normalized = email.toLowerCase();
  const { data: roleFromDb, error } = await supabase.rpc('get_current_user_role');

  if (roleFromDb === 'admin') return 'admin';
  if (roleFromDb === 'owner') return 'owner';

  if ((error || !roleFromDb) && getAdminEmailsFromEnv().includes(normalized)) {
    return 'admin';
  }

  return 'owner';
}
