import { createHash } from 'node:crypto';
import { ETAT_LOCATIF_COL } from '@/lib/import/etat-locatif-columns';
import { buildRefLot, isAnnexLot, isVacantTenant } from '@/lib/import/parse-utils';
import type { LotStatus } from '@/lib/import/types';

export type RawMatrixRow = Array<unknown>;

function colIdx(letters: string) {
  let index = 0;
  for (const char of letters) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index - 1;
}

export function getCell<T = unknown>(row: RawMatrixRow, letter: string): T | null {
  const value = row[colIdx(letter)];
  if (value === undefined || value === null || value === '') return null;
  return value as T;
}

export function getCol(row: RawMatrixRow, key: keyof typeof ETAT_LOCATIF_COL) {
  return getCell(row, ETAT_LOCATIF_COL[key]);
}

export function asText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

export function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number.parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function asBoolean(value: unknown): boolean | null {
  const text = asText(value);
  if (!text) return null;
  const lower = text.toLowerCase();
  if (['oui', 'yes', 'true', '1'].includes(lower)) return true;
  if (['non', 'no', 'false', '0'].includes(lower)) return false;
  return null;
}

export function asDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  const french = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (french) {
    const [, day, month, year] = french;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export function hashTenant(code: string, salt: string) {
  return createHash('sha256').update(`${salt}|${code}`).digest('hex');
}

export function ageFromBirthdate(value: unknown): number | null {
  const iso = asDate(value);
  if (!iso) return null;
  const birth = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function computeSeniorityMonths(entryDate: string | null) {
  if (!entryDate) return null;
  const start = new Date(entryDate);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.max(0, months);
}

export function determineEtatLocatifStatus(row: RawMatrixRow): LotStatus {
  const tenantCode = asText(getCol(row, 'tenantCode'));
  const tenantName = asText(getCol(row, 'tenantName'));
  const endDate = asDate(getCol(row, 'endDate'));

  if ((tenantCode && isVacantTenant(tenantCode)) || (tenantName && isVacantTenant(tenantName))) {
    return 'Vacant';
  }

  if (endDate) {
    const end = new Date(endDate);
    if (end < new Date()) return 'Vacant';
  }

  return tenantCode || tenantName ? 'Loué' : 'Vacant';
}

export function resolveRefLot(row: RawMatrixRow, lotNumber: string) {
  const buildingCode = asText(getCol(row, 'buildingCode')) ?? '';
  return buildRefLot(buildingCode, lotNumber);
}

export function resolveMainType(row: RawMatrixRow) {
  return asText(getCol(row, 'mainType')) ?? 'Lot';
}

export function resolveIsAnnex(row: RawMatrixRow) {
  const mainType = resolveMainType(row);
  const designation = asText(getCol(row, 'designation')) ?? '';
  return isAnnexLot(mainType, designation);
}

export function resolveSurface(row: RawMatrixRow) {
  return (
    asNumber(getCol(row, 'surface')) ??
    asNumber(getCol(row, 'surfaceUtile')) ??
    asNumber(getCol(row, 'surfaceCarrez'))
  );
}

export function resolveRentalCharges(row: RawMatrixRow) {
  const provisionsHt = asNumber(getCol(row, 'provisionsHt'));
  const provisionsTtc = asNumber(getCol(row, 'provisionsTtc'));
  if (provisionsHt && provisionsHt > 0) return provisionsHt;
  if (provisionsTtc && provisionsTtc > 0) return provisionsTtc;
  return 0;
}

export function rowHasMainLot(row: RawMatrixRow) {
  return Boolean(asText(getCol(row, 'refLot')) && asText(getCol(row, 'buildingName')));
}
