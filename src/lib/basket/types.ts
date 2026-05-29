export type BasketMode = 'lié' | 'délié';

export type BasketUnit = {
  propertyIds: string[];
  mode: BasketMode | 'standalone';
};

export type BasketSummary = {
  lotCount: number;
  totalSurface: number;
  currentRent: number;
  targetRent: number;
  totalPurchasePrice: number;
  totalCost: number;
  grossYield: number | null;
  netYield: number | null;
  latentCapitalGain: number;
  netCapitalGain: number;
  mode: BasketMode;
  units: BasketUnit[];
};

export type ScenarioRecord = {
  id: string;
  name: string;
  mode: BasketMode;
  property_ids: string[];
  created_at: string;
};
