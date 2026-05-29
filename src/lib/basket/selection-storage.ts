'use client';

/**
 * Petite passerelle pour partager la sélection « panier » entre le tableau de bord
 * et la page /dashboard/panier (sans backend : la sélection est un brouillon local).
 */
const KEY = 'rizzon.basket.selection';

export function writeBasketSelection(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // localStorage indisponible (mode privé strict) — on ignore silencieusement.
  }
}

export function readBasketSelection(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}
