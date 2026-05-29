'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileWarning, CheckCircle2 } from 'lucide-react';
import { IMPORT_SOURCE_HINT, parseImportFiles } from '@/lib/import/parse-import-file';
import { importCleanLots } from '@/lib/import/actions';
import type { ImportParseResult } from '@/lib/import/types';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function CsvImportPanel() {
  const router = useRouter();
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const previewColumns = useMemo(
    () => [
      { key: 'ref_lot', label: 'Ref lot' },
      { key: 'main_type', label: 'Type' },
      { key: 'status', label: 'Statut' },
      { key: 'tenant_label', label: 'Locataire' },
      { key: 'net_rent', label: 'Loyer HC' },
      { key: 'rental_charges', label: 'Provisions' },
    ],
    [],
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (files.length === 0) return;

    setError(null);
    setSuccessMessage(null);
    setIsParsing(true);
    setFileNames(files.map((file) => file.name));

    try {
      const result = await parseImportFiles(files);
      setParseResult(result);
    } catch (parseError) {
      setParseResult(null);
      setError(parseError instanceof Error ? parseError.message : 'Impossible de lire le fichier.');
    } finally {
      setIsParsing(false);
      event.target.value = '';
    }
  }

  async function handleImport() {
    if (!parseResult || parseResult.rows.length === 0) return;

    setIsImporting(true);
    setError(null);

    const result = await importCleanLots(parseResult.rows);
    setIsImporting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccessMessage(result.message);
    setParseResult(null);
    setFileNames([]);
    router.refresh();
  }

  const fileLabel =
    fileNames.length === 0
      ? 'Sélectionner Etat locatif.xlsx, Etat locatif2.xlsx (ou CSV)'
      : fileNames.join(' + ');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import état locatif</CardTitle>
        <CardDescription>
          Parsing côté navigateur uniquement. Aucune donnée nominative n&apos;est envoyée au serveur.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>Sources attendues</AlertTitle>
          <AlertDescription>{IMPORT_SOURCE_HINT}</AlertDescription>
        </Alert>

        <Alert>
          <AlertTitle>Vérification obligatoire</AlertTitle>
          <AlertDescription>
            Contrôlez le mapping sur quelques lignes avant l&apos;import définitif. Le loyer HC doit
            provenir de « Loyer HT », pas de « Loyer TTC ».
          </AlertDescription>
        </Alert>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-10 transition hover:bg-muted/40">
          <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">{fileLabel}</span>
          <span className="mt-1 text-xs text-muted-foreground">
            Formats : .xlsx, .xls, .csv — sélection multiple possible
          </span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            multiple
            onChange={handleFileChange}
            disabled={isParsing || isImporting}
          />
        </label>

        {isParsing && <p className="text-sm text-muted-foreground">Analyse du fichier…</p>}

        {successMessage && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Import terminé</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {parseResult && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <ImportStat label="Lots détectés" value={String(parseResult.stats.total)} />
              <ImportStat label="Loués" value={String(parseResult.stats.rented)} />
              <ImportStat label="Vacants" value={String(parseResult.stats.vacant)} />
              <ImportStat label="Annexes" value={String(parseResult.stats.annexes)} />
            </div>

            {parseResult.warnings.length > 0 && (
              <Alert>
                <FileWarning className="h-4 w-4" />
                <AlertTitle>Avertissements</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {parseResult.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <h3 className="mb-2 text-sm font-medium">Aperçu des 5 premières lignes nettoyées</h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {previewColumns.map((column) => (
                        <th key={column.key} className="px-3 py-2 text-left font-medium">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.preview.map((row) => (
                      <tr key={row.ref_lot} className="border-t">
                        <td className="px-3 py-2">{row.ref_lot}</td>
                        <td className="px-3 py-2">{row.main_type}</td>
                        <td className="px-3 py-2">{row.status}</td>
                        <td className="px-3 py-2">{row.tenant_label}</td>
                        <td className="px-3 py-2">{formatCurrency(row.net_rent)}</td>
                        <td className="px-3 py-2">{formatCurrency(row.rental_charges)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setParseResult(null)} disabled={isImporting}>
                Annuler
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? 'Import en cours…' : `Importer ${parseResult.rows.length} lots`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ImportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
