'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Save, Trash2, Unlink, Link2, Scale, X, RotateCcw } from 'lucide-react';
import type { PropertyTreeRow } from '@/lib/import/types';
import type { SimulationRecord, SimulationFormValues } from '@/lib/simulations/types';
import { simulationToFormValues } from '@/lib/simulations/types';
import type { BasketSummary, ScenarioRecord } from '@/lib/basket/types';
import { computeBasketSummary, inferScenarioMode } from '@/lib/basket/compute-basket';
import { calculateProfitability, parseMoneyInput } from '@/lib/calculations/rentability';
import { perSqm } from '@/lib/calculations/kpi';
import { DeliationProvider, useDeliation } from '@/lib/deliation/context';
import { DeliationModal } from '@/components/dashboard/deliation-modal';
import { flattenPropertyTree, findLinkGroup } from '@/lib/deliation/groups';
import { createDeliationGroupState } from '@/lib/deliation/ventilation';
import { saveScenario, deleteScenario } from '@/lib/scenarios/actions';
import { saveSimulationsBatch } from '@/lib/simulations/actions';
import { readBasketSelection, writeBasketSelection } from '@/lib/basket/selection-storage';
import { ExportLotsButton } from '@/components/dashboard/export-lots-button';
import {
  formatCurrency,
  formatEuroPerSqm,
  formatNumber,
  formatPercent,
  formatSurface,
} from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Props = {
  treeRows: PropertyTreeRow[];
  simulationsByProperty: Record<string, SimulationRecord>;
  scenarios: ScenarioRecord[];
};

/** Hypothèses éditées à la volée (chaînes saisies, non encore enregistrées). */
type Override = { targetPurchasePrice?: string; targetRent?: string };
type Overrides = Record<string, Override>;

function applyOverride(
  saved: SimulationRecord | undefined,
  override: Override,
  propertyId: string,
): SimulationRecord {
  const base: SimulationRecord = saved ?? {
    id: '',
    property_id: propertyId,
    target_purchase_price: null,
    target_rent: null,
    target_resale_price: null,
    estimated_works: null,
    notary_fee_rate: null,
    annual_property_tax: null,
    non_recoverable_charges: null,
    vacancy_rate: null,
    mgmt_fee_rate: null,
  };

  return {
    ...base,
    property_id: propertyId,
    target_purchase_price:
      override.targetPurchasePrice !== undefined
        ? parseMoneyOrNull(override.targetPurchasePrice)
        : base.target_purchase_price,
    target_rent:
      override.targetRent !== undefined
        ? parseMoneyOrNull(override.targetRent)
        : base.target_rent,
  };
}

function parseMoneyOrNull(value: string): number | null {
  if (!value.trim()) return null;
  return parseMoneyInput(value);
}

export function SimulationWorkspace({ treeRows, simulationsByProperty, scenarios }: Props) {
  const [overrides, setOverrides] = useState<Overrides>({});

  // Hypothèses effectives = enregistrées + éditions en cours → alimentent tous les calculs.
  const effectiveSims = useMemo(() => {
    const map: Record<string, SimulationRecord> = { ...simulationsByProperty };
    for (const [id, override] of Object.entries(overrides)) {
      map[id] = applyOverride(simulationsByProperty[id], override, id);
    }
    return map;
  }, [simulationsByProperty, overrides]);

  return (
    <DeliationProvider treeRows={treeRows} simulationsByProperty={effectiveSims}>
      <WorkspaceInner
        treeRows={treeRows}
        savedSims={simulationsByProperty}
        scenarios={scenarios}
        overrides={overrides}
        setOverrides={setOverrides}
      />
      <DeliationModal />
    </DeliationProvider>
  );
}

type InnerProps = {
  treeRows: PropertyTreeRow[];
  savedSims: Record<string, SimulationRecord>;
  scenarios: ScenarioRecord[];
  overrides: Overrides;
  setOverrides: React.Dispatch<React.SetStateAction<Overrides>>;
};

