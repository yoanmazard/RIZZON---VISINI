'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Unlink, Link2 } from 'lucide-react';
import type { PropertyTreeRow } from '@/lib/import/types';
import type { SimulationRecord } from '@/lib/simulations/types';
import {
  formValuesToCalculationInputs,
  simulationToFormValues,
  type SimulationFormValues,
} from '@/lib/simulations/types';
import { calculateProfitability } from '@/lib/calculations/rentability';
import { perSqm } from '@/lib/calculations/kpi';
import { saveIndividualSimulation } from '@/lib/simulations/actions';
import { findLinkGroup, getPrimaryIdForPropertyId } from '@/lib/deliation/groups';
import { useDeliation } from '@/lib/deliation/context';
import {
  formatCurrency,
  formatEuroPerSqm,
  formatNumber,
  formatPercent,
  formatSurface,
} from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type PropertySheetProps = {
  property: PropertyTreeRow | null;
  simulation: SimulationRecord | null | undefined;
  onClose: () => void;
  onSaved?: () => void;
};

const defaultForm = (property: PropertyTreeRow | null, simulation?: SimulationRecord | null) =>
  simulationToFormValues(simulation, property?.net_rent ?? null);

export function PropertySheet({ property, simulation, onClose, onSaved }: PropertySheetProps) {
  const {
    treeRows,
    isDeliated,
    openDeliationModal,
    cancelDeliation,
    getEffectiveFormValues,
    getEffectiveCalculationInputs,
  } = useDeliation();

  const [values, setValues] = useState<SimulationFormValues>(() =>
    defaultForm(property, simulation),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const linkGroup = useMemo(
    () => (property ? findLinkGroup(property, treeRows) : null),
    [property, treeRows],
  );

  const deliated = property ? isDeliated(property.id) : false;
  const primaryId = property ? getPrimaryIdForPropertyId(property.id, treeRows) : null;

  useEffect(() => {
    setValues(defaultForm(property, simulation));
    setMessage(null);
    setError(null);
  }, [property, simulation]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const ventilatedForm = useMemo(() => {
    if (!property || !deliated) return null;
    return getEffectiveFormValues(property, simulation ?? undefined);
  }, [property, deliated, getEffectiveFormValues, simulation]);

  const effectiveInputs = useMemo(() => {
    if (property && deliated) {
      return getEffectiveCalculationInputs(property, simulation ?? undefined);
    }
    return formValuesToCalculationInputs(values);
  }, [property, deliated, getEffectiveCalculationInputs, simulation, values]);

  const metrics = useMemo(
    () => calculateProfitability(effectiveInputs),
    [effectiveInputs],
  );

  if (!property) return null;

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const result = await saveIndividualSimulation(property!.id, values);
    setIsSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
    onSaved?.();
  }

  function updateField<K extends keyof SimulationFormValues>(key: K, value: SimulationFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const canDeliate = Boolean(linkGroup && linkGroup.annexes.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fermer la fiche lot"
        onClick={onClose}
      />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-background px-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Fiche lot</p>
            <h2 className="text-xl font-semibold">{property.ref_lot}</h2>
            <p className="text-sm text-muted-foreground">
              {property.main_type}
              {property.building_name ? ` · ${property.building_name}` : ''}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {deliated && (
            <Alert>
              <AlertTitle>Mode délié (scénario)</AlertTitle>
              <AlertDescription>
                Les montants affichés sont ventilés. La donnée source importée reste inchangée.
              </AlertDescription>
            </Alert>
          )}

          {canDeliate && (
            <div className="flex flex-wrap gap-2">
              {!deliated ? (
                <Button variant="outline" size="sm" onClick={() => openDeliationModal(property)}>
                  <Unlink className="mr-2 h-4 w-4" />
                  Délier ce lot
                </Button>
              ) : (
                primaryId && (
                  <Button variant="outline" size="sm" onClick={() => cancelDeliation(primaryId)}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Revenir au mode lié
                  </Button>
                )
              )}
            </div>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Situation actuelle
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Statut" value={property.status} />
              <Info label="Locataire" value={property.tenant_label ?? '—'} />
              <Info label="Loyer HC actuel" value={formatCurrency(property.net_rent)} />
              <Info
                label="Loyer HC /m²"
                value={formatEuroPerSqm(perSqm(property.net_rent, property.surface), 1)}
              />
              <Info label="Surface" value={formatSurface(property.surface, 1)} />
              <Info
                label="Pièces"
                value={property.nb_pieces != null ? String(property.nb_pieces) : '—'}
              />
              <Info label="Étage" value={property.floor ?? '—'} />
              <Info label="Charges (provisions)" value={formatCurrency(property.rental_charges)} />
              <Info label="Dépôt de garantie" value={formatCurrency(property.deposit)} />
              <Info
                label="Ancienneté bail"
                value={
                  property.lease_seniority_months != null
                    ? `${formatNumber(property.lease_seniority_months)} mois`
                    : '—'
                }
              />
              <Info label="DPE" value={property.dpe_grade ?? '—'} />
              <Info label="Adresse" value={property.address ?? '—'} />
            </div>
            {linkGroup && !deliated && (
              <p className="text-xs text-muted-foreground">
                Lié à {linkGroup.primary.ref_lot}
                {property.id !== linkGroup.primary.id ? ' (annexe)' : ` · ${linkGroup.annexes.length} annexe(s)`}
              </p>
            )}
            {property.notice_in_progress && (
              <Alert>
                <AlertTitle>Préavis en cours</AlertTitle>
                <AlertDescription>Risque de vacance imminente à intégrer dans vos hypothèses.</AlertDescription>
              </Alert>
            )}
          </section>

          {deliated && ventilatedForm && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Hypothèses ventilées (délié)
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Prix ventilé" value={formatCurrency(Number(ventilatedForm.targetPurchasePrice))} />
                <Info label="Loyer ventilé HC" value={formatCurrency(Number(ventilatedForm.targetRent))} />
                <Info label="Revente ventilée" value={formatCurrency(Number(ventilatedForm.targetResalePrice))} />
                <Info label="Travaux ventilés" value={formatCurrency(Number(ventilatedForm.estimatedWorks))} />
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Hypothèses d&apos;acquisition {deliated ? '(source)' : ''}
            </h3>
            <div className="grid gap-4">
              <Field
                label="Prix d'achat envisagé (€)"
                value={values.targetPurchasePrice}
                onChange={(value) => updateField('targetPurchasePrice', value)}
                disabled={deliated}
              />
              <Field
                label="Frais de notaire (%)"
                value={values.notaryFeeRatePercent}
                onChange={(value) => updateField('notaryFeeRatePercent', value)}
                hint={`Soit ${formatCurrency(metrics.notaryFees)}`}
              />
              <Field
                label="Budget travaux (€)"
                value={values.estimatedWorks}
                onChange={(value) => updateField('estimatedWorks', value)}
                disabled={deliated}
              />
              <Field
                label="Loyer cible HC / mois (€)"
                value={values.targetRent}
                onChange={(value) => updateField('targetRent', value)}
                disabled={deliated}
              />
              <Field
                label="Prix de revente projeté (€)"
                value={values.targetResalePrice}
                onChange={(value) => updateField('targetResalePrice', value)}
                disabled={deliated}
              />
              <Field
                label="Taxe foncière annuelle (€)"
                value={values.annualPropertyTax}
                onChange={(value) => updateField('annualPropertyTax', value)}
              />
              <Field
                label="Charges copro non récupérables / an (€)"
                value={values.nonRecoverableCharges}
                onChange={(value) => updateField('nonRecoverableCharges', value)}
              />
              <Field
                label="Taux de vacance prévisionnel (%)"
                value={values.vacancyRatePercent}
                onChange={(value) => updateField('vacancyRatePercent', value)}
              />
              <Field
                label="Frais de gestion (% du loyer encaissé)"
                value={values.mgmtFeeRatePercent}
                onChange={(value) => updateField('mgmtFeeRatePercent', value)}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Résultats {deliated ? '(après ventilation)' : '(temps réel)'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Coût de revient" value={formatCurrency(metrics.totalCost)} />
              <MetricCard
                label="Prix d'achat /m²"
                value={formatEuroPerSqm(perSqm(effectiveInputs.targetPurchasePrice, property.surface))}
              />
              <MetricCard
                label="Coût de revient /m²"
                value={formatEuroPerSqm(perSqm(metrics.totalCost, property.surface))}
              />
              <MetricCard
                label="Loyer cible /m²"
                value={formatEuroPerSqm(perSqm(effectiveInputs.targetRent, property.surface), 1)}
              />
              <MetricCard
                label="Rentabilité brute"
                value={formatPercent(metrics.grossYield ? metrics.grossYield * 100 : null)}
                highlight
              />
              <MetricCard
                label="Rentabilité nette"
                value={formatPercent(metrics.netYield ? metrics.netYield * 100 : null)}
                highlight
              />
              <MetricCard label="Revenu net annuel" value={formatCurrency(metrics.annualNetIncome)} />
              <MetricCard
                label="Plus-value latente"
                value={formatCurrency(metrics.latentCapitalGain)}
              />
              <MetricCard
                label="Rendement global"
                value={formatPercent(
                  metrics.totalReturnRate ? metrics.totalReturnRate * 100 : null,
                )}
                hint="Revenu net + plus-value / coût"
              />
            </div>
          </section>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert>
              <AlertTitle>Enregistré</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pb-8">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Fermer
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Enregistrement…' : 'Enregistrer les hypothèses'}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        disabled={disabled}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-primary/30 bg-primary/5' : 'bg-muted/20'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
