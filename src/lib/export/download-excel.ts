'use client';

import type { BasketSummary } from '@/lib/basket/types';
import {
  buildExportFileName,
  exportRowsToAoA,
} from '@/lib/export/build-rows';
import type { ExportMeta, ExportRow } from '@/lib/export/types';

export async function downloadExcelExport(
  rows: ExportRow[],
  options?: {
    scenarioName?: string | null;
    basketSummary?: BasketSummary | null;
    mode?: string | null;
  },
): Promise<ExportMeta> {
  const XLSX = await import('xlsx');
  const fileName = buildExportFileName(options?.scenarioName);
  const exportedAt = new Date().toISOString();

  const workbook = XLSX.utils.book_new();
  const lotsSheet = XLSX.utils.aoa_to_sheet(exportRowsToAoA(rows));
  XLSX.utils.book_append_sheet(workbook, lotsSheet, 'Lots');

  if (options?.basketSummary) {
    const summary = options.basketSummary;
    const recapRows = [
      ['Indicateur', 'Valeur'],
      ['Nombre de lots', summary.lotCount],
      ['Surface totale (m²)', summary.totalSurface],
      ['Prix achat cible (€)', summary.totalPurchasePrice],
      ['Coût de revient (€)', summary.totalCost],
      ['Loyer HC actuel (€)', summary.currentRent],
      ['Loyer HC cible (€)', summary.targetRent],
      [
        'Rentabilité brute (%)',
        summary.grossYield != null ? Number((summary.grossYield * 100).toFixed(2)) : '',
      ],
      [
        'Rentabilité nette (%)',
        summary.netYield != null ? Number((summary.netYield * 100).toFixed(2)) : '',
      ],
      ['Plus-value latente (€)', summary.latentCapitalGain],
      ['Mode', summary.mode],
      ['Scénario', options.scenarioName ?? ''],
      ['Exporté le', exportedAt],
    ];
    const recapSheet = XLSX.utils.aoa_to_sheet(recapRows);
    XLSX.utils.book_append_sheet(workbook, recapSheet, 'Récapitulatif');
  }

  XLSX.writeFile(workbook, fileName);

  return {
    fileName,
    scenarioName: options?.scenarioName ?? null,
    rowCount: rows.length,
    exportedAt,
    mode: options?.mode ?? options?.basketSummary?.mode ?? null,
  };
}