function WorkspaceInner({ treeRows, savedSims, scenarios, overrides, setOverrides }: InnerProps) {
  const router = useRouter();
  const {
    simulationsByProperty: effSims,
    deliationGroups,
    getEffectiveCalculationInputs,
    replaceDeliationGroups,
    isDeliated,
    openDeliationModal,
    cancelDeliation,
  } = useDeliation();

  const flat = useMemo(() => flattenPropertyTree(treeRows), [treeRows]);
  const byId = useMemo(() => new Map(flat.map((row) => [row.id, row])), [flat]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scenarioName, setScenarioName] = useState('');
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);

  const dirty = Object.keys(overrides).length > 0;

  useEffect(() => {
    const initial = readBasketSelection().filter((id) => byId.has(id));
    if (initial.length > 0) setSelectedIds(new Set(initial));
  }, [byId]);

  useEffect(() => {
    writeBasketSelection([...selectedIds]);
  }, [selectedIds]);

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(flat.map((row) => row.id)));
  }

  function clearAll() {
    setSelectedIds(new Set());
    replaceDeliationGroups({});
  }

  function setOverride(id: string, field: keyof Override, value: string) {
    setOverrides((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  function inputValue(id: string, field: keyof Override): string {
    const override = overrides[id];
    if (override && override[field] !== undefined) return override[field] as string;
    const saved = savedSims[id];
    if (field === 'targetPurchasePrice') {
      return saved?.target_purchase_price != null ? String(saved.target_purchase_price) : '';
    }
    // loyer cible : par défaut le loyer actuel si aucune hypothèse enregistrée
    if (saved?.target_rent != null) return String(saved.target_rent);
    const row = byId.get(id);
    return row?.net_rent != null ? String(row.net_rent) : '';
  }

  const summary = useMemo(
    () =>
      computeBasketSummary({
        selectedIds,
        treeRows,
        simulationsByProperty: effSims,
        deliationGroups,
        getEffectiveCalculationInputs,
      }),
    [selectedIds, treeRows, effSims, deliationGroups, getEffectiveCalculationInputs],
  );

  const selectedRows = useMemo(
    () => flat.filter((row) => selectedIds.has(row.id)),
    [flat, selectedIds],
  );

  function buildScenarioGroups(scenario: ScenarioRecord) {
    if (scenario.mode !== 'délié') return {};
    const states: Record<string, ReturnType<typeof createDeliationGroupState>> = {};
    const ids = new Set(scenario.property_ids);
    for (const root of treeRows) {
      const group = findLinkGroup(root, treeRows);
      if (!group) continue;
      if (group.members.some((member) => ids.has(member.id))) {
        states[group.primary.id] = createDeliationGroupState(group);
      }
    }
    return states;
  }

  function summaryForScenario(scenario: ScenarioRecord): BasketSummary | null {
    return computeBasketSummary({
      selectedIds: new Set(scenario.property_ids),
      treeRows,
      simulationsByProperty: effSims,
      deliationGroups: buildScenarioGroups(scenario),
      getEffectiveCalculationInputs,
    });
  }

  function loadScenario(scenario: ScenarioRecord) {
    setSelectedIds(new Set(scenario.property_ids.filter((id) => byId.has(id))));
    replaceDeliationGroups(scenario.mode === 'délié' ? buildScenarioGroups(scenario) : {});
    setMessage(`Scénario « ${scenario.name} » chargé.`);
    setError(null);
  }

  async function persistOverrides() {
    const entries = Object.keys(overrides).map((id) => {
      const row = byId.get(id);
      const base = simulationToFormValues(savedSims[id], row?.net_rent ?? null);
      const override = overrides[id];
      const values: SimulationFormValues = {
        ...base,
        targetPurchasePrice:
          override.targetPurchasePrice !== undefined
            ? override.targetPurchasePrice
            : base.targetPurchasePrice,
        targetRent: override.targetRent !== undefined ? override.targetRent : base.targetRent,
      };
      return { propertyId: id, values };
    });

    setIsPersisting(true);
    setError(null);
    setMessage(null);
    const result = await saveSimulationsBatch(entries);
    setIsPersisting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOverrides({});
    setMessage(result.message);
    router.refresh();
  }

  async function handleSaveScenario() {
    if (!summary) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);
    const result = await saveScenario(scenarioName, [...selectedIds], inferScenarioMode(summary));
    setIsSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setScenarioName('');
    setMessage(result.message);
    router.refresh();
  }

  async function handleDelete(scenarioId: string) {
    const result = await deleteScenario(scenarioId);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    router.refresh();
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const compareScenarios = scenarios.filter((scenario) => compareIds.has(scenario.id));

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* Sélecteur de lots */}
      <Card className="lg:sticky lg:top-24 lg:self-start">
        <CardHeader>
          <CardTitle className="text-base">Lots</CardTitle>
          <CardDescription>{selectedIds.size} sélectionné(s)</CardDescription>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Tout cocher
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll}>
              Vider
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
            {treeRows.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun lot importé.</p>
            )}
            {treeRows.map((root) => (
              <div key={root.id}>
                <LotPick row={root} checked={selectedIds.has(root.id)} onToggle={toggle} />
                {root.subRows?.map((annex) => (
                  <LotPick
                    key={annex.id}
                    row={annex}
                    checked={selectedIds.has(annex.id)}
                    onToggle={toggle}
                    indent
                  />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        {!summary || summary.lotCount === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <ShoppingCart className="h-8 w-8" />
              <p>Cochez des lots à gauche (ou depuis le tableau de bord) pour démarrer une simulation.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Agrégats */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Récapitulatif — mode {summary.mode}</CardTitle>
                    <CardDescription>
                      {summary.lotCount} lot(s) · {formatSurface(summary.totalSurface, 0)}
                      {dirty && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          modifications non enregistrées
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {dirty && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOverrides({})}
                          disabled={isPersisting}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Annuler
                        </Button>
                        <Button size="sm" onClick={persistOverrides} disabled={isPersisting}>
                          <Save className="mr-2 h-4 w-4" />
                          {isPersisting ? 'Enregistrement…' : 'Enregistrer les hypothèses'}
                        </Button>
                      </>
                    )}
                    <ExportLotsButton
                      properties={selectedRows}
                      scenarioName={scenarioName || `Panier ${summary.mode}`}
                      basketSummary={summary}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  <Stat label="Prix d'achat cible" value={formatCurrency(summary.totalPurchasePrice)} />
                  <Stat
                    label="Prix /m²"
                    value={formatEuroPerSqm(perSqm(summary.totalPurchasePrice, summary.totalSurface))}
                  />
                  <Stat label="Coût de revient" value={formatCurrency(summary.totalCost)} />
                  <Stat label="Loyer HC actuel" value={formatCurrency(summary.currentRent)} />
                  <Stat label="Loyer HC cible" value={formatCurrency(summary.targetRent)} />
                  <Stat
                    label="Loyer /m²"
                    value={formatEuroPerSqm(perSqm(summary.targetRent, summary.totalSurface), 1)}
                  />
                  <Stat
                    label="Rentabilité brute"
                    value={formatPercent(summary.grossYield ? summary.grossYield * 100 : null)}
                  />
                  <Stat
                    label="Rentabilité nette"
                    value={formatPercent(summary.netYield ? summary.netYield * 100 : null)}
                    highlight
                  />
                  <Stat label="Plus-value latente" value={formatCurrency(summary.latentCapitalGain)} />
                </div>
                {summary.mode === 'délié' && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Stratégie déliée : au moins un groupe appartement/annexe est traité séparément.
                    Totaux ajustés automatiquement.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Détail par lot — éditable */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Détail par lot</CardTitle>
                <CardDescription>
                  Ajustez <strong>prix cible</strong> et <strong>loyer cible</strong> : les totaux se
                  recalculent en direct. Pensez à enregistrer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {[
                          'Lot',
                          'Type',
                          'Mode',
                          'Surface',
                          'Prix cible (€)',
                          'Prix/m²',
                          'Loyer cible (€)',
                          'Loyer/m²',
                          'Coût revient',
                          'Brute',
                          'Nette',
                          'Plus-value',
                          '',
                        ].map((label) => (
                          <th key={label} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRows.map((row) => {
                        const inputs = getEffectiveCalculationInputs(row, effSims[row.id]);
                        const m = calculateProfitability(inputs);
                        const group = findLinkGroup(row, treeRows);
                        const canDeliate = Boolean(
                          group && group.primary.id === row.id && group.annexes.length > 0,
                        );
                        const deliated = isDeliated(row.id);
                        return (
                          <tr key={row.id} className="border-t">
                            <td className="whitespace-nowrap px-3 py-2 font-medium">{row.ref_lot}</td>
                            <td className="whitespace-nowrap px-3 py-2">{row.main_type}</td>
                            <td className="whitespace-nowrap px-3 py-2">
                              <ModeBadge deliated={deliated} linked={row.depth > 0} annex={row.is_annex} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">{formatSurface(row.surface, 1)}</td>
                            <td className="px-2 py-1.5">
                              <NumberInput
                                value={inputValue(row.id, 'targetPurchasePrice')}
                                onChange={(v) => setOverride(row.id, 'targetPurchasePrice', v)}
                                disabled={deliated}
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">
                              {formatEuroPerSqm(perSqm(inputs.targetPurchasePrice, row.surface))}
                            </td>
                            <td className="px-2 py-1.5">
                              <NumberInput
                                value={inputValue(row.id, 'targetRent')}
                                onChange={(v) => setOverride(row.id, 'targetRent', v)}
                                disabled={deliated}
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">
                              {formatEuroPerSqm(perSqm(inputs.targetRent, row.surface), 1)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">
                              {m.totalCost > 0 ? formatCurrency(m.totalCost) : '—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">
                              {formatPercent(m.grossYield != null ? m.grossYield * 100 : null)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 font-semibold text-emerald-700">
                              {formatPercent(m.netYield != null ? m.netYield * 100 : null)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">
                              {formatCurrency(m.latentCapitalGain)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">
                              {canDeliate &&
                                (deliated ? (
                                  <Button variant="ghost" size="sm" onClick={() => cancelDeliation(row.id)}>
                                    <Link2 className="mr-1 h-3.5 w-3.5" />
                                    Relier
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="sm" onClick={() => openDeliationModal(row)}>
                                    <Unlink className="mr-1 h-3.5 w-3.5" />
                                    Délier
                                  </Button>
                                ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Les hypothèses détaillées (travaux, taxe foncière, vacance, frais de gestion, revente)
                  restent réglables dans la fiche lot du tableau de bord.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Scénarios sauvegardés + comparateur */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Scénarios</CardTitle>
                <CardDescription>
                  Cliquez pour charger un scénario, ou cochez-en plusieurs pour comparer.
                </CardDescription>
              </div>
              {summary && summary.lotCount > 0 && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nom du scénario"
                    value={scenarioName}
                    onChange={(event) => setScenarioName(event.target.value)}
                    className="h-9 w-44"
                  />
                  <Button size="sm" onClick={handleSaveScenario} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Sauvegarde…' : 'Sauvegarder la sélection'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {scenarios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun scénario enregistré pour l&apos;instant.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {scenarios.map((scenario) => {
                  const s = summaryForScenario(scenario);
                  return (
                    <div key={scenario.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          className="text-left font-medium hover:underline"
                          onClick={() => loadScenario(scenario)}
                        >
                          {scenario.name}
                        </button>
                        <div className="flex items-center gap-1">
                          <label className="flex items-center gap-1 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={compareIds.has(scenario.id)}
                              onChange={() => toggleCompare(scenario.id)}
                            />
                            <Scale className="h-3.5 w-3.5" />
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleDelete(scenario.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {scenario.mode} · {scenario.property_ids.length} lot(s)
                      </p>
                      {s && (
                        <p className="mt-1 text-xs">
                          Nette{' '}
                          <span className="font-semibold text-emerald-700">
                            {formatPercent(s.netYield ? s.netYield * 100 : null)}
                          </span>{' '}
                          · {formatCurrency(s.totalCost)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {compareScenarios.length >= 2 && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Indicateur</th>
                      {compareScenarios.map((scenario) => (
                        <th key={scenario.id} className="px-3 py-2 text-left font-medium">
                          {scenario.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE_ROWS.map((metric) => (
                      <tr key={metric.label} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">{metric.label}</td>
                        {compareScenarios.map((scenario) => (
                          <td key={scenario.id} className="px-3 py-2">
                            {metric.render(summaryForScenario(scenario))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {compareScenarios.length === 1 && (
              <p className="text-xs text-muted-foreground">
                Cochez un second scénario pour activer la comparaison côte à côte.
              </p>
            )}
          </CardContent>
        </Card>

        {message && (
          <Alert>
            <AlertTitle>Succès</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-2">
              {message}
              <button type="button" onClick={() => setMessage(null)}>
                <X className="h-4 w-4" />
              </button>
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

const COMPARE_ROWS: { label: string; render: (s: BasketSummary | null) => string }[] = [
  { label: 'Lots', render: (s) => (s ? String(s.lotCount) : '—') },
  { label: 'Surface', render: (s) => (s ? formatSurface(s.totalSurface, 0) : '—') },
  { label: 'Prix achat', render: (s) => (s ? formatCurrency(s.totalPurchasePrice) : '—') },
  {
    label: 'Prix /m²',
    render: (s) => (s ? formatEuroPerSqm(perSqm(s.totalPurchasePrice, s.totalSurface)) : '—'),
  },
  { label: 'Coût de revient', render: (s) => (s ? formatCurrency(s.totalCost) : '—') },
  { label: 'Loyer HC cible', render: (s) => (s ? formatCurrency(s.targetRent) : '—') },
  {
    label: 'Loyer /m²',
    render: (s) => (s ? formatEuroPerSqm(perSqm(s.targetRent, s.totalSurface), 1) : '—'),
  },
  {
    label: 'Rent. brute',
    render: (s) => (s ? formatPercent(s.grossYield ? s.grossYield * 100 : null) : '—'),
  },
  {
    label: 'Rent. nette',
    render: (s) => (s ? formatPercent(s.netYield ? s.netYield * 100 : null) : '—'),
  },
  { label: 'Plus-value latente', render: (s) => (s ? formatCurrency(s.latentCapitalGain) : '—') },
];

function NumberInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      inputMode="decimal"
      disabled={disabled}
      className="h-8 w-28"
    />
  );
}

function LotPick({
  row,
  checked,
  onToggle,
  indent = false,
}: {
  row: PropertyTreeRow;
  checked: boolean;
  onToggle: (id: string) => void;
  indent?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50 ${
        indent ? 'ml-5' : ''
      }`}
    >
      <input type="checkbox" checked={checked} onChange={() => onToggle(row.id)} />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium">{row.ref_lot}</span>{' '}
        <span className="text-muted-foreground">· {row.main_type}</span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{formatNumber(row.net_rent, 0)} €</span>
    </label>
  );
}

function ModeBadge({
  deliated,
  linked,
  annex,
}: {
  deliated: boolean;
  linked: boolean;
  annex: boolean;
}) {
  if (deliated) {
    return <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800">Délié</span>;
  }
  if (linked) {
    return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">Lié</span>;
  }
  if (annex) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">Indép.</span>;
  }
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">Lot</span>;
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-primary/30 bg-primary/5' : 'bg-muted/20'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
