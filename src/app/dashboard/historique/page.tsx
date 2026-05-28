import { createClient } from '@/lib/supabase/server';
import type { DownloadHistoryRecord } from '@/lib/export/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function HistoriqueExportsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('download_history')
    .select('id, exported_at, file_name, scenario_name, row_count')
    .order('exported_at', { ascending: false });

  const records = (data ?? []) as DownloadHistoryRecord[];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold">Historique des téléchargements</h2>
        <p className="text-sm text-muted-foreground">
          Exports Excel destinés au banquier ou au courtier, du plus récent au plus ancien.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exports enregistrés</CardTitle>
          <CardDescription>
            {records.length} export(s) · audit horodaté conforme au cahier des charges
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive">
              Impossible de charger l&apos;historique : {error.message}
            </p>
          )}

          {!error && records.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun export pour le moment. Utilisez « Exporter Excel » depuis le tableau de bord.
            </p>
          )}

          {records.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Date et heure</th>
                    <th className="px-3 py-2 text-left font-medium">Fichier</th>
                    <th className="px-3 py-2 text-left font-medium">Scénario / filtres</th>
                    <th className="px-3 py-2 text-left font-medium">Lots exportés</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-t">
                      <td className="px-3 py-2">
                        {new Intl.DateTimeFormat('fr-FR', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(record.exported_at))}
                      </td>
                      <td className="px-3 py-2 font-medium">{record.file_name}</td>
                      <td className="px-3 py-2">{record.scenario_name ?? '—'}</td>
                      <td className="px-3 py-2">{record.row_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
