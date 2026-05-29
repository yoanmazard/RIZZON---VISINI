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

/**
 * Frais de revente estimés (agence + diagnostics), en % du prix de revente.
 * Hypothèse fixe V1 : la plus-value affichée est NETTE de ces frais pour ne pas
 * surestimer le gain. (La fiscalité de plus-value reste hors périmètre V1.)
 */
export const RESALE_COST_RATE = 0.06;

export type ProfitabilityMetrics = {
  notaryFees: number;
  totalCost: number;
  grossYield: number | null;
  annualRentTarget: number;
  annualCollectedRent: number;
  managementFees: number;
  annualNetIncome: number;
  netYield: number | null;
  latentCapitalGain: number;
  resaleCosts: number;
  netCapitalGain: number;
  netCapitalGainRate: number | null;
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
  const resaleCosts = targetResalePrice * RESALE_COST_RATE;
  const netCapitalGain = targetResalePrice - resaleCosts - totalCost;
  const netCapitalGainRate = totalCost > 0 ? netCapitalGain / totalCost : null;

  return {
    notaryFees,
    totalCost,
    grossYield,
    annualRentTarget,
    annualCollectedRent,
    managementFees,
    annualNetIncome,
    netYield,
    latentCapitalGain,
    resaleCosts,
    netCapitalGain,
    netCapitalGainRate,
  };
}

/**
 * Calcul inversé : prix d'achat maximum pour atteindre un rendement visé,
 * à hypothèses de loyer/charges/travaux constantes.
 *
 * coût de revient = P·(1 + frais notaire) + travaux
 * - brut : rendement = loyer annuel / coût           → coût requis = loyer annuel / rendement
 * - net  : rendement = revenu net annuel / coût      → coût requis = revenu net / rendement
 * puis P = (coût requis − travaux) / (1 + frais notaire)
 */
export function maxPurchasePriceForYield(
  inputs: SimulationInputs,
  targetRate: number,
  mode: 'net' | 'gross' = 'net',
): number | null {
  if (!Number.isFinite(targetRate) || targetRate <= 0) return null;

  const notaryFeeRate = clampRate(inputs.notaryFeeRate);
  const works = Math.max(0, inputs.estimatedWorks);
  const annualRentTarget = Math.max(0, inputs.targetRent) * 12;

  let requiredCost: number;
  if (mode === 'gross') {
    if (annualRentTarget <= 0) return null;
    requiredCost = annualRentTarget / targetRate;
  } else {
    const annualCollectedRent = annualRentTarget * (1 - clampRate(inputs.vacancyRate));
    const managementFees = annualCollectedRent * clampRate(inputs.mgmtFeeRate);
    const annualNetIncome =
      annualCollectedRent -
      Math.max(0, inputs.annualPropertyTax) -
      Math.max(0, inputs.nonRecoverableCharges) -
      managementFees;
    if (annualNetIncome <= 0) return null;
    requiredCost = annualNetIncome / targetRate;
  }

  const price = (requiredCost - works) / (1 + notaryFeeRate);
  return price > 0 ? price : null;
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
