import { calculateProfitability } from '@/lib/calculations/rentability';
import type { SimulationInputs } from '@/lib/calculations/rentability';
import { findLinkGroup, flattenPropertyTree } from '@/lib/deliation/groups';
import type { DeliationGroupState } from '@/lib/deliation/types';
import {
  computeGroupTotals,
  createDeliationGroupState,
  getVentilatedFormValues,
} from '@/lib/deliation/ventilation';
import {
  formValuesToCalculationInputs,
  simulationToFormValues,
} from '@/lib/simulations/types';
import type { SimulationRecord } from '@/lib/simulations/types';
import type { BasketMode, BasketSummary, BasketUnit } from '@/lib/basket/types';
import type { PropertyTreeRow } from '@/lib/import/types';

type BasketContext = {
  selectedIds: Set<string>;
  treeRows: PropertyTreeRow[];
  simulationsByProperty: Record<string, SimulationRecord>;
  deliationGroups: Record<string, DeliationGroupState>;
  getEffectiveCalculationInputs: (
    property: PropertyTreeRow,
    simulation?: SimulationRecord,
  ) => SimulationInputs;
};

export function resolveBasketUnits(
  selectedIds: Set<string>,
  treeRows: PropertyTreeRow[],
  deliationGroups: Record<string, DeliationGroupState>,
): BasketUnit[] {
  const units: BasketUnit[] = [];
  const processed = new Set<string>();

  for (const root of treeRows) {
    if (!root.subRows?.length) continue;

    const group = findLinkGroup(root, treeRows);
    if (!group) continue;

    const selectedMembers = group.members.filter((member) => selectedIds.has(member.id));
    if (selectedMembers.length === 0) continue;

    group.members.forEach((member) => processed.add(member.id));

    const primarySelected = selectedIds.has(group.primary.id);
    const allAnnexesSelected = group.annexes.every((annex) => selectedIds.has(annex.id));
    const manuallyDeliated = Boolean(deliationGroups[group.primary.id]);

    if (
      primarySelected &&
      allAnnexesSelected &&
      selectedMembers.length === group.members.length &&
      !manuallyDeliated
    ) {
      units.push({
        propertyIds: group.members.map((member) => member.id),
        mode: 'lié',
      });
      continue;
    }

    for (const member of selectedMembers) {
      units.push({
        propertyIds: [member.id],
        mode: 'délié',
      });
    }
  }

  for (const id of selectedIds) {
    if (!processed.has(id)) {
      units.push({
        propertyIds: [id],
        mode: 'standalone',
      });
    }
  }

  return units;
}

function getMemberInputs(
  property: PropertyTreeRow,
  context: BasketContext,
): SimulationInputs {
  const group = findLinkGroup(property, context.treeRows);
  const deliationState =
    (group && context.deliationGroups[group.primary.id]) ||
    (group && shouldAutoDeliate(group, context.selectedIds)
      ? createDeliationGroupState(group)
      : undefined);

  if (group && deliationState) {
    return formValuesToCalculationInputs(
      getVentilatedFormValues(
        property,
        group,
        deliationState,
        context.simulationsByProperty,
      ),
    );
  }

  return context.getEffectiveCalculationInputs(
    property,
    context.simulationsByProperty[property.id],
  );
}

function shouldAutoDeliate(group: NonNullable<ReturnType<typeof findLinkGroup>>, selectedIds: Set<string>) {
  const primarySelected = selectedIds.has(group.primary.id);
  const allAnnexesSelected = group.annexes.every((annex) => selectedIds.has(annex.id));
  const anyAnnexSelected = group.annexes.some((annex) => selectedIds.has(annex.id));

  return (
    (primarySelected && anyAnnexSelected && !allAnnexesSelected) ||
    (!primarySelected && anyAnnexSelected)
  );
}

export function computeBasketSummary(context: BasketContext): BasketSummary | null {
  if (context.selectedIds.size === 0) return null;

  const flat = flattenPropertyTree(context.treeRows);
  const byId = new Map(flat.map((row) => [row.id, row]));
  const units = resolveBasketUnits(
    context.selectedIds,
    context.treeRows,
    context.deliationGroups,
  );

  let lotCount = 0;
  let totalSurface = 0;
  let currentRent = 0;
  let targetRent = 0;
  let totalPurchasePrice = 0;
  let totalCost = 0;
  let totalAnnualRent = 0;
  let totalAnnualNetIncome = 0;
  let latentCapitalGain = 0;
  let netCapitalGain = 0;

  for (const unit of units) {
    if (unit.mode === 'lié') {
      const group = findLinkGroup(byId.get(unit.propertyIds[0])!, context.treeRows);
      if (!group) continue;

      lotCount += group.members.length;
      totalSurface += group.members.reduce((sum, member) => sum + Number(member.surface ?? 0), 0);
      currentRent += group.members.reduce((sum, member) => sum + Number(member.net_rent ?? 0), 0);

      const totals = computeGroupTotals(group, context.simulationsByProperty);
      const primaryForm = simulationToFormValues(
        context.simulationsByProperty[group.primary.id],
        group.primary.net_rent,
      );
      const metrics = calculateProfitability({
        ...formValuesToCalculationInputs(primaryForm),
        targetPurchasePrice: totals.purchasePrice,
        targetRent: totals.rent,
        targetResalePrice: totals.resalePrice,
        estimatedWorks: totals.works,
        annualPropertyTax: totals.propertyTax,
        nonRecoverableCharges: totals.nonRecoverableCharges,
      });

      targetRent += totals.rent;
      totalPurchasePrice += totals.purchasePrice;
      totalCost += metrics.totalCost;
      totalAnnualRent += totals.rent * 12;
      totalAnnualNetIncome += metrics.annualNetIncome;
      latentCapitalGain += metrics.latentCapitalGain;
      netCapitalGain += metrics.netCapitalGain;
      continue;
    }

    for (const propertyId of unit.propertyIds) {
      const property = byId.get(propertyId);
      if (!property) continue;

      lotCount += 1;
      totalSurface += Number(property.surface ?? 0);
      currentRent += Number(property.net_rent ?? 0);

      const inputs = getMemberInputs(property, context);
      const metrics = calculateProfitability(inputs);

      targetRent += inputs.targetRent;
      totalPurchasePrice += inputs.targetPurchasePrice;
      totalCost += metrics.totalCost;
      totalAnnualRent += inputs.targetRent * 12;
      totalAnnualNetIncome += metrics.annualNetIncome;
      latentCapitalGain += metrics.latentCapitalGain;
      netCapitalGain += metrics.netCapitalGain;
    }
  }

  const hasDeliatedUnit = units.some((unit) => unit.mode === 'délié');

  return {
    lotCount,
    totalSurface,
    currentRent,
    targetRent,
    totalPurchasePrice,
    totalCost,
    grossYield: totalCost > 0 ? totalAnnualRent / totalCost : null,
    netYield: totalCost > 0 ? totalAnnualNetIncome / totalCost : null,
    latentCapitalGain,
    netCapitalGain,
    mode: hasDeliatedUnit ? 'délié' : 'lié',
    units,
  };
}

export function inferScenarioMode(summary: BasketSummary): BasketMode {
  return summary.mode;
}
