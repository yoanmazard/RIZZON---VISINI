import { describe, expect, it } from 'vitest';
import { calculateProfitability } from '@/lib/calculations/rentability';

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
});
