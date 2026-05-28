import { calculateProfitability } from '@/lib/calculations/rentability';
import type { SimulationRecord } from '@/lib/simulations/types';
import {
  formValuesToCalculationInputs,
  simulationToFormValues,
  type SimulationFormValues,
} from '@/lib/simulations/types';
import type {
  DeliationGroupState,
  GroupTotals,
  LinkGroup,
  VentilatedMemberPreview,
  VentilationShares,
} from '@/lib/deliation/types';
import type { PropertyTreeRow } from '@/lib/import/types';

const DEFAULT_PRIMARY_SHARE = 90;

export function buildDefaultShares(memberIds: string[], primaryId: string): VentilationShares {
  const annexIds = memberIds.filter((id) => id !== primaryId);
  const annexShareTotal = 100 - DEFAULT_PRIMARY_SHARE;
  const annexShareEach =
    annexIds.length > 0 ? annexShareTotal / annexIds.length : 0;

  return Object.fromEntries(
    memberIds.map((id) => [id, id === primaryId ? DEFAULT_PRIMARY_SHARE : annexShareEach]),
  );
}

export function createDeliationGroupState(group: LinkGroup): DeliationGroupState {
  const memberIds = group.members.map((member) => member.id);
  const defaultShares = buildDefaultShares(memberIds, group.primary.id);

  return {
    primaryId: group.primary.id,
    memberIds,
    rentShares: defaultShares,
    priceShares: { ...defaultShares },
  };
}

export function sharesAreValid(shares: VentilationShares, memberIds: string[]) {
  const total = memberIds.reduce((sum, id) => sum + (shares[id] ?? 0), 0);
  return Math.abs(total - 100) < 0.01;
}

export function computeGroupTotals(
  group: LinkGroup,
  simulationsByProperty: Record<string, SimulationRecord>,
): GroupTotals {
  return group.members.reduce(
    (totals, member) => {
      const formValues = simulationToFormValues(
        simulationsByProperty[member.id],
        member.net_rent,
      );
      const inputs = formValuesToCalculationInputs(formValues);

      return {
        purchasePrice: totals.purchasePrice + inputs.targetPurchasePrice,
        rent: totals.rent + (inputs.targetRent || Number(member.net_rent ?? 0)),
        resalePrice: totals.resalePrice + inputs.targetResalePrice,
        works: totals.works + inputs.estimatedWorks,
        propertyTax: totals.propertyTax + inputs.annualPropertyTax,
        nonRecoverableCharges:
          totals.nonRecoverableCharges + inputs.nonRecoverableCharges,
      };
    },
    {
      purchasePrice: 0,
      rent: 0,
      resalePrice: 0,
      works: 0,
      propertyTax: 0,
      nonRecoverableCharges: 0,
    },
  );
}

export function ventilateFormValues(
  totals: GroupTotals,
  rentSharePercent: number,
  priceSharePercent: number,
  baseFormValues: SimulationFormValues,
): SimulationFormValues {
  const rentFactor = rentSharePercent / 100;
  const priceFactor = priceSharePercent / 100;

  return {
    ...baseFormValues,
    targetPurchasePrice: String(Math.round(totals.purchasePrice * priceFactor)),
    targetRent: String(Math.round(totals.rent * rentFactor * 100) / 100),
    targetResalePrice: String(Math.round(totals.resalePrice * priceFactor)),
    estimatedWorks: String(Math.round(totals.works * priceFactor)),
    annualPropertyTax: String(Math.round(totals.propertyTax * priceFactor)),
    nonRecoverableCharges: String(Math.round(totals.nonRecoverableCharges * priceFactor)),
  };
}

export function getVentilatedFormValues(
  property: PropertyTreeRow,
  group: LinkGroup,
  deliationState: DeliationGroupState,
  simulationsByProperty: Record<string, SimulationRecord>,
): SimulationFormValues {
  const totals = computeGroupTotals(group, simulationsByProperty);
  const baseFormValues = simulationToFormValues(
    simulationsByProperty[property.id],
    property.net_rent,
  );

  return ventilateFormValues(
    totals,
    deliationState.rentShares[property.id] ?? 0,
    deliationState.priceShares[property.id] ?? 0,
    baseFormValues,
  );
}

export function buildVentilationPreview(
  group: LinkGroup,
  deliationState: DeliationGroupState,
  simulationsByProperty: Record<string, SimulationRecord>,
): VentilatedMemberPreview[] {
  const totals = computeGroupTotals(group, simulationsByProperty);

  return group.members.map((property) => {
    const rentShare = deliationState.rentShares[property.id] ?? 0;
    const priceShare = deliationState.priceShares[property.id] ?? 0;
    const formValues = getVentilatedFormValues(
      property,
      group,
      deliationState,
      simulationsByProperty,
    );
    const metrics = calculateProfitability(formValuesToCalculationInputs(formValues));

    return {
      property,
      rentShare,
      priceShare,
      ventilatedRent: totals.rent * (rentShare / 100),
      ventilatedPurchasePrice: totals.purchasePrice * (priceShare / 100),
      grossYield: metrics.grossYield,
      netYield: metrics.netYield,
    };
  });
}

export function computeLinkedGroupMetrics(
  group: LinkGroup,
  simulationsByProperty: Record<string, SimulationRecord>,
) {
  const totals = computeGroupTotals(group, simulationsByProperty);
  const primaryForm = simulationToFormValues(
    simulationsByProperty[group.primary.id],
    group.primary.net_rent,
  );

  return calculateProfitability({
    ...formValuesToCalculationInputs(primaryForm),
    targetPurchasePrice: totals.purchasePrice,
    targetRent: totals.rent,
    targetResalePrice: totals.resalePrice,
    estimatedWorks: totals.works,
    annualPropertyTax: totals.propertyTax,
    nonRecoverableCharges: totals.nonRecoverableCharges,
  });
}

export function computeDeliatedGroupAggregate(
  group: LinkGroup,
  deliationState: DeliationGroupState,
  simulationsByProperty: Record<string, SimulationRecord>,
) {
  let totalCost = 0;
  let totalAnnualRent = 0;
  let totalAnnualNetIncome = 0;

  for (const property of group.members) {
    const formValues = getVentilatedFormValues(
      property,
      group,
      deliationState,
      simulationsByProperty,
    );
    const metrics = calculateProfitability(formValuesToCalculationInputs(formValues));
    totalCost += metrics.totalCost;
    totalAnnualRent += (formValuesToCalculationInputs(formValues).targetRent ?? 0) * 12;
    totalAnnualNetIncome += metrics.annualNetIncome;
  }

  return {
    totalCost,
    grossYield: totalCost > 0 ? totalAnnualRent / totalCost : null,
    netYield: totalCost > 0 ? totalAnnualNetIncome / totalCost : null,
  };
}
