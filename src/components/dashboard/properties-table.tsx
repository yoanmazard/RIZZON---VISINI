'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import type { PropertyTreeRow } from '@/lib/import/types';
import type { DashboardStats } from '@/lib/dashboard/queries';
import type { SimulationRecord } from '@/lib/simulations/types';
import type { ScenarioRecord } from '@/lib/basket/types';
import { flattenPropertyTree } from '@/lib/deliation/groups';
import { calculateProfitability } from '@/lib/calculations/rentability';
import { useDeliation } from '@/lib/deliation/context';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import { PropertySheet } from '@/components/dashboard/property-sheet';
import { AcquisitionBasketBanner } from '@/components/dashboard/acquisition-basket-banner';
import { ExportLotsButton } from '@/components/dashboard/export-lots-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type PropertiesTableProps = {
  rows: PropertyTreeRow[];
  stats: DashboardStats;
  simulationsByProperty: Record<string, SimulationRecord>;
  scenarios: ScenarioRecord[];
  onSimulationSaved?: () => void;
};

function getEstimatedNetYield(
  property: PropertyTreeRow,
  simulation: SimulationRecord | undefined,
  getEffectiveCalculationInputs: ReturnType<typeof useDeliation>['getEffectiveCalculationInputs'],
) {
  const inputs = getEffectiveCalculationInputs(property, simulation);
  if (!inputs.targetPurchasePrice && !inputs.targetRent) return null;
  return calculateProfitability(inputs).netYield;
}

