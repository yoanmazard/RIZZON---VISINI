import type { PropertyTreeRow } from '@/lib/import/types';

export type VentilationShares = Record<string, number>;

export type DeliationGroupState = {
  primaryId: string;
  memberIds: string[];
  rentShares: VentilationShares;
  priceShares: VentilationShares;
};

export type LinkGroup = {
  primary: PropertyTreeRow;
  annexes: PropertyTreeRow[];
  members: PropertyTreeRow[];
};

export type GroupTotals = {
  purchasePrice: number;
  rent: number;
  resalePrice: number;
  works: number;
  propertyTax: number;
  nonRecoverableCharges: number;
};

export type VentilatedMemberPreview = {
  property: PropertyTreeRow;
  rentShare: number;
  priceShare: number;
  ventilatedRent: number;
  ventilatedPurchasePrice: number;
  grossYield: number | null;
  netYield: number | null;
};
