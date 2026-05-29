'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, ShoppingCart } from 'lucide-react';
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
  type VisibilityState,
} from '@tanstack/react-table';
import type { PropertyTreeRow } from '@/lib/import/types';
import type { DashboardStats } from '@/lib/dashboard/queries';
import type { SimulationRecord } from '@/lib/simulations/types';
import type { ScenarioRecord } from '@/lib/basket/types';
import { flattenPropertyTree } from '@/lib/deliation/groups';
import { calculateProfitability } from '@/lib/calculations/rentability';
import { perSqm } from '@/lib/calculations/kpi';
import { useDeliation } from '@/lib/deliation/context';
import {
  formatCurrency,
  formatEuroPerSqm,
  formatNumber,
  formatPercent,
  formatSurface,
} from '@/lib/format';
import { writeBasketSelection } from '@/lib/basket/selection-storage';
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

type RowMetrics = {
  purchasePrice: number;
  targetRent: number;
  totalCost: number;
  grossYield: number | null;
  netYield: number | null;
  latentCapitalGain: number;
};

const COLUMN_LABELS: Record<string, string> = {
  nb_pieces: 'Pièces',
  building_name: 'Immeuble',
  floor: 'Étage',
  surface: 'Surface',
  status: 'Statut',
  linkBadge: 'Lien',
  tenant_label: 'Locataire',
  net_rent: 'Loyer HC',
  rent_per_sqm: 'Loyer/m²',
  rental_charges: 'Charges',
  deposit: 'DDG',
  lease_seniority_months: 'Ancienneté',
  target_price: 'Prix cible',
  price_per_sqm: 'Prix/m²',
  total_cost: 'Coût revient',
  gross_yield: 'Rent. brute',
  net_yield: 'Rent. nette',
  dpe_grade: 'DPE',
  address: 'Adresse',
};

