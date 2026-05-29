import { describe, expect, it } from 'vitest';
import { perSqm, pricePerSqm, rentPerSqm } from '@/lib/calculations/kpi';

describe('perSqm', () => {
  it('divise la valeur par la surface', () => {
    expect(perSqm(200000, 50)).toBe(4000);
  });

  it('renvoie null si la surface est nulle, négative ou absente', () => {
    expect(perSqm(200000, 0)).toBeNull();
    expect(perSqm(200000, -10)).toBeNull();
    expect(perSqm(200000, null)).toBeNull();
    expect(perSqm(200000, undefined)).toBeNull();
  });

  it('renvoie null si la valeur n’est pas finie', () => {
    expect(perSqm(null, 50)).toBeNull();
    expect(perSqm(undefined, 50)).toBeNull();
  });
});

describe('pricePerSqm / rentPerSqm', () => {
  it('calcule le prix au m²', () => {
    expect(pricePerSqm(180000, 60)).toBe(3000);
  });

  it('calcule le loyer mensuel au m²', () => {
    expect(rentPerSqm(750, 50)).toBe(15);
  });

  it('tombe sur null pour une annexe sans surface', () => {
    expect(rentPerSqm(60, null)).toBeNull();
  });
});
