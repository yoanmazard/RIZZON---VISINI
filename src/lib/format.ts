export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: digits,
  }).format(value ?? 0);
}

export function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${formatNumber(value, digits)} %`;
}

/** Prix au m² : « 3 000 €/m² ». */
export function formatEuroPerSqm(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${formatNumber(value, digits)} €/m²`;
}

/** Surface : « 54 m² ». */
export function formatSurface(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value) || Number(value) <= 0) return '—';
  return `${formatNumber(value, digits)} m²`;
}
