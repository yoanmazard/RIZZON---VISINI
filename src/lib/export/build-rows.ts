import { calculateProfitability } from '@/lib/calculations/rentability';
import type { SimulationInputs } from '@/lib/calculations/rentability';
import { perSqm } from '@/lib/calculations/kpi';
import type { ExportRow } from '@/lib/export/types';
import type { PropertyTreeRow } from '@/lib/import/types';

const EXPORT_HEADERS: Array<{ key: keyof ExportRow; label: string }> = [
  { key: 'ref_lot', label: 'Ref lot' },
  { key: 'type_lot', label: 'Type de lot' },
  { key: 'immeuble', label: 'Immeuble' },
  { key: 'adresse', label: 'Adresse' },
  { key: 'surface_m2', label: 'Surface (m²)' },
  { key: 'statut', label: 'Statut' },
  { key: 'locataire', label: 'Locataire' },
  { key: 'loyer_hc_actuel', label: 'Loyer HC actuel (€)' },
  { key: 'loyer_hc_cible', label: 'Loyer HC cible (€)' },
  { key: 'loyer_m2', label: 'Loyer cible /m² (€)' },
  { key: 'prix_achat_cible', label: 'Prix achat cible (€)' },
  { key: 'prix_m2', label: 'Prix /m² (€)' },
  { key: 'cout_revient', label: 'Coût de revient (€)' },
  { key: 'cout_m2', label: 'Coût /m² (€)' },
  { key: 'rentabilite_brute_pct', label: 'Rentabilité brute (%)' },
  { key: 'rentabilite_nette_pct', label: 'Rentabilité nette (%)' },
  { key: 'plus_value_nette', label: 'Plus-value nette (€)' },
  { key: 'dpe', label: 'DPE' },
  { key: 'lien', label: 'Lien' },
];

function round1(value: number | null): number | null {
  return value == null ? null : Math.round(value * 10) / 10;
}

export function getExportHeaders() {
  return EXPORT_HEADERS.map((header) => header.label);
}

export function buildExportRows(
  properties: PropertyTreeRow[],
  getInputs: (property: PropertyTreeRow) => SimulationInputs,
  isDeliated: (propertyId: string) => boolean,
): ExportRow[] {
  return properties.map((property) => {
    const inputs = getInputs(property);
    const metrics = calculateProfitability(inputs);

    let lien = 'Indépendant';
    if (isDeliated(property.id)) {
      lien = 'Délié';
    } else if (property.depth > 0) {
      lien = 'Lié (annexe)';
    } else if (property.subRows?.length) {
      lien = `Lié (${property.subRows.length} annexe(s))`;
    }

    return {
      ref_lot: property.ref_lot,
      type_lot: property.main_type,
      immeuble: property.building_name ?? '',
      adresse: property.address ?? '',
      surface_m2: property.surface,
      statut: property.status,
      locataire: property.tenant_label ?? 'Vacant',
      loyer_hc_actuel: Number(property.net_rent ?? 0),
      loyer_hc_cible: inputs.targetRent,
      loyer_m2: round1(perSqm(inputs.targetRent, property.surface)),
      prix_achat_cible: inputs.targetPurchasePrice,
      prix_m2: round1(perSqm(inputs.targetPurchasePrice, property.surface)),
      cout_revient: metrics.totalCost,
      cout_m2: round1(perSqm(metrics.totalCost, property.surface)),
      rentabilite_brute_pct:
        metrics.grossYield != null ? Number((metrics.grossYield * 100).toFixed(2)) : null,
      rentabilite_nette_pct:
        metrics.netYield != null ? Number((metrics.netYield * 100).toFixed(2)) : null,
      plus_value_nette: metrics.netCapitalGain,
      dpe: property.dpe_grade ?? '',
      lien,
    };
  });
}

export function exportRowsToAoA(rows: ExportRow[]) {
  return [getExportHeaders(), ...rows.map((row) => EXPORT_HEADERS.map((header) => row[header.key] ?? ''))];
}

export function buildExportFileName(scenarioName?: string | null) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = scenarioName
    ? scenarioName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 40)
    : 'selection';

  return `export_lots_${slug}_${date}.xlsx`;
}
