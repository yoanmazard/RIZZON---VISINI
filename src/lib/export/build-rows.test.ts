import { describe, expect, it } from 'vitest';
import { buildExportFileName, buildExportRows } from '@/lib/export/build-rows';
import type { PropertyTreeRow } from '@/lib/import/types';

const property: PropertyTreeRow = {
  id: 'p1',
  ref_lot: 'A1',
  main_type: 'T4',
  nb_pieces: 4,
  surface: 80,
  building_name: 'Res X',
  address: '1 rue Test',
  floor: '2',
  dpe_grade: 'D',
  status: 'Loué',
  is_annex: false,
  tenant_label: 'Locataire 1',
  net_rent: 900,
  rental_charges: 100,
  deposit: 1800,
  lease_seniority_months: 12,
  notice_in_progress: false,
  created_at: '',
  updated_at: '',
  depth: 0,
  link_source: null,
  parent_ref_lot: null,
};

describe('buildExportRows', () => {
  it('génère une ligne avec rentabilités calculées', () => {
    const rows = buildExportRows(
      [property],
      () => ({
        targetPurchasePrice: 200_000,
        targetRent: 900,
        targetResalePrice: 250_000,
        estimatedWorks: 0,
        notaryFeeRate: 0.08,
        annualPropertyTax: 1000,
        nonRecoverableCharges: 500,
        vacancyRate: 0.05,
        mgmtFeeRate: 0.07,
      }),
      () => false,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.ref_lot).toBe('A1');
    expect(rows[0]?.cout_revient).toBeGreaterThan(200_000);
    expect(rows[0]?.rentabilite_nette_pct).not.toBeNull();
  });
});

describe('buildExportFileName', () => {
  it('slugifie le nom de scénario', () => {
    expect(buildExportFileName('Scénario A : 5 T2')).toContain('export_lots_scenario_a_5_t2');
  });
});
