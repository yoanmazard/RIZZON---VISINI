'use client';

import { useRouter } from 'next/navigation';
import type { DashboardData } from '@/lib/dashboard/queries';
import { DeliationProvider } from '@/lib/deliation/context';
import { CsvImportPanel } from '@/components/import/csv-import-panel';
import { PropertiesTable } from '@/components/dashboard/properties-table';
import { DeliationModal } from '@/components/dashboard/deliation-modal';

export function DashboardView({ data }: { data: DashboardData }) {
  const router = useRouter();

  return (
    <DeliationProvider
      treeRows={data.treeRows}
      simulationsByProperty={data.simulationsByProperty}
    >
      <div className="space-y-6 pb-44">
        <CsvImportPanel />
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
