'use client';

import { useRouter } from 'next/navigation';
import type { DashboardData } from '@/lib/dashboard/queries';
import { DeliationProvider } from '@/lib/deliation/context';
import { CsvImportPanel } from '@/components/import/csv-import-panel';
import { PropertiesTable } from '@/components/dashboard/properties-table';
import { DeliationModal } from '@/components/dashboard/deliation-modal';

export function DashboardView({
  data,
  isAdmin,
}: {
  data: DashboardData;
  isAdmin: boolean;
}) {
  const router = useRouter();

  return (
    <DeliationProvider
      treeRows={data.treeRows}
      simulationsByProperty={data.simulationsByProperty}
    >
      <div className="space-y-6 pb-44">
        {isAdmin ? (
          <CsvImportPanel />
        ) : (
          <p className="rounded-lg border border-[var(--gerimalp-line-1)] bg-white px-4 py-3 text-sm text-[var(--gerimalp-fg-2)]">
            Consultation et analyse des lots. L&apos;import des états locatifs est réservé aux
            administrateurs.
          </p>
        )}
        <PropertiesTable
          rows={data.treeRows}
          stats={data.stats}
          simulationsByProperty={data.simulationsByProperty}
          scenarios={data.scenarios}
          onSimulationSaved={() => router.refresh()}
        />
        <DeliationModal />
      </div>
    </DeliationProvider>
  );
}
