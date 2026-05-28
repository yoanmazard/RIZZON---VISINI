import { describe, expect, it } from 'vitest';
import { computeBasketSummary, resolveBasketUnits } from '@/lib/basket/compute-basket';
import type { PropertyTreeRow } from '@/lib/import/types';

function makeRow(partial: Partial<PropertyTreeRow> & Pick<PropertyTreeRow, 'id' | 'ref_lot'>): PropertyTreeRow {
  return {
    main_type: 'Lot',
    nb_pieces: null,
    surface: 50,
    building_name: 'Res',
    address: 'Adresse',
    floor: '1',
    dpe_grade: 'C',
    status: 'Loué',
    is_annex: false,
    tenant_label: 'Locataire 1',
    net_rent: 800,
    rental_charges: 0,
    deposit: 0,
    lease_seniority_months: 12,
    notice_in_progress: false,
    created_at: '',
    updated_at: '',
    depth: 0,
    link_source: null,
    parent_ref_lot: null,
    ...partial,
  };
}

const primary = makeRow({ id: 'p1', ref_lot: 'A1', net_rent: 900, surface: 80 });
const annex = makeRow({
  id: 'a1',
  ref_lot: 'G1',
  main_type: 'Garage',
  is_annex: true,
  net_rent: 0,
  surface: 15,
  depth: 1,
  parent_ref_lot: 'A1',
});
primary.subRows = [annex];
const treeRows = [primary];

describe('computeBasketSummary', () => {
  it('regroupe en lot lié si appartement et annexe sont cochés', () => {
    const units = resolveBasketUnits(new Set(['p1', 'a1']), treeRows, {});
    expect(units).toHaveLength(1);
    expect(units[0]?.mode).toBe('lié');
  });

  it('bascule en délié si seul l appartement est coché', () => {
    const units = resolveBasketUnits(new Set(['p1']), treeRows, {});
    expect(units).toHaveLength(1);
    expect(units[0]?.mode).toBe('délié');
  });

  it('calcule les agrégats pondérés du panier', () => {
    const summary = computeBasketSummary({
      selectedIds: new Set(['p1', 'a1']),
      treeRows,
      simulationsByProperty: {
        p1: {
          id: 's1',
          property_id: 'p1',
          target_purchase_price: 200_000,
          target_rent: 900,
          target_resale_price: 240_000,
          estimated_works: 0,
          notary_fee_rate: 0.08,
          annual_property_tax: 1000,
          non_recoverable_charges: 500,
          vacancy_rate: 0.05,
          mgmt_fee_rate: 0.07,
        },
      },
      deliationGroups: {},
      getEffectiveCalculationInputs: (property, simulation) => ({
        targetPurchasePrice: simulation?.target_purchase_price ?? 0,
        targetRent: simulation?.target_rent ?? Number(property.net_rent ?? 0),
        targetResalePrice: simulation?.target_resale_price ?? 0,
        estimatedWorks: simulation?.estimated_works ?? 0,
        notaryFeeRate: simulation?.notary_fee_rate ?? 0.08,
        annualPropertyTax: simulation?.annual_property_tax ?? 0,
        nonRecoverableCharges: simulation?.non_recoverable_charges ?? 0,
        vacancyRate: simulation?.vacancy_rate ?? 0,
        mgmtFeeRate: simulation?.mgmt_fee_rate ?? 0,
      }),
    });

    expect(summary?.lotCount).toBe(2);
    expect(summary?.totalSurface).toBe(95);
    expect(summary?.mode).toBe('lié');
    expect(summary?.totalCost).toBeGreaterThan(0);
  });
});
