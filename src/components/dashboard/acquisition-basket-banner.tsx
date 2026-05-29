'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Save, Trash2, Maximize2 } from 'lucide-react';
import type { PropertyTreeRow } from '@/lib/import/types';
import type { ScenarioRecord } from '@/lib/basket/types';
import { computeBasketSummary, inferScenarioMode } from '@/lib/basket/compute-basket';
import { perSqm } from '@/lib/calculations/kpi';
import { useDeliation } from '@/lib/deliation/context';
import { findLinkGroup } from '@/lib/deliation/groups';
import { createDeliationGroupState } from '@/lib/deliation/ventilation';
import { saveScenario, deleteScenario } from '@/lib/scenarios/actions';
import { ExportLotsButton } from '@/components/dashboard/export-lots-button';
import { formatCurrency, formatEuroPerSqm, formatNumber, formatPercent } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type AcquisitionBasketBannerProps = {
  selectedProperties: PropertyTreeRow[];
  scenarios: ScenarioRecord[];
  onLoadScenario: (propertyIds: string[]) => void;
  onScenarioSaved?: () => void;
};

export function AcquisitionBasketBanner({
  selectedProperties,
  scenarios,
  onLoadScenario,
  onScenarioSaved,
}: AcquisitionBasketBannerProps) {
  const {
    treeRows,
    simulationsByProperty,
    deliationGroups,
    getEffectiveCalculationInputs,
    replaceDeliationGroups,
  } = useDeliation();

  const [scenarioName, setScenarioName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedIds = useMemo(
    () => new Set(selectedProperties.map((property) => property.id)),
    [selectedProperties],
  );

  const summary = useMemo(
    () =>
      computeBasketSummary({
        selectedIds,
        treeRows,
        simulationsByProperty,
        deliationGroups,
        getEffectiveCalculationInputs,
      }),
    [
      selectedIds,
      treeRows,
      simulationsByProperty,
      deliationGroups,
      getEffectiveCalculationInputs,
    ],
  );

  if (!summary || summary.lotCount === 0) return null;

  async function handleSaveScenario() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const result = await saveScenario(
      scenarioName,
      selectedProperties.map((property) => property.id),
      inferScenarioMode(summary!),
    );

    setIsSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setScenarioName('');
    setMessage(result.message);
    onScenarioSaved?.();
  }

  function handleLoadScenario(scenario: ScenarioRecord) {
    onLoadScenario(scenario.property_ids);

    if (scenario.mode === 'délié') {
      const states: Record<string, ReturnType<typeof createDeliationGroupState>> = {};
      const ids = new Set(scenario.property_ids);

      for (const root of treeRows) {
        const group = findLinkGroup(root, treeRows);
        if (!group) continue;
        if (group.members.some((member) => ids.has(member.id))) {
          states[group.primary.id] = createDeliationGroupState(group);
        }
      }

      replaceDeliationGroups(states);
    } else {
      replaceDeliationGroups({});
    }

    setMessage(`Scénario « ${scenario.name} » chargé.`);
  }

  async function handleDeleteScenario(scenarioId: string) {
    const result = await deleteScenario(scenarioId);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    onScenarioSaved?.();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto max-w-7xl space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Panier d&apos;acquisition</p>
              <p className="text-xs text-muted-foreground">
                Mode {summary.mode} · {summary.lotCount} lot(s) · {formatNumber(summary.totalSurface, 0)} m²
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/panier">
                <Maximize2 className="mr-2 h-4 w-4" />
                Panier détaillé
              </Link>
            </Button>
            <ExportLotsButton
              properties={selectedProperties}
              scenarioName={scenarioName || `Panier ${summary.mode}`}
              basketSummary={summary}
              onExported={onScenarioSaved}
            />
            <Input
              placeholder="Nom du scénario"
              value={scenarioName}
              onChange={(event) => setScenarioName(event.target.value)}
              className="h-9 w-48"
            />
            <Button size="sm" onClick={handleSaveScenario} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Prix achat cible" value={formatCurrency(summary.totalPurchasePrice)} />
          <Metric
            label="Prix /m²"
            value={formatEuroPerSqm(perSqm(summary.totalPurchasePrice, summary.totalSurface))}
          />
          <Metric label="Coût de revient" value={formatCurrency(summary.totalCost)} />
          <Metric label="Loyer HC cible" value={formatCurrency(summary.targetRent)} />
          <Metric
            label="Loyer /m²"
            value={formatEuroPerSqm(perSqm(summary.targetRent, summary.totalSurface), 1)}
          />
          <Metric
            label="Rentabilité brute"
            value={formatPercent(summary.grossYield ? summary.grossYield * 100 : null)}
          />
          <Metric
            label="Rentabilité nette"
            value={formatPercent(summary.netYield ? summary.netYield * 100 : null)}
            highlight
          />
          <Metric label="Plus-value nette" value={formatCurrency(summary.netCapitalGain)} />
        </div>

        {summary.mode === 'délié' && (
          <p className="text-xs text-muted-foreground">
            Totaux ajustés automatiquement : au moins un groupe appartement/annexe est traité en mode
            délié (annexe non cochée ou déliation active).
          </p>
        )}

        {scenarios.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="flex items-center gap-1 rounded-full border bg-muted/40 pl-3 text-xs"
              >
                <button
                  type="button"
                  className="py-1.5 hover:underline"
                  onClick={() => handleLoadScenario(scenario)}
                >
                  {scenario.name} ({scenario.mode})
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-full p-0"
                  onClick={() => handleDeleteScenario(scenario.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {message && (
          <Alert>
            <AlertTitle>Succès</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
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

function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${highlight ? 'border-primary/30 bg-primary/5' : 'bg-muted/20'}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
