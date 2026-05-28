'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { BasketMode, ScenarioRecord } from '@/lib/basket/types';

type SaveScenarioResult = {
  ok: boolean;
  message: string;
  scenario?: ScenarioRecord;
};

export async function saveScenario(
  name: string,
  propertyIds: string[],
  mode: BasketMode,
): Promise<SaveScenarioResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, message: 'Nom de scénario requis.' };
  }

  if (propertyIds.length === 0) {
    return { ok: false, message: 'Sélectionnez au moins un lot.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Session expirée.' };
  }

  const { data, error } = await supabase
    .from('scenarios')
    .insert({
      user_id: user.id,
      name: trimmedName,
      mode,
      property_ids: propertyIds,
    })
    .select('id, name, mode, property_ids, created_at')
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/dashboard');

  return {
    ok: true,
    message: 'Scénario enregistré.',
    scenario: data as ScenarioRecord,
  };
}

export async function deleteScenario(scenarioId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Session expirée.' };
  }

  const { error } = await supabase
    .from('scenarios')
    .delete()
    .eq('id', scenarioId)
    .eq('user_id', user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/dashboard');
  return { ok: true, message: 'Scénario supprimé.' };
}
