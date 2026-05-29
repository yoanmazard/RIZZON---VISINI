import { createClient } from '@/lib/supabase/server';
import { isAdminRole, resolveUserRole, type AppRole } from '@/lib/auth/roles';

export type { AppRole };

export type UserAccess = {
  email: string;
  role: AppRole;
  isAdmin: boolean;
};

export { isAdminRole };

export async function getCurrentUserAccess(): Promise<UserAccess | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase();
  if (!email) return null;

  const role = await resolveUserRole(supabase, email);

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
