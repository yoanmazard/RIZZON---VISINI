export type SimulationInputs = {
  targetPurchasePrice: number;
  targetRent: number;
  targetResalePrice: number;
  estimatedWorks: number;
  notaryFeeRate: number;
  annualPropertyTax: number;
  nonRecoverableCharges: number;
  vacancyRate: number;
  mgmtFeeRate: number;
};

export type ProfitabilityMetrics = {
  notaryFees: number;
  totalCost: number;
  grossYield: number | null;
  annualCollectedRent: number;
  managementFees: number;
  annualNetIncome: number;
  netYield: number | null;
  latentCapitalGain: number;
  latentCapitalGainRate: number | null;
  totalReturnRate: number | null;
};

export function calculateProfitability(inputs: SimulationInputs): ProfitabilityMetrics {
  const targetPurchasePrice = Math.max(0, inputs.targetPurchasePrice);
  const targetRent = Math.max(0, inputs.targetRent);
  const targetResalePrice = Math.max(0, inputs.targetResalePrice);
  const estimatedWorks = Math.max(0, inputs.estimatedWorks);
  const notaryFeeRate = clampRate(inputs.notaryFeeRate);
  const annualPropertyTax = Math.max(0, inputs.annualPropertyTax);
  const nonRecoverableCharges = Math.max(0, inputs.nonRecoverableCharges);
  const vacancyRate = clampRate(inputs.vacancyRate);
  const mgmtFeeRate = clampRate(inputs.mgmtFeeRate);

  const notaryFees = targetPurchasePrice * notaryFeeRate;
  const totalCost = targetPurchasePrice + estimatedWorks + notaryFees;

  const annualRentTarget = targetRent * 12;
  const annualCollectedRent = annualRentTarget * (1 - vacancyRate);
  const managementFees = annualCollectedRent * mgmtFeeRate;
  const annualNetIncome =
    annualCollectedRent - annualPropertyTax - nonRecoverableCharges - managementFees;

  const grossYield = totalCost > 0 ? annualRentTarget / totalCost : null;
  const netYield = totalCost > 0 ? annualNetIncome / totalCost : null;
  const latentCapitalGain = targetResalePrice - totalCost;
  const latentCapitalGainRate = totalCost > 0 ? latentCapitalGain / totalCost : null;
  const totalReturnRate =
    totalCost > 0 ? (annualNetIncome + latentCapitalGain) / totalCost : null;

  return {
    notaryFees,
    totalCost,
    grossYield,
    annualCollectedRent,
    managementFees,
    annualNetIncome,
    netYield,
    latentCapitalGain,
    latentCapitalGainRate,
    totalReturnRate,
  };
}

function clampRate(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function parsePercentInput(value: string) {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) return 0;
  return parsed / 100;
}

export function formatPercentInput(rate: number) {
  return String(Number((rate * 100).toFixed(2)));
}

export function parseMoneyInput(value: string) {
  if (!value.trim()) return 0;
  const parsed = Number.parseFloat(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}
