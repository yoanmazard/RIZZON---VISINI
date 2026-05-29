import { describe, expect, it } from 'vitest';
import { buildHeaderMap, getCell } from '@/lib/import/column-mapping';
import { buildRefLot, determineStatus, parseSecondaryLotRefs } from '@/lib/import/parse-utils';
import { transformCsvRows } from '@/lib/import/transform-rows';
import { buildAutoLotLinks } from '@/lib/import/lot-links';

describe('buildRefLot', () => {
  it('préfixe le n° lot avec le code immeuble (Etat locatif)', () => {
    expect(buildRefLot('LESPORT1', '103')).toBe('LESPORT1-103');
  });

  it('conserve une ref déjà préfixée', () => {
    expect(buildRefLot('LESPORT1', 'LESPORT1-103')).toBe('LESPORT1-103');
  });
});

describe('parseSecondaryLotRefs', () => {
  it('scope les annexes au code immeuble', () => {
    expect(parseSecondaryLotRefs('209', 'LESPORT1')).toEqual(['LESPORT1-209']);
  });
});

describe('transformCsvRows — Etat locatif', () => {
  it('mappe une ligne export gestion locative', () => {
    const row = {
      Locataire: 'COCHE Benjamin (COCHE1)',
      'Code unique': 'COCHE1',
      'Code unique_1': 'LESPORT1',
      'N° Lot': '103',
      'Type de lot': 'Appartement T2',
      Désignation: 'Appartement T2',
      Désignation_1: 'Garage',
      Immeuble: "LES PORTES D'ANNECY",
      'Adresse du lot': "RUE DE L'ARLEQUIN 74960 CRAN GEVRIER",
      Etage: '1',
      DPE: 'D',
      'Surface habitable': '35.78',
      'N° lot secondaire': '209',
      'Loyer HT': '660.18',
      'Provisions HT': '21',
      DDG: '581.86',
      "Date d'entrée": '30/08/2019',
      'Préavis en cours': 'Non',
    };

    const result = transformCsvRows([row]);
    const headerMap = buildHeaderMap(Object.keys(row));

    expect(getCell(row, headerMap, 'tenant_raw')).toBe('COCHE Benjamin (COCHE1)');
    expect(getCell(row, headerMap, 'tenant_status')).toBe('');
    expect(getCell(row, headerMap, 'lease_end')).toBe('');
    expect(determineStatus(row, headerMap)).toBe('Loué');

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.ref_lot).toBe('LESPORT1-103');
    expect(result.rows[0]?.tenant_label).toBe('Locataire 1');
    expect(result.rows[0]?.net_rent).toBe(660.18);
    expect(result.rows[0]?.linked_annex_refs).toEqual(['LESPORT1-209']);
    expect(result.rows[0]?.building_name).toBe("LES PORTES D'ANNECY");
  });
});

describe('buildAutoLotLinks', () => {
  it('rattache les annexes du même locataire à son logement', () => {
    const links = buildAutoLotLinks([
      { ref_lot: 'A-1', is_annex: false, linked_annex_refs: [], tenant_group: 'COCHE1' },
      { ref_lot: 'A-2', is_annex: true, linked_annex_refs: [], tenant_group: 'COCHE1' },
      { ref_lot: 'B-9', is_annex: true, linked_annex_refs: [], tenant_group: 'DUPONT1' },
      { ref_lot: 'C-5', is_annex: true, linked_annex_refs: [], tenant_group: null },
    ]);
    expect(links).toEqual([{ primary_ref: 'A-1', annex_ref: 'A-2', link_source: 'auto' }]);
  });

  it('complète via la colonne N° lot secondaire', () => {
    const links = buildAutoLotLinks([
      { ref_lot: 'A-1', is_annex: false, linked_annex_refs: ['A-3'], tenant_group: null },
      { ref_lot: 'A-3', is_annex: true, linked_annex_refs: [], tenant_group: null },
    ]);
    expect(links).toEqual([{ primary_ref: 'A-1', annex_ref: 'A-3', link_source: 'auto' }]);
  });

  it('ne rattache une annexe qu’à un seul logement (priorité locataire)', () => {
    const links = buildAutoLotLinks([
      { ref_lot: 'A-1', is_annex: false, linked_annex_refs: ['A-2'], tenant_group: 'T1' },
      { ref_lot: 'A-2', is_annex: true, linked_annex_refs: [], tenant_group: 'T1' },
      { ref_lot: 'A-9', is_annex: false, linked_annex_refs: ['A-2'], tenant_group: 'T2' },
    ]);
    expect(links).toEqual([{ primary_ref: 'A-1', annex_ref: 'A-2', link_source: 'auto' }]);
  });
});
