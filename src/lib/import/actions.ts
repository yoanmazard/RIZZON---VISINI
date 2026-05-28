'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { buildAutoLotLinks } from '@/lib/import/lot-links';
import type { CleanLotImportRow, ImportActionResult } from '@/lib/import/types';

const BATCH_SIZE = 100;

export async function importCleanLots(rows: CleanLotImportRow[]): Promise<ImportActionResult> {
  if (rows.length === 0) {
    return { ok: false, message: 'Aucune ligne à importer.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Session expirée. Reconnectez-vous.' };
  }

  const refToId = new Map<string, string>();

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const propertyPayload = batch.map((row) => ({
      ref_lot: row.ref_lot,
      main_type: row.main_type,
      nb_pieces: row.nb_pieces,
      surface: row.surface,
      building_name: row.building_name,
      address: row.address,
      floor: row.floor,
      dpe_grade: row.dpe_grade,
      status: row.status,
      is_annex: row.is_annex,
    }));

    const { data: properties, error: propertyError } = await supabase
      .from('properties')
      .upsert(propertyPayload, { onConflict: 'ref_lot' })
      .select('id, ref_lot');

    if (propertyError) {
      return { ok: false, message: `Erreur properties : ${propertyError.message}` };
    }

    for (const property of properties ?? []) {
      refToId.set(property.ref_lot, property.id);
    }

    const financialPayload = batch
      .map((row) => {
        const propertyId = refToId.get(row.ref_lot);
        if (!propertyId) return null;

        return {
          property_id: propertyId,
          tenant_label: row.tenant_label,
          net_rent: row.net_rent,
          rental_charges: row.rental_charges,
          deposit: row.deposit,
          lease_seniority_months: row.lease_seniority_months,
          notice_in_progress: row.notice_in_progress,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const { error: financialError } = await supabase
      .from('financials')
      .upsert(financialPayload, { onConflict: 'property_id' });

    if (financialError) {
      return { ok: false, message: `Erreur financials : ${financialError.message}` };
    }
  }

  await supabase.from('lot_links').delete().eq('link_source', 'auto');

  const autoLinks = buildAutoLotLinks(rows);
  const linkPayload = autoLinks
    .map((link) => {
      const primaryId = refToId.get(link.primary_ref);
      const annexId = refToId.get(link.annex_ref);
      if (!primaryId || !annexId) return null;

      return {
        primary_id: primaryId,
        annex_id: annexId,
        link_source: 'auto' as const,
      };
    })
    .filter((link): link is NonNullable<typeof link> => Boolean(link));

  if (linkPayload.length > 0) {
    const { error: linkError } = await supabase
      .from('lot_links')
      .upsert(linkPayload, { onConflict: 'primary_id,annex_id' });

    if (linkError) {
      return { ok: false, message: `Erreur lot_links : ${linkError.message}` };
    }
  }

  revalidatePath('/dashboard');

  return {
    ok: true,
    message: `${rows.length} lot(s) importé(s) avec succès.`,
    imported: rows.length,
    linksCreated: linkPayload.length,
  };
}
