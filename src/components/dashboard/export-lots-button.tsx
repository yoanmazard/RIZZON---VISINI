'use client';

import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import type { PropertyTreeRow } from '@/lib/import/types';
import type { BasketSummary } from '@/lib/basket/types';
import { buildExportRows } from '@/lib/export/build-rows';
import { downloadExcelExport } from '@/lib/export/download-excel';
import { recordDownload } from '@/lib/export/actions';
import { useDeliation } from '@/lib/deliation/context';
import { Button } from '@/components/ui/button';

type ExportLotsButtonProps = {
  properties: PropertyTreeRow[];
  scenarioName?: string | null;
  basketSummary?: BasketSummary | null;
  label?: string;
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'secondary';
  onExported?: () => void;
};

export function ExportLotsButton({
  properties,
  scenarioName = null,
  basketSummary = null,
  label = 'Exporter Excel',
  size = 'sm',
  variant = 'outline',
  onExported,
}: ExportLotsButtonProps) {
  const { getEffectiveCalculationInputs, isDeliated, simulationsByProperty } = useDeliation();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (properties.length === 0) {
      setError('Aucun lot à exporter.');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const rows = buildExportRows(
        properties,
        (property) =>
          getEffectiveCalculationInputs(property, simulationsByProperty[property.id]),
        isDeliated,
      );

      const meta = await downloadExcelExport(rows, {
        scenarioName,
        basketSummary,
        mode: basketSummary?.mode ?? null,
      });

      const result = await recordDownload(meta.fileName, meta.scenarioName, meta.rowCount);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      onExported?.();
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : 'Export Excel impossible.',
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button size={size} variant={variant} onClick={handleExport} disabled={isExporting}>
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        {isExporting ? 'Export…' : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
