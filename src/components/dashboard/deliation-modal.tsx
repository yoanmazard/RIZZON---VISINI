'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDeliation } from '@/lib/deliation/context';
import {
  buildVentilationPreview,
  computeDeliatedGroupAggregate,
  computeLinkedGroupMetrics,
  createDeliationGroupState,
  sharesAreValid,
} from '@/lib/deliation/ventilation';
import type { DeliationGroupState } from '@/lib/deliation/types';
import { formatCurrency, formatPercent } from '@/lib/format';
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

export function DeliationModal() {
  const {
    modalGroup,
    closeDeliationModal,
    confirmDeliation,
    deliationGroups,
    simulationsByProperty,
  } = useDeliation();

  const [draft, setDraft] = useState<DeliationGroupState | null>(null);

  useEffect(() => {
    if (!modalGroup) {
      setDraft(null);
      return;
    }

    const existing = deliationGroups[modalGroup.primary.id];
    setDraft(existing ?? createDeliationGroupState(modalGroup));
  }, [modalGroup, deliationGroups]);

  const previews = useMemo(() => {
    if (!modalGroup || !draft) return [];
    return buildVentilationPreview(modalGroup, draft, simulationsByProperty);
  }, [modalGroup, draft, simulationsByProperty]);

  const linkedMetrics = useMemo(() => {
    if (!modalGroup) return null;
    return computeLinkedGroupMetrics(modalGroup, simulationsByProperty);
  }, [modalGroup, simulationsByProperty]);

  const deliatedMetrics = useMemo(() => {
    if (!modalGroup || !draft) return null;
    return computeDeliatedGroupAggregate(modalGroup, draft, simulationsByProperty);
  }, [modalGroup, draft, simulationsByProperty]);

  if (!modalGroup || !draft) return null;

  const rentValid = sharesAreValid(draft.rentShares, draft.memberIds);
  const priceValid = sharesAreValid(draft.priceShares, draft.memberIds);

  function updateShare(
    propertyId: string,
    field: 'rentShares' | 'priceShares',
    value: string,
  ) {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    setDraft((current) =>
      current
        ? {
            ...current,
            [field]: {
              ...current[field],
              [propertyId]: Number.isFinite(parsed) ? parsed : 0,
            },
          }
        : current,
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Fermer la modale de déliation"
        onClick={closeDeliationModal}
      />
      <Card className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <CardHeader>
          <CardTitle>Déliation appartement / annexes</CardTitle>
          <CardDescription>
            Ventilation du loyer et du prix d&apos;achat entre{' '}
            <strong>{modalGroup.primary.ref_lot}</strong> et ses annexes. La donnée source
            n&apos;est pas modifiée — il s&apos;agit d&apos;un scénario d&apos;arbitrage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTitle>Locataire unique</AlertTitle>
            <AlertDescription>
              Le locataire{' '}
              <strong>{modalGroup.primary.tenant_label ?? '—'}</strong> paie aujourd&apos;hui
              l&apos;ensemble ({formatCurrency(modalGroup.members.reduce((sum, member) => sum + Number(member.net_rent ?? 0), 0))}{' '}
              HC / mois). La ventilation simule une location séparée.
            </AlertDescription>
          </Alert>

          <div className="grid gap-3 md:grid-cols-2">
            <ComparisonCard
              title="Mode lié (global)"
              grossYield={linkedMetrics?.grossYield ?? null}
              netYield={linkedMetrics?.netYield ?? null}
              totalCost={linkedMetrics?.totalCost ?? null}
            />
            <ComparisonCard
              title="Mode délié (somme ventilée)"
              grossYield={deliatedMetrics?.grossYield ?? null}
              netYield={deliatedMetrics?.netYield ?? null}
              totalCost={deliatedMetrics?.totalCost ?? null}
              highlight
            />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">Lot</th>
                  <th className="px-3 py-2 text-left">Loyer %</th>
                  <th className="px-3 py-2 text-left">Prix %</th>
                  <th className="px-3 py-2 text-left">Loyer ventilé</th>
                  <th className="px-3 py-2 text-left">Prix ventilé</th>
                  <th className="px-3 py-2 text-left">Rent. nette</th>
                </tr>
              </thead>
              <tbody>
                {previews.map((preview) => (
                  <tr key={preview.property.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{preview.property.ref_lot}</div>
                      <div className="text-xs text-muted-foreground">{preview.property.main_type}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={String(preview.rentShare)}
                        onChange={(event) =>
                          updateShare(preview.property.id, 'rentShares', event.target.value)
                        }
                        className="h-8 w-20"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={String(preview.priceShare)}
                        onChange={(event) =>
                          updateShare(preview.property.id, 'priceShares', event.target.value)
                        }
                        className="h-8 w-20"
                      />
                    </td>
                    <td className="px-3 py-2">{formatCurrency(preview.ventilatedRent)}</td>
                    <td className="px-3 py-2">{formatCurrency(preview.ventilatedPurchasePrice)}</td>
                    <td className="px-3 py-2 font-medium">
                      {formatPercent(preview.netYield ? preview.netYield * 100 : null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!rentValid || !priceValid) && (
            <Alert variant="destructive">
              <AlertTitle>Ventilation invalide</AlertTitle>
              <AlertDescription>
                Les parts de loyer et de prix doivent totaliser 100 % chacune.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeDeliationModal}>
              Annuler
            </Button>
            <Button
              onClick={() => confirmDeliation(draft)}
              disabled={!rentValid || !priceValid}
            >
              Appliquer la déliation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComparisonCard({
  title,
  grossYield,
  netYield,
  totalCost,
  highlight = false,
}: {
  title: string;
  grossYield: number | null;
  netYield: number | null;
  totalCost: number | null;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-primary/30 bg-primary/5' : 'bg-muted/20'}`}>
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Coût</p>
          <p className="font-semibold">{formatCurrency(totalCost)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Brute</p>
          <p className="font-semibold">{formatPercent(grossYield ? grossYield * 100 : null)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Nette</p>
          <p className="font-semibold">{formatPercent(netYield ? netYield * 100 : null)}</p>
        </div>
      </div>
    </div>
  );
}
