import { createClient } from '@/lib/supabase/server';

export type AppRole = 'admin' | 'owner';

export type UserAccess = {
  email: string;
  role: AppRole;
  isAdmin: boolean;
};

export function isAdminRole(role: string | null | undefined) {
  return role === 'admin';
}

export async function getCurrentUserAccess(): Promise<UserAccess | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase();
  if (!email) return null;

  const { data } = await supabase
    .from('allowed_emails')
    .select('role')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle();

  const role: AppRole = data?.role === 'admin' ? 'admin' : 'owner';

  return {
    email,
    role,
    isAdmin: role === 'admin',
  };
}

export async function requireAdmin(): Promise<
  { ok: true; access: UserAccess } | { ok: false; message: string }
> {
  const access = await getCurrentUserAccess();

  if (!access) {
    return { ok: false, message: 'Session expirée. Reconnectez-vous.' };
  }

  if (!access.isAdmin) {
    return { ok: false, message: 'Action réservée aux administrateurs.' };
  }

  return { ok: true, access };
}
