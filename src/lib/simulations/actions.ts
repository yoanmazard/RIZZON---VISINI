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
  revalidatePath('/dashboard/panier');
  return { ok: true, message: 'Hypothèses enregistrées.' };
}

/**
 * Enregistre les hypothèses de plusieurs lots en une fois (édition inline du panier).
 */
export async function saveSimulationsBatch(
  entries: { propertyId: string; values: SimulationFormValues }[],
): Promise<SaveSimulationResult> {
  if (entries.length === 0) {
    return { ok: true, message: 'Rien à enregistrer.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Session expirée.' };
  }

  for (const { propertyId, values } of entries) {
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
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/panier');
  return {
    ok: true,
    message: `Hypothèses enregistrées (${entries.length} lot${entries.length > 1 ? 's' : ''}).`,
  };
}
