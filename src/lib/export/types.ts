export type ExportRow = {
  ref_lot: string;
  type_lot: string;
  immeuble: string;
  adresse: string;
  surface_m2: number | null;
  statut: string;
  locataire: string;
  loyer_hc_actuel: number;
  loyer_hc_cible: number;
  loyer_m2: number | null;
  prix_achat_cible: number;
  prix_m2: number | null;
  cout_revient: number;
  cout_m2: number | null;
  rentabilite_brute_pct: number | null;
  rentabilite_nette_pct: number | null;
  plus_value_nette: number;
  dpe: string;
  lien: string;
};

export type ExportMeta = {
  fileName: string;
  scenarioName: string | null;
  rowCount: number;
  exportedAt: string;
  mode: string | null;
};

export type DownloadHistoryRecord = {
  id: string;
  exported_at: string;
  file_name: string;
  scenario_name: string | null;
  row_count: number;
};
