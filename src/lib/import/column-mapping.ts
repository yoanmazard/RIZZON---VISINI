const EXCLUDED_PATTERNS = [
  /^mail$/i,
  /^e[- ]?mail$/i,
  /^telephone$/i,
  /^tel$/i,
  /^date de naissance$/i,
  /^lieu de naissance$/i,
  /^profession$/i,
  /^sexe$/i,
  /^siret$/i,
  /^n[°o] caf$/i,
];

export const COLUMN_ALIASES = {
  ref_lot: ['n° lot', 'nº lot', 'no lot', 'num lot', 'ref lot'],
  building_code: ['code unique_1', 'code immeuble'],
  main_type: ['type de lot', 'type lot', 'detail type', 'détail type'],
  nb_pieces: ['nb de pièces', 'nb pieces', 'nombre de pièces'],
  surface_habitable: ['surface habitable', 'surface'],
  surface_utile: ['surface utile'],
  building_name: ['immeuble', 'nom bâtiment', 'nom batiment', 'nom immeuble'],
  address: ['adresse du lot', 'adresse'],
  city: ['ville'],
  floor: ['etage', 'étage'],
  dpe_grade: ['dpe', 'classe dpe'],
  secondary_lot: ['n° lot secondaire', 'nº lot secondaire', 'no lot secondaire', 'lot secondaire'],
  designation: ['désignation', 'designation'],
  net_rent: ['loyer ht', 'loyer hors charges', 'loyer hc'],
  rent_ttc: ['loyer ttc'],
  charges_ht: ['provisions ht', 'charges ht'],
  charges_ttc: ['provisions ttc', 'charges ttc'],
  deposit: ['ddg', 'depot de garantie', 'dépôt de garantie'],
  notice_in_progress: ['préavis en cours', 'preavis en cours'],
  lease_start: [
    'date d\'entrée',
    'date d entree',
    'date début bail',
    'date debut bail',
    'date de debut de bail',
  ],
  lease_end: ['date de sortie', 'date sortie', 'fin de bail'],
  tenant_status: ['statut locataire', 'statut'],
  tenant_raw: ['locataire', 'nom locataire'],
} as const;

export const RETAINED_COLUMN_KEYS = new Set(Object.keys(COLUMN_ALIASES));

export function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isExcludedColumn(header: string) {
  const normalized = normalizeHeader(header);
  return EXCLUDED_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function buildHeaderMap(headers: string[]) {
  const map = new Map<string, string>();

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    if (isExcludedColumn(header)) continue;

    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some((alias) => normalized === normalizeHeader(alias))) {
        if (!map.has(key)) {
          map.set(key, header);
        }
      }
    }
  }

  return map;
}

export function getCell(row: Record<string, string>, headerMap: Map<string, string>, key: string) {
  const header = headerMap.get(key);
  if (!header) return '';
  return (row[header] ?? '').trim();
}

export function listExcludedColumns(headers: string[]) {
  return headers.filter((header) => isExcludedColumn(header));
}
