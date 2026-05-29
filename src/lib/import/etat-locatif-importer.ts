import type { SupabaseClient } from '@supabase/supabase-js';
import { isVacantTenant } from '@/lib/import/parse-utils';
import {
  ageFromBirthdate,
  asBoolean,
  asDate,
  asNumber,
  asText,
  computeSeniorityMonths,
  determineEtatLocatifStatus,
  getCol,
  hashTenant,
  resolveIsAnnex,
  resolveMainType,
  resolveRefLot,
  resolveRentalCharges,
  resolveSurface,
  rowHasMainLot,
  type RawMatrixRow,
} from '@/lib/import/etat-locatif-cells';

export type EtatLocatifImportOptions = {
  importSalt?: string;
  onProgress?: (imported: number, total: number) => void;
};

export type EtatLocatifImportResult = {
  imported: number;
  skipped: number;
  linksCreated: number;
};

type PseudonymRecord = { id: string; label: string };

export async function importEtatLocatifRows(
  supabase: SupabaseClient,
  rows: RawMatrixRow[],
  options: EtatLocatifImportOptions = {},
): Promise<EtatLocatifImportResult> {
  const salt = options.importSalt ?? 'rizzon-import-salt';
  const buildingCache = new Map<string, string>();
  const ownerCache = new Map<string, string>();
  const propertyCache = new Map<string, string>();
  const pseudonymCache = new Map<string, PseudonymRecord>();
  let pseudonymCounter = 0;
  let imported = 0;
  let skipped = 0;
  let linksCreated = 0;

  async function upsertBuilding(row: RawMatrixRow) {
    const name = asText(getCol(row, 'buildingName'));
    if (!name) return null;
    if (buildingCache.has(name)) return buildingCache.get(name)!;

    const payload = {
      name,
      address: asText(getCol(row, 'buildingAddress')),
      postal_code: asText(getCol(row, 'buildingPostal')),
      city: asText(getCol(row, 'buildingCity')),
      district: asText(getCol(row, 'buildingDistrict')),
      construction_date: asDate(getCol(row, 'buildingConstructionDate')),
      syndic: asText(getCol(row, 'buildingSyndic')),
      building_code: asText(getCol(row, 'buildingCode')),
      building_sub_name: asText(getCol(row, 'buildingSubName')),
    };

    const { data, error } = await supabase
      .from('buildings')
      .upsert(payload, { onConflict: 'name' })
      .select('id')
      .single();
    if (error) throw error;
    buildingCache.set(name, data.id);
    return data.id;
  }

  async function upsertOwner(row: RawMatrixRow) {
    const name = asText(getCol(row, 'ownerName'));
    if (!name) return null;
    const mandateRef = asText(getCol(row, 'mandateRef'));
    const key = `${name}|${mandateRef ?? ''}`;
    if (ownerCache.has(key)) return ownerCache.get(key)!;

    const { data: existing } = await supabase
      .from('owners')
      .select('id')
      .eq('name', name)
      .eq('mandate_ref', mandateRef)
      .maybeSingle();

    if (existing) {
      ownerCache.set(key, existing.id);
      return existing.id;
    }

    const { data, error } = await supabase
      .from('owners')
      .insert({
        name,
        mandate_ref: mandateRef,
        vat_regime: asText(getCol(row, 'vatRegime')),
        vat_intra: asText(getCol(row, 'vatIntra')),
        mandate_type: asText(getCol(row, 'mandateType')),
      })
      .select('id')
      .single();
    if (error) throw error;
    ownerCache.set(key, data.id);
    return data.id;
  }

  async function upsertPseudonym(row: RawMatrixRow): Promise<PseudonymRecord | null> {
    const code = asText(getCol(row, 'tenantCode'));
    if (!code || isVacantTenant(code)) return null;

    const hash = hashTenant(code, salt);
    if (pseudonymCache.has(hash)) return pseudonymCache.get(hash)!;

    const { data: existing } = await supabase
      .from('tenant_pseudonyms')
      .select('id,label')
      .eq('source_hash', hash)
      .maybeSingle();

    if (existing) {
      pseudonymCache.set(hash, existing);
      return existing;
    }

    if (pseudonymCounter === 0) {
      const { count } = await supabase
        .from('tenant_pseudonyms')
        .select('*', { count: 'exact', head: true });
      pseudonymCounter = count ?? 0;
    }
    pseudonymCounter += 1;

    const { data, error } = await supabase
      .from('tenant_pseudonyms')
      .insert({ label: `Locataire ${pseudonymCounter}`, source_hash: hash })
      .select('id,label')
      .single();
    if (error) throw error;
    pseudonymCache.set(hash, data);
    return data;
  }

  async function upsertProperty(
    row: RawMatrixRow,
    buildingId: string | null,
    refLot: string,
    isAnnex: boolean,
    pseudonym: PseudonymRecord | null,
    overrides: Partial<{
      main_type: string;
      designation: string | null;
      surface: number | null;
    }> = {},
  ) {
    const buildingName = asText(getCol(row, 'buildingName'));
    if (!buildingName) return null;

    const cacheKey = `${buildingName}|${refLot}`;
    const status = determineEtatLocatifStatus(row);
    const tenantCode = asText(getCol(row, 'tenantCode'));
    const isVacant = !tenantCode || isVacantTenant(tenantCode);
    const protectedFlag = !isVacant && (ageFromBirthdate(getCol(row, 'birthDate')) ?? 0) >= 65;
    const notice = asBoolean(getCol(row, 'noticeInProgress')) ?? false;

    const payload = {
      building_id: buildingId,
      building_name: buildingName,
      ref_lot: refLot,
      main_type: overrides.main_type ?? resolveMainType(row),
      detail_type: asText(getCol(row, 'detailType')),
      designation: overrides.designation ?? asText(getCol(row, 'designation')),
      nb_pieces: asNumber(getCol(row, 'nbPieces')),
      usage_type: asText(getCol(row, 'usage')),
      address: asText(getCol(row, 'lotAddress')),
      postal_code: asText(getCol(row, 'buildingPostal')),
      city: asText(getCol(row, 'buildingCity')),
      staircase: asText(getCol(row, 'staircase')),
      floor: asText(getCol(row, 'floor')),
      door: asText(getCol(row, 'door')),
      dpe_grade: asText(getCol(row, 'dpeGrade')),
      dpe_kwh_ep: asNumber(getCol(row, 'dpeKwhEp')),
      ges_grade: asText(getCol(row, 'gesGrade')),
      dpe_date: asDate(getCol(row, 'dpeDate')),
      ges_co2_m2: asNumber(getCol(row, 'gesCo2')),
      surface: overrides.surface ?? resolveSurface(row),
      surface_carrez: asNumber(getCol(row, 'surfaceCarrez')),
      surface_corrigee: asNumber(getCol(row, 'surfaceCorrigee')),
      surface_plancher: asNumber(getCol(row, 'surfacePlancher')),
      surface_terrain: asNumber(getCol(row, 'surfaceTerrain')),
      surface_utile: asNumber(getCol(row, 'surfaceUtile')),
      surface_utile_nette: asNumber(getCol(row, 'surfaceUtileNette')),
      surface_utile_brute: asNumber(getCol(row, 'surfaceUtileBrute')),
      surface_ponderee: asNumber(getCol(row, 'surfacePonderee')),
      fiscality: asText(getCol(row, 'fiscality')),
      is_conventionne_lot: asText(getCol(row, 'isConventionneLot')),
      completion_date: asDate(getCol(row, 'completionDate')),
      gli: asText(getCol(row, 'gli')),
      heating_energy: asText(getCol(row, 'heatingEnergy')),
      is_conventionne: asText(getCol(row, 'isConventionne')),
      is_annex: isAnnex,
      status,
      notice_in_progress: notice,
      tenant_protected_65: protectedFlag,
    };

    const { data, error } = await supabase
      .from('properties')
      .upsert(payload, { onConflict: 'ref_lot' })
      .select('id')
      .single();
    if (error) throw error;
    propertyCache.set(cacheKey, data.id);
    return data.id;
  }

  async function upsertLease(
    row: RawMatrixRow,
    propertyId: string,
    ownerId: string | null,
    pseudonym: PseudonymRecord | null,
  ) {
    const entryDate = asDate(getCol(row, 'entryDate'));
    const tenantLabel = pseudonym?.label ?? 'Vacant';
    const payload = {
      property_id: propertyId,
      pseudonym_id: pseudonym?.id ?? null,
      tenant_label: tenantLabel,
      is_current: true,
      contract_ref: asText(getCol(row, 'contractRef')),
      external_ref: asText(getCol(row, 'externalRef')),
      owner_id: ownerId,
      lease_model: asText(getCol(row, 'leaseModel')),
      lease_type: asText(getCol(row, 'leaseType')),
      tenant_type: asText(getCol(row, 'tenantType')),
      contract_object: asText(getCol(row, 'contractObject')),
      payment_mode: asText(getCol(row, 'paymentMode')),
      lre_active: asBoolean(getCol(row, 'lreActive')),
      renewed_start_date: asDate(getCol(row, 'renewedStart')),
      end_date: asDate(getCol(row, 'endDate')),
      initial_effect_date: asDate(getCol(row, 'initialEffect')),
      termination_date: asDate(getCol(row, 'termination')),
      contractual_exit_date: asDate(getCol(row, 'contractualExit')),
      last_renewal_date: asDate(getCol(row, 'lastRenewalDate')),
      desired_exit_date: asDate(getCol(row, 'desiredExitDate')),
      entry_date: entryDate,
      duration_months: asNumber(getCol(row, 'durationMonths')),
      tacit_renewal: asBoolean(getCol(row, 'tacitRenewal')),
      notice_in_progress: asBoolean(getCol(row, 'noticeInProgress')) ?? false,
      tacit_renewal_accord: asBoolean(getCol(row, 'tacitRenewalAccord')),
      renewal_in_progress: asBoolean(getCol(row, 'renewalInProgress')),
      nb_colocataires: asNumber(getCol(row, 'nbCotenants')),
      nb_garants: asNumber(getCol(row, 'nbGuarantors')),
      nb_cautions: asNumber(getCol(row, 'nbBail')),
      occupation_days: asNumber(getCol(row, 'occupationDays')),
      occupation_pct: asNumber(getCol(row, 'occupationPct')),
      relance_cycle: asText(getCol(row, 'relanceCycle')),
    };

    await supabase
      .from('leases')
      .update({ is_current: false })
      .eq('property_id', propertyId)
      .eq('is_current', true);

    if (payload.contract_ref) {
      const { data: existing } = await supabase
        .from('leases')
        .select('id')
        .eq('contract_ref', payload.contract_ref)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('leases')
          .update(payload)
          .eq('id', existing.id)
          .select('id')
          .single();
        if (error) throw error;
        return { id: data.id as string, entryDate, tenantLabel };
      }
    }

    const { data, error } = await supabase.from('leases').insert(payload).select('id').single();
    if (error) throw error;
    return { id: data.id as string, entryDate, tenantLabel };
  }

  async function upsertFinancials(
    row: RawMatrixRow,
    propertyId: string,
    leaseId: string,
    entryDate: string | null,
    tenantLabel: string,
  ) {
    const payload = {
      property_id: propertyId,
      lease_id: leaseId,
      tenant_label: tenantLabel,
      deposit: asNumber(getCol(row, 'deposit')) ?? 0,
      deposit_type: asText(getCol(row, 'depositType')),
      net_rent: asNumber(getCol(row, 'rentHt')) ?? 0,
      rent_ttc: asNumber(getCol(row, 'rentTtc')),
      rental_charges: resolveRentalCharges(row),
      provisions_ht: asNumber(getCol(row, 'provisionsHt')),
      provisions_ttc: asNumber(getCol(row, 'provisionsTtc')),
      provisions_tf: asNumber(getCol(row, 'provisionsTf')),
      provisions_tom: asNumber(getCol(row, 'provisionsTom')),
      rent_capped: asNumber(getCol(row, 'rentCapped')),
      balance: asNumber(getCol(row, 'balance')),
      vat_management: asText(getCol(row, 'vatManagement')),
      next_dunning_date: asDate(getCol(row, 'nextDunningDate')),
      overrun: asNumber(getCol(row, 'overrun')),
      cumul_rent_ht: asNumber(getCol(row, 'cumulRentHt')),
      cumul_rent_ttc: asNumber(getCol(row, 'cumulRentTtc')),
      billing_frequency: asText(getCol(row, 'billingFreq')),
      payment_due: asText(getCol(row, 'paymentDue')),
      revision_frequency: asText(getCol(row, 'revisionFreq')),
      last_invoice: asText(getCol(row, 'lastInvoice')),
      manual_ventilation: asBoolean(getCol(row, 'manualVent')),
      rent_ht_per_sqm_hab: asNumber(getCol(row, 'rentHtSqmHab')),
      rent_ttc_per_sqm_hab: asNumber(getCol(row, 'rentTtcSqmHab')),
      annual_rent_ht: asNumber(getCol(row, 'annualRentHt')),
      annual_rent_ttc: asNumber(getCol(row, 'annualRentTtc')),
      annual_prov_ht: asNumber(getCol(row, 'annualProvHt')),
      annual_prov_ttc: asNumber(getCol(row, 'annualProvTtc')),
      notice_in_progress: asBoolean(getCol(row, 'noticeInProgress')) ?? false,
      lease_seniority_months: computeSeniorityMonths(entryDate),
    };

    const { error } = await supabase.from('financials').upsert(payload, { onConflict: 'property_id' });
    if (error) throw error;
  }

  async function upsertLeaseRevisions(row: RawMatrixRow, propertyId: string, leaseId: string) {
    const payload = {
      property_id: propertyId,
      lease_id: leaseId,
      reference_index: asText(getCol(row, 'refIndex')),
      reference_value: asNumber(getCol(row, 'refValue')),
      last_revision_date: asDate(getCol(row, 'lastRevDate')),
      last_index: asText(getCol(row, 'lastIndex')),
      last_value: asNumber(getCol(row, 'lastValue')),
      next_revision_date: asDate(getCol(row, 'nextRevDate')),
      next_index: asText(getCol(row, 'nextIndex')),
      scale: asText(getCol(row, 'scale')),
      next_value: asNumber(getCol(row, 'nextValue')),
    };

    if (Object.values(payload).every((value, index) => index < 2 || value == null)) return;

    const { error } = await supabase.from('lease_revisions').upsert(payload, { onConflict: 'lease_id' });
    if (error) throw error;
  }

  async function upsertSecondaryLot(row: RawMatrixRow, leaseId: string, primaryPropertyId: string) {
    const refSecRaw = asText(getCol(row, 'sec_refLot'));
    const designation = asText(getCol(row, 'sec_designation'));
    if (!refSecRaw && !designation) return;

    const refSec = refSecRaw ? resolveRefLot(row, refSecRaw) : null;
    const surface =
      asNumber(getCol(row, 'sec_surface')) ?? asNumber(getCol(row, 'sec_surface_alt'));
    const detail = asText(getCol(row, 'sec_detail'));
    const annexType = detail ?? designation ?? 'Annexe';

    let annexPropertyId: string | null = null;
    if (refSec) {
      annexPropertyId = await upsertProperty(row, null, refSec, true, null, {
        main_type: annexType,
        designation,
        surface,
      });

      if (annexPropertyId) {
        const { error: linkError } = await supabase.from('lot_links').upsert(
          {
            primary_id: primaryPropertyId,
            annex_id: annexPropertyId,
            link_source: 'auto',
          },
          { onConflict: 'primary_id,annex_id' },
        );
        if (linkError) throw linkError;
        linksCreated += 1;
      }
    }

    await supabase.from('lease_secondary_lots').delete().eq('lease_id', leaseId);

    const { error } = await supabase.from('lease_secondary_lots').insert({
      lease_id: leaseId,
      annex_property_id: annexPropertyId,
      designation,
      detail,
      ref_lot_secondary: refSec,
      surface,
      surface_carrez: asNumber(getCol(row, 'sec_surfaceCarrez')),
      surface_corrigee: asNumber(getCol(row, 'sec_surfaceCorrigee')),
      surface_plancher: asNumber(getCol(row, 'sec_surfacePlancher')),
      surface_terrain: asNumber(getCol(row, 'sec_surfaceTerrain')),
      surface_utile: asNumber(getCol(row, 'sec_surfaceUtile')),
      surface_utile_nette: asNumber(getCol(row, 'sec_surfaceUtileNette')),
      surface_utile_brute: asNumber(getCol(row, 'sec_surfaceUtileBrute')),
    });
    if (error) throw error;
  }

  for (const row of rows) {
    if (!rowHasMainLot(row)) {
      skipped += 1;
      continue;
    }

    const lotNumber = asText(getCol(row, 'refLot'))!;
    const refLot = resolveRefLot(row, lotNumber);
    const buildingId = await upsertBuilding(row);
    const ownerId = await upsertOwner(row);
    const pseudonym = await upsertPseudonym(row);
    const propertyId = await upsertProperty(row, buildingId, refLot, resolveIsAnnex(row), pseudonym);
    if (!propertyId) {
      skipped += 1;
      continue;
    }

    const { id: leaseId, entryDate, tenantLabel } = await upsertLease(row, propertyId, ownerId, pseudonym);
    await upsertFinancials(row, propertyId, leaseId, entryDate, tenantLabel);
    await upsertLeaseRevisions(row, propertyId, leaseId);
    await upsertSecondaryLot(row, leaseId, propertyId);

    imported += 1;
    if (imported % 50 === 0) {
      options.onProgress?.(imported, rows.length);
    }
  }

  return { imported, skipped, linksCreated };
}

export async function parseEtatLocatifWorkbook(buffer: ArrayBuffer | Buffer) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawMatrixRow>(sheet, { header: 1, defval: null });
  return rows.slice(1);
}
