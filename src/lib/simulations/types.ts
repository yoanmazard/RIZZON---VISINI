export type SimulationRecord = {
  id: string;
  property_id: string;
  target_purchase_price: number | null;
  target_rent: number | null;
  target_resale_price: number | null;
  estimated_works: number | null;
  notary_fee_rate: number | null;
  annual_property_tax: number | null;
  non_recoverable_charges: number | null;
  vacancy_rate: number | null;
  mgmt_fee_rate: number | null;
};

export type SimulationFormValues = {
  targetPurchasePrice: string;
  targetRent: string;
  targetResalePrice: string;
  estimatedWorks: string;
  notaryFeeRatePercent: string;
  annualPropertyTax: string;
  nonRecoverableCharges: string;
  vacancyRatePercent: string;
  mgmtFeeRatePercent: string;
};

export function simulationToFormValues(
  simulation: SimulationRecord | null | undefined,
  currentRent: number | null,
): SimulationFormValues {
  return {
    targetPurchasePrice: simulation?.target_purchase_price?.toString() ?? '',
    targetRent: simulation?.target_rent?.toString() ?? currentRent?.toString() ?? '',
    targetResalePrice: simulation?.target_resale_price?.toString() ?? '',
    estimatedWorks: simulation?.estimated_works?.toString() ?? '0',
    notaryFeeRatePercent: ((simulation?.notary_fee_rate ?? 0.08) * 100).toString(),
    annualPropertyTax: simulation?.annual_property_tax?.toString() ?? '0',
    nonRecoverableCharges: simulation?.non_recoverable_charges?.toString() ?? '0',
    vacancyRatePercent: ((simulation?.vacancy_rate ?? 0) * 100).toString(),
    mgmtFeeRatePercent: ((simulation?.mgmt_fee_rate ?? 0) * 100).toString(),
  };
}

export function formValuesToSimulationPayload(values: SimulationFormValues) {
  const parsePercent = (value: string) => {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed / 100 : 0;
  };

  const parseMoney = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number.parseFloat(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    target_purchase_price: parseMoney(values.targetPurchasePrice),
    target_rent: parseMoney(values.targetRent),
    target_resale_price: parseMoney(values.targetResalePrice),
    estimated_works: parseMoney(values.estimatedWorks) ?? 0,
    notary_fee_rate: parsePercent(values.notaryFeeRatePercent) || 0.08,
    annual_property_tax: parseMoney(values.annualPropertyTax) ?? 0,
    non_recoverable_charges: parseMoney(values.nonRecoverableCharges) ?? 0,
    vacancy_rate: parsePercent(values.vacancyRatePercent),
    mgmt_fee_rate: parsePercent(values.mgmtFeeRatePercent),
  };
}

export function formValuesToCalculationInputs(values: SimulationFormValues) {
  const payload = formValuesToSimulationPayload(values);

  return {
    targetPurchasePrice: payload.target_purchase_price ?? 0,
    targetRent: payload.target_rent ?? 0,
    targetResalePrice: payload.target_resale_price ?? 0,
    estimatedWorks: payload.estimated_works ?? 0,
    notaryFeeRate: payload.notary_fee_rate ?? 0.08,
    annualPropertyTax: payload.annual_property_tax ?? 0,
    nonRecoverableCharges: payload.non_recoverable_charges ?? 0,
    vacancyRate: payload.vacancy_rate ?? 0,
    mgmtFeeRate: payload.mgmt_fee_rate ?? 0,
  };
}