export function PropertiesTable({
  rows,
  stats,
  simulationsByProperty,
  scenarios,
  onSimulationSaved,
}: PropertiesTableProps) {
  const { isDeliated, getEffectiveCalculationInputs } = useDeliation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Loué' | 'Vacant'>('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [expanded, setExpanded] = useState<ExpandedState>(true);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedProperty, setSelectedProperty] = useState<PropertyTreeRow | null>(null);

  function handleLoadScenario(propertyIds: string[]) {
    const selection = Object.fromEntries(propertyIds.map((id) => [id, true]));
    setRowSelection(selection);
  }

  const buildings = useMemo(
    () =>
      [...new Set(rows.map((row) => row.building_name).filter(Boolean))].sort() as string[],
    [rows],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (buildingFilter !== 'all' && row.building_name !== buildingFilter) return false;
      return true;
    });
  }, [rows, statusFilter, buildingFilter]);

  const columns = useMemo<ColumnDef<PropertyTreeRow>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Tout sélectionner"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onClick={(event) => event.stopPropagation()}
            onChange={row.getToggleSelectedHandler()}
            aria-label={`Sélectionner ${row.original.ref_lot}`}
          />
        ),
      },
      {
        accessorKey: 'ref_lot',
        header: 'Lot',
        cell: ({ row }) => (
          <div style={{ paddingLeft: `${row.depth * 1.25}rem` }} className="flex items-center gap-2">
            {row.getCanExpand() ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  row.toggleExpanded();
                }}
                className="text-xs text-muted-foreground"
              >
                {row.getIsExpanded() ? '▾' : '▸'}
              </button>
            ) : (
              <span className="inline-block w-3" />
            )}
            <span className="font-medium">{row.original.ref_lot}</span>
          </div>
        ),
      },
      {
        accessorKey: 'main_type',
        header: 'Type',
      },
      {
        accessorKey: 'building_name',
        header: 'Immeuble',
        cell: ({ row }) => row.original.building_name ?? '—',
      },
      {
        accessorKey: 'surface',
        header: 'Surface',
        cell: ({ row }) => `${formatNumber(row.original.surface, 1)} m²`,
      },
      {
        accessorKey: 'status',
        header: 'Statut',
        cell: ({ row }) => (
          <span
            className={
              row.original.status === 'Vacant'
                ? 'rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800'
                : 'rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800'
            }
          >
            {row.original.status}
          </span>
        ),
      },
      {
        id: 'linkBadge',
        header: 'Lien',
        cell: ({ row }) => {
          if (isDeliated(row.original.id)) {
            return (
              <span className="rounded-full bg-violet-100 px-2 py-1 text-xs text-violet-800">
                Délié
              </span>
            );
          }

          if (row.original.depth > 0) {
            return (
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                Lié
              </span>
            );
          }

          if (row.original.is_annex) {
            return (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                Indépendant
              </span>
            );
          }

          return row.original.subRows?.length ? (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
              {row.original.subRows.length} annexe(s)
            </span>
          ) : (
            '—'
          );
        },
      },
      {
        accessorKey: 'tenant_label',
        header: 'Locataire',
        cell: ({ row }) => row.original.tenant_label ?? '—',
      },
      {
        accessorKey: 'net_rent',
        header: 'Loyer HC',
        cell: ({ row }) => formatCurrency(row.original.net_rent),
      },
      {
        id: 'net_yield',
        header: 'Rent. nette',
        cell: ({ row }) => {
          const yieldValue = getEstimatedNetYield(
            row.original,
            simulationsByProperty[row.original.id],
            getEffectiveCalculationInputs,
          );
          return formatPercent(yieldValue ? yieldValue * 100 : null);
        },
      },
      {
        accessorKey: 'dpe_grade',
        header: 'DPE',
        cell: ({ row }) => row.original.dpe_grade ?? '—',
      },
    ],
    [simulationsByProperty, isDeliated, getEffectiveCalculationInputs],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      globalFilter,
      expanded,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    enableRowSelection: true,
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  const allRows = useMemo(() => flattenPropertyTree(rows), [rows]);

  const selectedProperties = useMemo(
    () => allRows.filter((row) => rowSelection[row.id]),
    [allRows, rowSelection],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Lots" value={String(stats.totalLots)} />
        <StatCard label="Surface totale" value={`${formatNumber(stats.totalSurface, 0)} m²`} />
        <StatCard label="Loyer HC total" value={formatCurrency(stats.totalNetRent)} />
        <StatCard label="Taux de vacance" value={`${formatNumber(stats.vacancyRate, 1)} %`} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Portefeuille de lots</CardTitle>
              <CardDescription>
                Cliquez sur une ligne pour ouvrir la fiche lot et simuler la rentabilité.
              </CardDescription>
            </div>
            <ExportLotsButton
              properties={allRows}
              label="Exporter tout le portefeuille"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Rechercher un lot, une adresse…"
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="all">Tous statuts</option>
              <option value="Loué">Loué</option>
              <option value="Vacant">Vacant</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={buildingFilter}
              onChange={(event) => setBuildingFilter(event.target.value)}
            >
              <option value="all">Tous immeubles</option>
              {buildings.map((building) => (
                <option key={building} value={building}>
                  {building}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size} lignes / page
                </option>
              ))}
            </select>
          </div>

          {selectedProperties.length > 0 && (
            <div className="rounded-lg border bg-primary/5 px-4 py-3 text-sm">
              <strong>{selectedProperties.length}</strong> lot(s) coché(s) dans le panier
              d&apos;acquisition. Le bandeau récapitulatif apparaît en bas de l&apos;écran.
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-3 py-2 text-left font-medium">
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: '↑',
                              desc: '↓',
                            }[header.column.getIsSorted() as string] ?? null}
                          </button>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                      Aucun lot importé pour le moment.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-t hover:bg-muted/20"
                      onClick={() => setSelectedProperty(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2 align-top">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount() || 1}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PropertySheet
        property={selectedProperty}
        simulation={
          selectedProperty ? simulationsByProperty[selectedProperty.id] : undefined
        }
        onClose={() => setSelectedProperty(null)}
        onSaved={onSimulationSaved}
      />

      <AcquisitionBasketBanner
        selectedProperties={selectedProperties}
        scenarios={scenarios}
        onLoadScenario={handleLoadScenario}
        onScenarioSaved={onSimulationSaved}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
