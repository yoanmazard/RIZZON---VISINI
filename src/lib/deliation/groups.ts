import type { PropertyTreeRow } from '@/lib/import/types';
import type { LinkGroup } from '@/lib/deliation/types';

export function flattenPropertyTree(rows: PropertyTreeRow[]): PropertyTreeRow[] {
  const flat: PropertyTreeRow[] = [];

  function walk(row: PropertyTreeRow) {
    flat.push(row);
    row.subRows?.forEach(walk);
  }

  rows.forEach(walk);
  return flat;
}

export function findLinkGroup(
  property: PropertyTreeRow,
  treeRows: PropertyTreeRow[],
): LinkGroup | null {
  if (property.subRows && property.subRows.length > 0 && !property.is_annex) {
    return {
      primary: property,
      annexes: property.subRows,
      members: [property, ...property.subRows],
    };
  }

  for (const root of treeRows) {
    if (root.subRows?.some((annex) => annex.id === property.id)) {
      return {
        primary: root,
        annexes: root.subRows,
        members: [root, ...root.subRows],
      };
    }
  }

  return null;
}

export function getPrimaryIdForPropertyId(
  propertyId: string,
  treeRows: PropertyTreeRow[],
): string | null {
  const property = flattenPropertyTree(treeRows).find((row) => row.id === propertyId);
  if (!property) return null;
  return findLinkGroup(property, treeRows)?.primary.id ?? null;
}
