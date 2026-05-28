'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PropertyTreeRow } from '@/lib/import/types';
import type { SimulationRecord } from '@/lib/simulations/types';
import type { DeliationGroupState, LinkGroup } from '@/lib/deliation/types';
import {
  getVentilatedFormValues,
} from '@/lib/deliation/ventilation';
import { findLinkGroup, getPrimaryIdForPropertyId } from '@/lib/deliation/groups';
import {
  formValuesToCalculationInputs,
  simulationToFormValues,
  type SimulationFormValues,
} from '@/lib/simulations/types';

type DeliationContextValue = {
  treeRows: PropertyTreeRow[];
  simulationsByProperty: Record<string, SimulationRecord>;
  deliationGroups: Record<string, DeliationGroupState>;
  modalGroup: LinkGroup | null;
  openDeliationModal: (property: PropertyTreeRow) => void;
  closeDeliationModal: () => void;
  confirmDeliation: (state: DeliationGroupState) => void;
  cancelDeliation: (primaryId: string) => void;
  replaceDeliationGroups: (states: Record<string, DeliationGroupState>) => void;
  isDeliated: (propertyId: string) => boolean;
  getEffectiveFormValues: (
    property: PropertyTreeRow,
    simulation?: SimulationRecord,
  ) => SimulationFormValues;
  getEffectiveCalculationInputs: (
    property: PropertyTreeRow,
    simulation?: SimulationRecord,
  ) => ReturnType<typeof formValuesToCalculationInputs>;
};

const DeliationContext = createContext<DeliationContextValue | null>(null);

type DeliationProviderProps = {
  treeRows: PropertyTreeRow[];
  simulationsByProperty: Record<string, SimulationRecord>;
  children: ReactNode;
};

export function DeliationProvider({
  treeRows,
  simulationsByProperty,
  children,
}: DeliationProviderProps) {
  const [deliationGroups, setDeliationGroups] = useState<Record<string, DeliationGroupState>>({});
  const [modalGroup, setModalGroup] = useState<LinkGroup | null>(null);

  const openDeliationModal = useCallback(
    (property: PropertyTreeRow) => {
      const group = findLinkGroup(property, treeRows);
      if (!group) return;
      setModalGroup(group);
    },
    [treeRows],
  );

  const closeDeliationModal = useCallback(() => {
    setModalGroup(null);
  }, []);

  const confirmDeliation = useCallback((state: DeliationGroupState) => {
    setDeliationGroups((current) => ({
      ...current,
      [state.primaryId]: state,
    }));
    setModalGroup(null);
  }, []);

  const cancelDeliation = useCallback((primaryId: string) => {
    setDeliationGroups((current) => {
      const next = { ...current };
      delete next[primaryId];
      return next;
    });
  }, []);

  const replaceDeliationGroups = useCallback((states: Record<string, DeliationGroupState>) => {
    setDeliationGroups(states);
  }, []);

  const isDeliated = useCallback(
    (propertyId: string) => {
      const primaryId = getPrimaryIdForPropertyId(propertyId, treeRows);
      if (!primaryId) return false;
      return Boolean(deliationGroups[primaryId]);
    },
    [deliationGroups, treeRows],
  );

  const getEffectiveFormValues = useCallback(
    (property: PropertyTreeRow, simulation?: SimulationRecord) => {
      const group = findLinkGroup(property, treeRows);
      const primaryId = group?.primary.id;
      const deliationState = primaryId ? deliationGroups[primaryId] : undefined;

      if (group && deliationState) {
        return getVentilatedFormValues(property, group, deliationState, simulationsByProperty);
      }

      return simulationToFormValues(simulation, property.net_rent);
    },
    [deliationGroups, simulationsByProperty, treeRows],
  );

  const getEffectiveCalculationInputs = useCallback(
    (property: PropertyTreeRow, simulation?: SimulationRecord) =>
      formValuesToCalculationInputs(getEffectiveFormValues(property, simulation)),
    [getEffectiveFormValues],
  );

  const value = useMemo(
    () => ({
      treeRows,
      simulationsByProperty,
      deliationGroups,
      modalGroup,
      openDeliationModal,
      closeDeliationModal,
      confirmDeliation,
      cancelDeliation,
      replaceDeliationGroups,
      isDeliated,
      getEffectiveFormValues,
      getEffectiveCalculationInputs,
    }),
    [
      treeRows,
      simulationsByProperty,
      deliationGroups,
      modalGroup,
      openDeliationModal,
      closeDeliationModal,
      confirmDeliation,
      cancelDeliation,
      replaceDeliationGroups,
      isDeliated,
      getEffectiveFormValues,
      getEffectiveCalculationInputs,
    ],
  );

  return <DeliationContext.Provider value={value}>{children}</DeliationContext.Provider>;
}

export function useDeliation() {
  const context = useContext(DeliationContext);
  if (!context) {
    throw new Error('useDeliation must be used within DeliationProvider');
  }
  return context;
}

export function useDeliationOptional() {
  return useContext(DeliationContext);
}
