import type { LotStatus } from '@/lib/import/types';
import { getCell } from '@/lib/import/column-mapping';

const VACANT_PATTERN = /^vacant\d*$/i;

export function isVacantTenant(value: string) {
  return !value || VACANT_PATTERN.test(value.trim());
}

export function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return ['oui', 'yes', 'true', '1', 'vrai'].includes(normalized);
}

export function parseNumber(value: string) {
  if (!value) return 0;
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/,/g, '.');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseOptionalInt(value: string) {
  if (!value) return null;
  const parsed = Number.parseInt(value.replace(/\s/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseOptionalNumber(value: string) {
  if (!value) return null;
  const parsed = parseNumber(value);
  return parsed === 0 && !value.trim() ? null : parsed;
}

export function parseDate(value: string) {
  if (!value) return null;
  const french = value.match(/^(\d{2})[/.-](\d{2})[/.-](\d{4})$/);
  if (french) {
    const [, day, month, year] = french;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const iso = Date.parse(value);
  if (Number.isNaN(iso)) return null;
  return new Date(iso);
}

/** Convertit une date « jj/mm/aaaa » (ou ISO) en « aaaa-mm-jj » pour Postgres, sinon null. */
export function toIsoDate(value: string): string | null {
  const date = parseDate(value);
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeLeaseSeniorityMonths(startValue: string) {
  const startDate = parseDate(startValue);
  if (!startDate) return null;

  const now = new Date();
  const months =
    (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());

  return Math.max(0, months);
}

export function determineStatus(
  row: Record<string, string>,
  headerMap: Map<string, string>,
): LotStatus {
  const hasTenantColumn = headerMap.has('tenant_raw');
  const tenantRaw = getCell(row, headerMap, 'tenant_raw');
  const tenantStatus = getCell(row, headerMap, 'tenant_status');

  // 1. Signal explicite « VACANT » (uniquement si une colonne locataire/statut existe).
  if (hasTenantColumn && isVacantTenant(tenantRaw)) {
    return 'Vacant';
  }
  if (tenantStatus && isVacantTenant(tenantStatus)) {
    return 'Vacant';
  }

  // 2. Un loyer encaissé = lot occupé (cas des exports sans colonne locataire).
  const rent = parseNumber(getCell(row, headerMap, 'net_rent'));
  if (rent > 0) {
    return 'Loué';
  }

  // 3. Date de sortie/fin de bail passée sans loyer → vacant.
  const endDate = parseDate(getCell(row, headerMap, 'lease_end'));
  if (endDate && endDate < new Date()) {
    return 'Vacant';
  }

  // 4. Un bail en cours (date de prise d'effet) implique un lot loué.
  const startDate = parseDate(getCell(row, headerMap, 'lease_start'));
  if (startDate) {
    return 'Loué';
  }

  return 'Vacant';
}

/** Déduit le nombre de pièces depuis le type de lot (« Appartement T4 » → 4, studio → 1). */
export function inferPiecesFromType(mainType: string): number | null {
  if (!mainType) return null;
  const match = mainType.match(/\bT\s?(\d+)\b/i);
  if (match) return Number(match[1]);
  if (/studio/i.test(mainType)) return 1;
  return null;
}

export function isAnnexLot(mainType: string, designation: string) {
  const haystack = `${mainType} ${designation}`.toLowerCase();
  return /garage|cave|parking|box|annexe|cellier|local/.test(haystack);
}

export function buildRefLot(buildingCode: string, lotNumber: string) {
  const lot = lotNumber.trim();
  if (!lot) return '';

  const building = buildingCode.trim();
  if (!building) return lot;

  if (lot.includes('-') && lot.startsWith(`${building}-`)) {
    return lot;
  }

  return `${building}-${lot}`;
}

export function parseSecondaryLotRefs(value: string, buildingCode = '') {
  if (!value) return [];

  return value
    .split(/[;/,|]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => buildRefLot(buildingCode, part));
}

export function buildAddress(address: string, city: string) {
  const parts = [address, city].map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}
