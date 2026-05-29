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
  building_code: ['code unique_1', 'code immeuble', 'code unique'],
  // Identifiant locataire (sert au pseudonyme partagé + au regroupement des lots liés).
  tenant_code: ['code unique'],
  main_type: ['type de lot', 'type lot', 'detail type', 'détail type'],
  nb_pieces: ['nb de pièces', 'nb pieces', 'nombre de pièces'],
  surface_habitable: ['surface habitable', 'surface'],
  surface_utile: ['surface utile'],
  building_name: ['immeuble', 'nom bâtiment', 'nom batiment', 'nom immeuble'],
  address: ['adresse du lot', 'adresse'],
  city: ['ville'],
  postal_code: ['code postal', 'cp'],
  floor: ['etage', 'étage'],
  door: ['porte'],
  usage: ['usage'],
  dpe_grade: ['dpe', 'classe dpe'],
  ges_grade: ['ges', 'classe ges'],
  dpe_kwh_ep: ['conso énergie primaire (kwhep)', 'conso energie primaire (kwhep)'],
  dpe_date: ['date dpe'],
  ges_co2_m2: ['émissions ges (co2/m2)', 'emissions ges (co2/m2)'],
  secondary_lot: ['n° lot secondaire', 'nº lot secondaire', 'no lot secondaire', 'lot secondaire'],
  designation: ['désignation', 'designation'],
  net_rent: ['loyer ht', 'loyer hors charges', 'loyer hc', 'loyer ht/hc', 'loyer ht / hc'],
  rent_ttc: ['loyer ttc'],
  annual_rent_ttc: ['loyer annuel ttc'],
  rent_ttc_per_sqm_hab: ['loyer ttc/m² hab.', 'loyer ttc/m2 hab.', 'loyer ttc/m² hab', 'loyer ttc/m2 hab'],
  charges_ht: ['provisions ht', 'charges ht'],
  charges_ttc: ['provisions ttc', 'charges ttc'],
  deposit: ['ddg', 'depot de garantie', 'dépôt de garantie'],
  notice_in_progress: ['préavis en cours', 'preavis en cours'],
  // Ancienneté = depuis la prise d'effet INITIALE du bail (pas la date de renouvellement).
  lease_start: [
    'date prise d\'effet initial',
    'date d\'entrée',
    'date d entree',
    'date début bail',
    'date debut bail',
    'date de debut de bail',
  ],
  lease_end: [
    'date de sortie',
    'date sortie',
    'fin de bail',
    'date de sortie contractuelle',
    'date fin',
  ],
  termination_date: ['date de résiliation'],
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

  // En-têtes (hors colonnes exclues) avec leur forme normalisée.
  const candidates = headers
    .filter((header) => !isExcludedColumn(header))
    .map((header) => ({ header, normalized: normalizeHeader(header) }));

  // Pour chaque champ, on prend le premier ALIAS (par ordre de préférence) qui matche.
  // Ainsi « code unique_1 » prime sur « code unique » selon l'ordre déclaré.
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeHeader(alias);
      const match = candidates.find((candidate) => candidate.normalized === normalizedAlias);
      if (match) {
        map.set(key, match.header);
        break;
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
