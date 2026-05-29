import { getDashboardData, type DashboardData } from '@/lib/dashboard/queries';
import { DeliationProvider } from '@/lib/deliation/context';
import { DeliationModal } from '@/components/dashboard/deliation-modal';
import { SimulationWorkspace } from '@/components/panier/simulation-workspace';

const EMPTY: DashboardData = {
  treeRows: [],
  flatRows: [],
  links: [],
  simulationsByProperty: {},
  scenarios: [],
  stats: { totalLots: 0, totalSurface: 0, totalNetRent: 0, vacancyRate: 0 },
};

export default async function PanierPage() {
  let data: DashboardData = EMPTY;
  let loadError: string | null = null;

  try {
    data = await getDashboardData();
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Impossible de charger les lots.';
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <div>
        <p className="eyebrow text-[var(--gerimalp-fg-3)]">Acquisition</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--gerimalp-blue-primary)]">
          Panier d&apos;acquisition &amp; simulation
        </h1>
        <p className="text-sm text-[var(--gerimalp-fg-3)]">
          Sélectionnez des lots, visualisez prix/m² et loyers/m², comparez vos scénarios de
          groupement et exportez l&apos;analyse.
        </p>
      </div>

      {loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError.includes('properties_overview')
            ? 'Schéma Supabase non appliqué. Lancez supabase db push avant l’import.'
            : loadError}
        </div>
      )}

      <DeliationProvider treeRows={data.treeRows} simulationsByProperty={data.simulationsByProperty}>
        <SimulationWorkspace
          treeRows={data.treeRows}
          simulationsByProperty={data.simulationsByProperty}
          scenarios={data.scenarios}
        />
        <DeliationModal />
      </DeliationProvider>
    </div>
  );
}
