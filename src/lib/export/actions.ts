'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type RecordDownloadResult = {
  ok: boolean;
  message: string;
};

export async function recordDownload(
  fileName: string,
  scenarioName: string | null,
  rowCount: number,
): Promise<RecordDownloadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Session expirée.' };
  }

  const { error } = await supabase.from('download_history').insert({
    user_id: user.id,
    file_name: fileName,
    scenario_name: scenarioName,
    row_count: rowCount,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/historique');

  return { ok: true, message: 'Export enregistré dans l’historique.' };
}
