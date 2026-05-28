'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { formValuesToSimulationPayload } from '@/lib/simulations/types';
import type { SimulationFormValues } from '@/lib/simulations/types';

type SaveSimulationResult = {
  ok: boolean;
  message: string;
};

export async function saveIndividualSimulation(
  propertyId: string,
  values: SimulationFormValues,
): Promise<SaveSimulationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Session expirée.' };
  }

  const payload = {
    property_id: propertyId,
    scenario_id: null,
    ...formValuesToSimulationPayload(values),
  };

  const { data: existing } = await supabase
    .from('simulations')
    .select('id')
    .eq('property_id', propertyId)
    .is('scenario_id', null)
    .maybeSingle();

  const query = existing
    ? supabase.from('simulations').update(payload).eq('id', existing.id)
    : supabase.from('simulations').insert(payload);

  const { error } = await query;

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/dashboard');
  return { ok: true, message: 'Hypothèses enregistrées.' };
}
