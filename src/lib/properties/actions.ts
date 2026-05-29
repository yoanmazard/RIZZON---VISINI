'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/access';

type Result = { ok: boolean; message: string };

/** Marque (ou retire) un lot comme « en vente ». Réservé admin. */
export async function setPropertyForSale(propertyId: string, value: boolean): Promise<Result> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('properties')
    .update({ for_sale: value })
    .eq('id', propertyId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/panier');
  return { ok: true, message: value ? 'Lot marqué en vente.' : 'Lot retiré de la vente.' };
}
