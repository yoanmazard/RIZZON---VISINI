import { describe, expect, it } from 'vitest';
import {
  calculateProfitability,
  maxPurchasePriceForYield,
  RESALE_COST_RATE,
} from '@/lib/calculations/rentability';

describe('calculateProfitability', () => {
  it('calcule le coût de revient avec frais de notaire', () => {
    const result = calculateProfitability({
      targetPurchasePrice: 200_000,
      targetRent: 900,
      targetResalePrice: 250_000,
      estimatedWorks: 10_000,
      notaryFeeRate: 0.08,
      annualPropertyTax: 1_200,
      nonRecoverableCharges: 800,
      vacancyRate: 0.05,
      mgmtFeeRate: 0.07,
    });

    expect(result.notaryFees).toBe(16_000);
    expect(result.totalCost).toBe(226_000);
  });

  it('calcule la rentabilité brute sur loyer HC annuel', () => {
    const result = calculateProfitability({
      targetPurchasePrice: 100_000,
      targetRent: 500,
      targetResalePrice: 120_000,
      estimatedWorks: 0,
      notaryFeeRate: 0.08,
      annualPropertyTax: 0,
      nonRecoverableCharges: 0,
      vacancyRate: 0,
      mgmtFeeRate: 0,
    });

    expect(result.grossYield).toBeCloseTo(6000 / 108_000, 5);
  });

  it('calcule la rentabilité nette avec vacance et frais de gestion', () => {
    const result = calculateProfitability({
      targetPurchasePrice: 100_000,
      targetRent: 1_000,
      targetResalePrice: 110_000,
      estimatedWorks: 0,
      notaryFeeRate: 0,
      annualPropertyTax: 1_000,
      nonRecoverableCharges: 500,
      vacancyRate: 0.1,
      mgmtFeeRate: 0.08,
    });

    expect(result.annualCollectedRent).toBe(10_800);
    expect(result.managementFees).toBeCloseTo(864, 5);
    expect(result.annualNetIncome).toBeCloseTo(8_436, 5);
    expect(result.netYield).toBeCloseTo(0.08436, 5);
  });

  it('calcule la plus-value latente', () => {
    const result = calculateProfitability({
      targetPurchasePrice: 150_000,
      targetRent: 700,
      targetResalePrice: 180_000,
      estimatedWorks: 5_000,
      notaryFeeRate: 0.08,
      annualPropertyTax: 0,
      nonRecoverableCharges: 0,
      vacancyRate: 0,
      mgmtFeeRate: 0,
    });

    expect(result.latentCapitalGain).toBe(180_000 - 167_000);
  });

  it('déduit les frais de revente de la plus-value nette', () => {
    const result = calculateProfitability({
      targetPurchasePrice: 150_000,
      targetRent: 700,
      targetResalePrice: 180_000,
      estimatedWorks: 5_000,
      notaryFeeRate: 0.08,
      annualPropertyTax: 0,
      nonRecoverableCharges: 0,
      vacancyRate: 0,
      mgmtFeeRate: 0,
    });

    // coût de revient = 150000 + 5000 + 12000 = 167000
    expect(result.resaleCosts).toBeCloseTo(180_000 * RESALE_COST_RATE, 5);
    expect(result.netCapitalGain).toBeCloseTo(180_000 - 180_000 * RESALE_COST_RATE - 167_000, 5);
    expect(result.netCapitalGain).toBeLessThan(result.latentCapitalGain);
  });
});

describe('maxPurchasePriceForYield', () => {
  const base = {
    targetPurchasePrice: 0,
    targetRent: 1_000,
    targetResalePrice: 0,
    estimatedWorks: 0,
    notaryFeeRate: 0.08,
    annualPropertyTax: 0,
    nonRecoverableCharges: 0,
    vacancyRate: 0,
    mgmtFeeRate: 0,
  };

  it('trouve un prix dont la rentabilité brute atteint la cible', () => {
    const price = maxPurchasePriceForYield(base, 0.06, 'gross');
    expect(price).not.toBeNull();
    // au prix trouvé, la rentabilité brute doit valoir ~6 %
    const check = calculateProfitability({ ...base, targetPurchasePrice: price! });
    expect(check.grossYield).toBeCloseTo(0.06, 4);
  });

  it('intègre travaux et notaire dans le prix max net', () => {
    const inputs = { ...base, estimatedWorks: 10_000, annualPropertyTax: 1_200 };
    const price = maxPurchasePriceForYield(inputs, 0.05, 'net');
    expect(price).not.toBeNull();
    const check = calculateProfitability({ ...inputs, targetPurchasePrice: price! });
    expect(check.netYield).toBeCloseTo(0.05, 4);
  });

  it('renvoie null si le revenu net est négatif ou la cible nulle', () => {
    expect(maxPurchasePriceForYield(base, 0)).toBeNull();
    expect(
      maxPurchasePriceForYield({ ...base, annualPropertyTax: 99_999 }, 0.05, 'net'),
    ).toBeNull();
  });
});