// Colonnes masquées par défaut pour ne pas saturer l'écran (activables via « Colonnes »).
const DEFAULT_HIDDEN: VisibilityState = {
  rental_charges: false,
  deposit: false,
  lease_seniority_months: false,
  total_cost: false,
  address: false,
};

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
  const [typeFilter, setTypeFilter] = useState('all');
  const [dpeFilter, setDpeFilter] = useState('all');
  const [annexFilter, setAnnexFilter] = useState<'all' | 'with' | 'annex' | 'lot'>('all');
  const [expanded, setExpanded] = useState<ExpandedState>(true);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_HIDDEN);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyTreeRow | null>(null);

  function handleLoadScenario(propertyIds: string[]) {
    const selection = Object.fromEntries(propertyIds.map((id) => [id, true]));
    setRowSelection(selection);
  }

  const allRows = useMemo(() => flattenPropertyTree(rows), [rows]);

  // Métriques par lot (prix/m², loyer/m², rentabilités) — recalculées si la déliation change.
  const metricsById = useMemo(() => {
    const map = new Map<string, RowMetrics>();
    for (const row of allRows) {
      const inputs = getEffectiveCalculationInputs(row, simulationsByProperty[row.id]);
      const m = calculateProfitability(inputs);
      map.set(row.id, {
        purchasePrice: inputs.targetPurchasePrice,
        targetRent: inputs.targetRent,
        totalCost: m.totalCost,
        grossYield: m.grossYield,
        netYield: m.netYield,
        latentCapitalGain: m.latentCapitalGain,
      });
    }
    return map;
  }, [allRows, simulationsByProperty, getEffectiveCalculationInputs]);

  const buildings = useMemo(
    () =>
      [...new Set(rows.map((row) => row.building_name).filter(Boolean))].sort() as string[],
    [rows],
  );

  const types = useMemo(
    () =>
      [...new Set(allRows.map((row) => row.main_type).filter(Boolean))].sort() as string[],
    [allRows],
  );

  const dpeGrades = useMemo(
    () =>
      [...new Set(allRows.map((row) => row.dpe_grade).filter(Boolean))].sort() as string[],
    [allRows],
  );

  const filteredRows = useMemo(() => {
    function keep(row: PropertyTreeRow): boolean {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (buildingFilter !== 'all' && row.building_name !== buildingFilter) return false;
      if (typeFilter !== 'all' && row.main_type !== typeFilter) return false;
      if (dpeFilter !== 'all' && row.dpe_grade !== dpeFilter) return false;
      if (annexFilter === 'annex' && !row.is_annex) return false;
      if (annexFilter === 'lot' && row.is_annex) return false;
      if (annexFilter === 'with' && !(row.subRows && row.subRows.length > 0)) return false;
      return true;
    }

    // On préserve l'arborescence : un parent conservé garde ses annexes filtrées.
    function walk(list: PropertyTreeRow[]): PropertyTreeRow[] {
      const out: PropertyTreeRow[] = [];
      for (const row of list) {
        const subRows = row.subRows ? walk(row.subRows) : undefined;
        if (keep(row) || (subRows && subRows.length > 0)) {
          out.push({ ...row, subRows });
        }
      }
      return out;
    }

    return walk(rows);
  }, [rows, statusFilter, buildingFilter, typeFilter, dpeFilter, annexFilter]);

  const columns = useMemo<ColumnDef<PropertyTreeRow>[]>(
    () => [
      {
        id: 'select',
        enableHiding: false,
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
        enableHiding: false,
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
      { accessorKey: 'main_type', header: 'Type' },
      {
        accessorKey: 'nb_pieces',
        header: 'Pièces',
        cell: ({ row }) => (row.original.nb_pieces != null ? row.original.nb_pieces : '—'),
      },
      {
        accessorKey: 'building_name',
        header: 'Immeuble',
        cell: ({ row }) => row.original.building_name ?? '—',
      },
      {
        accessorKey: 'floor',
        header: 'Étage',
        cell: ({ row }) => row.original.floor ?? '—',
      },
      {
        accessorKey: 'surface',
        header: 'Surface',
        cell: ({ row }) => formatSurface(row.original.surface, 1),
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
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">Lié</span>
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
        id: 'rent_per_sqm',
        header: 'Loyer/m²',
        accessorFn: (row) => perSqm(row.net_rent, row.surface) ?? -1,
        cell: ({ row }) => formatEuroPerSqm(perSqm(row.original.net_rent, row.original.surface), 1),
      },
      {
        accessorKey: 'rental_charges',
        header: 'Charges',
        cell: ({ row }) => formatCurrency(row.original.rental_charges),
      },
      {
        accessorKey: 'deposit',
        header: 'DDG',
        cell: ({ row }) => formatCurrency(row.original.deposit),
      },
      {
        accessorKey: 'lease_seniority_months',
        header: 'Ancienneté',
        cell: ({ row }) =>
          row.original.lease_seniority_months != null
            ? `${formatNumber(row.original.lease_seniority_months)} mois`
            : '—',
      },
      {
        id: 'target_price',
        header: 'Prix cible',
        accessorFn: (row) => metricsById.get(row.id)?.purchasePrice ?? 0,
        cell: ({ row }) => {
          const price = metricsById.get(row.original.id)?.purchasePrice ?? 0;
          return price > 0 ? formatCurrency(price) : '—';
        },
      },
      {
        id: 'price_per_sqm',
        header: 'Prix/m²',
        accessorFn: (row) =>
          perSqm(metricsById.get(row.id)?.purchasePrice ?? 0, row.surface) ?? -1,
        cell: ({ row }) => {
          const price = metricsById.get(row.original.id)?.purchasePrice ?? 0;
          return price > 0 ? formatEuroPerSqm(perSqm(price, row.original.surface)) : '—';
        },
      },
      {
        id: 'total_cost',
        header: 'Coût revient',
        accessorFn: (row) => metricsById.get(row.id)?.totalCost ?? 0,
        cell: ({ row }) => {
          const cost = metricsById.get(row.original.id)?.totalCost ?? 0;
          return cost > 0 ? formatCurrency(cost) : '—';
        },
      },
      {
        id: 'gross_yield',
        header: 'Rent. brute',
        accessorFn: (row) => metricsById.get(row.id)?.grossYield ?? -1,
        cell: ({ row }) => {
          const value = metricsById.get(row.original.id)?.grossYield ?? null;
          return formatPercent(value != null ? value * 100 : null);
        },
      },
      {
        id: 'net_yield',
        header: 'Rent. nette',
        accessorFn: (row) => metricsById.get(row.id)?.netYield ?? -1,
        cell: ({ row }) => {
          const value = metricsById.get(row.original.id)?.netYield ?? null;
          return (
            <span className={value != null && value > 0 ? 'font-semibold text-emerald-700' : ''}>
              {formatPercent(value != null ? value * 100 : null)}
            </span>
          );
        },
      },
      {
        accessorKey: 'dpe_grade',
        header: 'DPE',
        cell: ({ row }) => row.original.dpe_grade ?? '—',
      },
      {
        accessorKey: 'address',
        header: 'Adresse',
        cell: ({ row }) => row.original.address ?? '—',
      },
    ],
    [metricsById, isDeliated],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    getRowId: (row) => row.id,
    state: { sorting, globalFilter, expanded, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    enableRowSelection: true,
    initialState: { pagination: { pageSize: 25 } },
  });

  const selectedProperties = useMemo(
    () => allRows.filter((row) => rowSelection[row.id]),
    [allRows, rowSelection],
  );

  // Synchronise la sélection avec le panier (page /dashboard/panier).
  useEffect(() => {
    writeBasketSelection(selectedProperties.map((row) => row.id));
  }, [selectedProperties]);

  const avgRentPerSqm = perSqm(stats.totalNetRent, stats.totalSurface);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Lots" value={String(stats.totalLots)} />
        <StatCard label="Surface totale" value={formatSurface(stats.totalSurface, 0)} />
        <StatCard label="Loyer HC total / mois" value={formatCurrency(stats.totalNetRent)} />
        <StatCard label="Loyer HC moyen /m²" value={formatEuroPerSqm(avgRentPerSqm, 1)} />
        <StatCard label="Taux de vacance" value={`${formatNumber(stats.vacancyRate, 1)} %`} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Portefeuille de lots</CardTitle>
              <CardDescription>
                Cliquez sur une ligne pour la fiche lot. Cochez des lots puis ouvrez le panier.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/panier">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Panier / Simulation
                </Link>
              </Button>
              <ExportLotsButton properties={allRows} label="Exporter tout" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Input
              placeholder="Rechercher…"
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
            />
            <FilterSelect value={statusFilter} onChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <option value="all">Tous statuts</option>
              <option value="Loué">Loué</option>
              <option value="Vacant">Vacant</option>
            </FilterSelect>
            <FilterSelect value={buildingFilter} onChange={setBuildingFilter}>
              <option value="all">Tous immeubles</option>
              {buildings.map((building) => (
                <option key={building} value={building}>
                  {building}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect value={typeFilter} onChange={setTypeFilter}>
              <option value="all">Tous types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect value={dpeFilter} onChange={setDpeFilter}>
              <option value="all">Tous DPE</option>
              {dpeGrades.map((grade) => (
                <option key={grade} value={grade}>
                  DPE {grade}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect value={annexFilter} onChange={(v) => setAnnexFilter(v as typeof annexFilter)}>
              <option value="all">Lots & annexes</option>
              <option value="lot">Lots principaux</option>
              <option value="annex">Annexes</option>
              <option value="with">Avec annexe(s)</option>
            </FilterSelect>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColumnsMenu((open) => !open)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Colonnes
              </Button>
              {showColumnsMenu && (
                <div className="absolute z-20 mt-2 w-56 rounded-md border bg-background p-2 shadow-lg">
                  <div className="grid gap-1">
                    {table
                      .getAllLeafColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => (
                        <label
                          key={column.id}
                          className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={column.getIsVisible()}
                            onChange={column.getToggleVisibilityHandler()}
                          />
                          {COLUMN_LABELS[column.id] ?? column.id}
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>
            <FilterSelect
              value={String(table.getState().pagination.pageSize)}
              onChange={(v) => table.setPageSize(Number(v))}
              className="w-44"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} lignes / page
                </option>
              ))}
            </FilterSelect>
          </div>

          {selectedProperties.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-primary/5 px-4 py-3 text-sm">
              <span>
                <strong>{selectedProperties.length}</strong> lot(s) coché(s) dans le panier.
              </span>
              <Button asChild size="sm">
                <Link href="/dashboard/panier">Ouvrir le panier détaillé →</Link>
              </Button>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: '↑', desc: '↓' }[header.column.getIsSorted() as string] ?? null}
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
                    <td
                      colSpan={table.getVisibleLeafColumns().length}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      Aucun lot ne correspond aux filtres.
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
                        <td key={cell.id} className="whitespace-nowrap px-3 py-2 align-top">
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
        simulation={selectedProperty ? simulationsByProperty[selectedProperty.id] : undefined}
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

function FilterSelect({
  value,
  onChange,
  children,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      className={`h-10 rounded-md border border-input bg-background px-3 text-sm ${className}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}
