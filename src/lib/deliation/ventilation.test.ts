import { describe, expect, it } from 'vitest';
import {
  buildDefaultShares,
  computeGroupTotals,
  sharesAreValid,
  ventilateFormValues,
} from '@/lib/deliation/ventilation';
import type { LinkGroup } from '@/lib/deliation/types';
import type { PropertyTreeRow } from '@/lib/import/types';

const primary: PropertyTreeRow = {
  id: 'primary',
  ref_lot: 'A1',
  main_type: 'T4',
  nb_pieces: 4,
  surface: 80,
  building_name: 'Res',
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
  subRows: [],
};

const annex: PropertyTreeRow = {
  ...primary,
  id: 'annex',
  ref_lot: 'G1',
  main_type: 'Garage',
  is_annex: true,
  net_rent: 0,
  depth: 1,
  parent_ref_lot: 'A1',
};

primary.subRows = [annex];

const group: LinkGroup = {
  primary,
  annexes: [annex],
  members: [primary, annex],
};

describe('deliation ventilation', () => {
  it('propose 90/10 par défaut pour un appartement et une annexe', () => {
    const shares = buildDefaultShares(['primary', 'annex'], 'primary');
    expect(shares.primary).toBe(90);
    expect(shares.annex).toBe(10);
  });

  it('répartit équitablement les 10% restants entre plusieurs annexes', () => {
    const shares = buildDefaultShares(['primary', 'a1', 'a2'], 'primary');
    expect(shares.primary).toBe(90);
    expect(shares.a1).toBe(5);
    expect(shares.a2).toBe(5);
    expect(sharesAreValid(shares, ['primary', 'a1', 'a2'])).toBe(true);
  });

  it('ventile loyer et prix selon les parts', () => {
    const ventilated = ventilateFormValues(
      {
        purchasePrice: 200_000,
        rent: 1_000,
        resalePrice: 240_000,
        works: 10_000,
        propertyTax: 1_000,
        nonRecoverableCharges: 500,
      },
      90,
      90,
      {
        targetPurchasePrice: '200000',
        targetRent: '1000',
        targetResalePrice: '240000',
        estimatedWorks: '10000',
        notaryFeeRatePercent: '8',
        annualPropertyTax: '1000',
        nonRecoverableCharges: '500',
        vacancyRatePercent: '5',
        mgmtFeeRatePercent: '7',
      },
    );

    expect(ventilated.targetRent).toBe('900');
    expect(ventilated.targetPurchasePrice).toBe('180000');
  });

  it('agrège les totaux du groupe', () => {
    const totals = computeGroupTotals(group, {
      primary: {
        id: 'sim-primary',
        property_id: 'primary',
        target_purchase_price: 200_000,
        target_rent: 900,
        target_resale_price: 250_000,
        estimated_works: 0,
        notary_fee_rate: 0.08,
        annual_property_tax: 1200,
        non_recoverable_charges: 800,
        vacancy_rate: 0.05,
        mgmt_fee_rate: 0.07,
      },
    });

    expect(totals.purchasePrice).toBe(200_000);
    expect(totals.rent).toBe(900);
  });
});
