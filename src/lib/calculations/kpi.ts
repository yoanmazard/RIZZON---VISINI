/**
 * Indicateurs au m² — le nerf de l'analyse immobilière.
 * Tous renvoient `null` quand la surface est absente ou nulle (ex. certaines annexes),
 * pour que l'affichage tombe sur « — » plutôt qu'un Infinity trompeur.
 */

export function perSqm(
  value: number | null | undefined,
  surface: number | null | undefined,
): number | null {
  if (value == null || surface == null) return null;
  const v = Number(value);
  const s = Number(surface);
  if (!Number.isFinite(v) || !Number.isFinite(s) || s <= 0) return null;
  return v / s;
}

/** Prix d'achat (ou coût de revient) au m². */
export function pricePerSqm(
  price: number | null | undefined,
  surface: number | null | undefined,
): number | null {
  return perSqm(price, surface);
}

/** Loyer mensuel hors charges au m². */
export function rentPerSqm(
  monthlyRent: number | null | undefined,
  surface: number | null | undefined,
): number | null {
  return perSqm(monthlyRent, surface);
}
