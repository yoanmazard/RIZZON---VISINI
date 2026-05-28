import type { PropertyOverview, PropertyTreeRow } from '@/lib/import/types';

export type LotLinkInsert = {
  primary_ref: string;
  annex_ref: string;
  link_source: 'auto';
};

export function buildAutoLotLinks(rows: Array<{ ref_lot: string; is_annex: boolean; linked_annex_refs: string[] }>): LotLinkInsert[] {
  const refs = new Set(rows.map((row) => row.ref_lot));
  const links = new Map<string, LotLinkInsert>();

  for (const row of rows) {
    if (row.is_annex) continue;

    for (const annexRef of row.linked_annex_refs) {
      if (!refs.has(annexRef)) continue;

      const key = `${row.ref_lot}::${annexRef}`;
      links.set(key, {
        primary_ref: row.ref_lot,
        annex_ref: annexRef,
        link_source: 'auto',
      });
    }
  }

  for (const row of rows) {
    if (!row.is_annex) continue;

    const parents = rows.filter(
      (candidate) =>
        !candidate.is_annex && candidate.linked_annex_refs.includes(row.ref_lot),
    );

    for (const parent of parents) {
      const key = `${parent.ref_lot}::${row.ref_lot}`;
      links.set(key, {
        primary_ref: parent.ref_lot,
        annex_ref: row.ref_lot,
        link_source: 'auto',
      });
    }
  }

  return [...links.values()];
}

export function buildPropertyTree(
  rows: PropertyOverview[],
  links: Array<{ primary_id: string; annex_id: string; link_source: 'auto' | 'manuel' }>,
): PropertyTreeRow[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const childrenByPrimary = new Map<string, string[]>();

  for (const link of links) {
    const current = childrenByPrimary.get(link.primary_id) ?? [];
    current.push(link.annex_id);
    childrenByPrimary.set(link.primary_id, current);
  }

  const linkedAnnexIds = new Set(links.map((link) => link.annex_id));
  const roots = rows.filter((row) => !linkedAnnexIds.has(row.id));

  function toTreeRow(
    row: PropertyOverview,
    depth: number,
    parentRef: string | null,
    linkSource: 'auto' | 'manuel' | null,
  ): PropertyTreeRow {
    const childIds = childrenByPrimary.get(row.id) ?? [];
    const subRows = childIds
      .map((childId) => byId.get(childId))
      .filter((child): child is PropertyOverview => Boolean(child))
      .map((child) => {
        const link = links.find(
          (item) => item.primary_id === row.id && item.annex_id === child.id,
        );
        return toTreeRow(child, depth + 1, row.ref_lot, link?.link_source ?? 'auto');
      });

    return {
      ...row,
      tenant_label: row.tenant_label ?? null,
      net_rent: row.net_rent ?? null,
      rental_charges: row.rental_charges ?? null,
      deposit: row.deposit ?? null,
      lease_seniority_months: row.lease_seniority_months ?? null,
      notice_in_progress: row.notice_in_progress ?? null,
      created_at: row.created_at ?? new Date().toISOString(),
      updated_at: row.updated_at ?? new Date().toISOString(),
      depth,
      link_source: linkSource,
      parent_ref_lot: parentRef,
      subRows: subRows.length > 0 ? subRows : undefined,
    };
  }

  return roots.map((row) => toTreeRow(row, 0, null, null));
}
