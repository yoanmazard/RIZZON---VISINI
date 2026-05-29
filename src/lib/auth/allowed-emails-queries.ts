import { createClient } from '@/lib/supabase/server';
import { requireAdmin, type AppRole } from '@/lib/auth/access';

export type AllowedEmailRecord = {
  id: string;
  email: string;
  role: AppRole;
  is_active: boolean;
  created_at: string;
};

export async function fetchAllowedEmails(): Promise<AllowedEmailRecord[]> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_allowed_emails_admin');

  if (error) {
    console.error('[fetchAllowedEmails]', error.message);
    return [];
  }

  return (data ?? []) as AllowedEmailRecord[];
}

async function countActiveAdmins(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc('count_active_admins');

  if (error) {
    throw new Error(error.message);
  }

  return (data as number | null) ?? 0;
}

async function getRecordById(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data, error } = await supabase
    .from('allowed_emails')
    .select('id, email, role, is_active, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as AllowedEmailRecord | null;
}

export { countActiveAdmins, getRecordById };
