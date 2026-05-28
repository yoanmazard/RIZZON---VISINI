import { createClient } from '@/lib/supabase/server';
import { buildPropertyTree } from '@/lib/import/lot-links';
import type { LotLink, PropertyOverview, PropertyTreeRow } from '@/lib/import/types';
import type { SimulationRecord } from '@/lib/simulations/types';
import type { ScenarioRecord } from '@/lib/basket/types';

export type DashboardStats = {
  totalLots: number;
  totalSurface: number;
  totalNetRent: number;
  vacancyRate: number;
};

export type DashboardData = {
  treeRows: PropertyTreeRow[];
  flatRows: PropertyOverview[];
  links: LotLink[];
  simulationsByProperty: Record<string, SimulationRecord>;
  scenarios: ScenarioRecord[];
  stats: DashboardStats;
};

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const [
    { data: overview, error: overviewError },
    { data: links, error: linksError },
    { data: simulations, error: simulationsError },
    { data: scenarios, error: scenariosError },
  ] = await Promise.all([
    supabase.from('properties_overview').select('*').order('ref_lot'),
    supabase.from('lot_links').select('id, primary_id, annex_id, link_source'),
    supabase
      .from('simulations')
      .select(
        'id, property_id, target_purchase_price, target_rent, target_resale_price, estimated_works, notary_fee_rate, annual_property_tax, non_recoverable_charges, vacancy_rate, mgmt_fee_rate',
      )
      .is('scenario_id', null),
    supabase
      .from('scenarios')
      .select('id, name, mode, property_ids, created_at')
      .order('created_at', { ascending: false }),
  ]);

  if (overviewError) {
    throw new Error(overviewError.message);
  }

  if (linksError) {
    throw new Error(linksError.message);
  }

  if (simulationsError) {
    throw new Error(simulationsError.message);
  }

  if (scenariosError) {
    throw new Error(scenariosError.message);
  }

  const flatRows = (overview ?? []) as PropertyOverview[];
  const linkRows = (links ?? []) as LotLink[];
  const simulationsByProperty = Object.fromEntries(
    (simulations ?? []).map((row) => [row.property_id, row as SimulationRecord]),
  );

  const totalLots = flatRows.length;
  const vacantLots = flatRows.filter((row) => row.status === 'Vacant').length;
  const totalSurface = flatRows.reduce((sum, row) => sum + Number(row.surface ?? 0), 0);
  const totalNetRent = flatRows.reduce((sum, row) => sum + Number(row.net_rent ?? 0), 0);
  const vacancyRate = totalLots > 0 ? (vacantLots / totalLots) * 100 : 0;

  const treeRows = buildPropertyTree(flatRows, linkRows);

  return {
    treeRows,
    flatRows,
    links: linkRows,
    simulationsByProperty,
    scenarios: (scenarios ?? []) as ScenarioRecord[],
    stats: {
      totalLots,
      totalSurface,
      totalNetRent,
      vacancyRate,
    },
  };
}
