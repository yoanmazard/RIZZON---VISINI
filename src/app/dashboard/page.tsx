import { createClient } from '@/lib/supabase/server';
import { getCurrentUserAccess } from '@/lib/auth/access';
import { getDashboardData } from '@/lib/dashboard/queries';
import { DashboardView } from '@/components/dashboard/dashboard-view';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = await getCurrentUserAccess();

  let dashboardData;
  let loadError: string | null = null;

  try {
    dashboardData = await getDashboardData();
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Impossible de charger les lots.';
    dashboardData = {
      treeRows: [],
      flatRows: [],
      links: [],
      simulationsByProperty: {},
      scenarios: [],
      stats: {
        totalLots: 0,
        totalSurface: 0,
        totalNetRent: 0,
        vacancyRate: 0,
      },
    };
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <p className="text-sm text-[var(--gerimalp-fg-3)]">
        Connecté en tant que <span className="font-medium text-[var(--gerimalp-fg-1)]">{user?.email}</span>
        {access?.isAdmin ? ' · Administrateur' : ' · Utilisateur'}
      </p>

      {loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError.includes('properties_overview')
            ? 'Schéma Supabase non appliqué. Lancez supabase db push avant l’import.'
            : loadError}
        </div>
      )}

      <DashboardView data={dashboardData} isAdmin={access?.isAdmin ?? false} />
    </div>
  );
}
