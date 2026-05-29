import type { CleanLotImportRow } from '@/lib/import/types';
import {
  buildHeaderMap,
  getCell,
  listExcludedColumns,
} from '@/lib/import/column-mapping';
import {
  buildAddress,
  buildRefLot,
  computeLeaseSeniorityMonths,
  determineStatus,
  inferPiecesFromType,
  isAnnexLot,
  isVacantTenant,
  parseBoolean,
  parseDate,
  parseNumber,
  parseOptionalInt,
  parseOptionalNumber,
  parseSecondaryLotRefs,
  toIsoDate,
} from '@/lib/import/parse-utils';
import type { ImportParseResult } from '@/lib/import/types';

class TenantPseudonymizer {
  private dictionary = new Map<string, string>();
  private counter = 0;

  labelFor(rawTenant: string, status: 'Loué' | 'Vacant') {
    if (status === 'Vacant' || isVacantTenant(rawTenant)) {
      return 'Vacant';
    }

    const key = rawTenant.trim().toLowerCase();
    const existing = this.dictionary.get(key);
    if (existing) return existing;

    this.counter += 1;
    const label = `Locataire ${this.counter}`;
    this.dictionary.set(key, label);
    return label;
  }
}

export function transformCsvRows(rows: Record<string, string>[]): ImportParseResult {
  const warnings: string[] = [];
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const headerMap = buildHeaderMap(headers);
  const pseudonymizer = new TenantPseudonymizer();
  const cleanRows: CleanLotImportRow[] = [];

  if (!headerMap.has('ref_lot')) {
    warnings.push('Colonne « N° Lot » introuvable.');
  }

  if (!headerMap.has('net_rent')) {
    warnings.push('Colonne « Loyer HT » introuvable — les calculs de rentabilité seront faux.');
  }

  if (headerMap.has('rent_ttc') && !headerMap.has('net_rent')) {
    warnings.push('Attention : Loyer TTC détecté sans Loyer HT. Ne pas mapper TTC sur le loyer HC.');
  }

  for (const row of rows) {
    const lotNumber = getCell(row, headerMap, 'ref_lot');
    if (!lotNumber) continue;

    const buildingCode = getCell(row, headerMap, 'building_code');
    const refLot = buildRefLot(buildingCode, lotNumber);
    if (!refLot) continue;

    const mainType = getCell(row, headerMap, 'main_type') || 'Lot';
    const designation =
      getCell(row, headerMap, 'designation') ||
      (row['Désignation_1'] ?? '').trim() ||
      null;
    const status = determineStatus(row, headerMap);
    const tenantRaw = getCell(row, headerMap, 'tenant_raw');
    const tenantLabel = pseudonymizer.labelFor(tenantRaw, status);

    const surface =
      parseOptionalNumber(getCell(row, headerMap, 'surface_habitable')) ??
      parseOptionalNumber(getCell(row, headerMap, 'surface_utile'));

    const chargesHt = parseNumber(getCell(row, headerMap, 'charges_ht'));
    const chargesTtc = parseNumber(getCell(row, headerMap, 'charges_ttc'));
    const rentalCharges = chargesHt > 0 ? chargesHt : chargesTtc;

    cleanRows.push({
      ref_lot: refLot,
      main_type: mainType,
      nb_pieces:
        parseOptionalInt(getCell(row, headerMap, 'nb_pieces')) ?? inferPiecesFromType(mainType),
      surface,
      building_name: getCell(row, headerMap, 'building_name') || null,
      address: buildAddress(getCell(row, headerMap, 'address'), getCell(row, headerMap, 'city')),
      floor: getCell(row, headerMap, 'floor') || null,
      dpe_grade: getCell(row, headerMap, 'dpe_grade') || null,
      status,
      is_annex: isAnnexLot(mainType, designation ?? ''),
      tenant_label: tenantLabel,
      net_rent: parseNumber(getCell(row, headerMap, 'net_rent')),
      rental_charges: rentalCharges,
      deposit: parseNumber(getCell(row, headerMap, 'deposit')),
      lease_seniority_months: computeLeaseSeniorityMonths(getCell(row, headerMap, 'lease_start')),
      notice_in_progress:
        parseBoolean(getCell(row, headerMap, 'notice_in_progress')) ||
        Boolean(parseDate(getCell(row, headerMap, 'termination_date'))),
      linked_annex_refs: parseSecondaryLotRefs(
        getCell(row, headerMap, 'secondary_lot'),
        buildingCode,
      ),
      designation,
      postal_code: getCell(row, headerMap, 'postal_code') || null,
      city: getCell(row, headerMap, 'city') || null,
      door: getCell(row, headerMap, 'door') || null,
      usage_type: getCell(row, headerMap, 'usage') || null,
      dpe_kwh_ep: parseOptionalNumber(getCell(row, headerMap, 'dpe_kwh_ep')),
      ges_grade: getCell(row, headerMap, 'ges_grade') || null,
      dpe_date: toIsoDate(getCell(row, headerMap, 'dpe_date')),
      ges_co2_m2: parseOptionalNumber(getCell(row, headerMap, 'ges_co2_m2')),
      annual_rent_ttc: parseOptionalNumber(getCell(row, headerMap, 'annual_rent_ttc')),
      rent_ttc_per_sqm_hab: parseOptionalNumber(getCell(row, headerMap, 'rent_ttc_per_sqm_hab')),
    });
  }

  const duplicateRefs = cleanRows
    .map((row) => row.ref_lot)
    .filter((ref, index, array) => array.indexOf(ref) !== index);

  if (duplicateRefs.length > 0) {
    warnings.push(`Doublons détectés sur ref_lot : ${[...new Set(duplicateRefs)].slice(0, 5).join(', ')}`);
  }

  return {
    rows: cleanRows,
    preview: cleanRows.slice(0, 5).map((row) => ({ ...row, source_ref: row.ref_lot })),
    warnings,
    stats: {
      total: cleanRows.length,
      rented: cleanRows.filter((row) => row.status === 'Loué').length,
      vacant: cleanRows.filter((row) => row.status === 'Vacant').length,
      annexes: cleanRows.filter((row) => row.is_annex).length,
      excludedColumns: listExcludedColumns(headers),
    },
  };
}
