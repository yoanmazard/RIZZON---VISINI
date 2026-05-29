export type LotStatus = 'Loué' | 'Vacant';

export type CleanLotImportRow = {
  ref_lot: string;
  main_type: string;
  nb_pieces: number | null;
  surface: number | null;
  building_name: string | null;
  address: string | null;
  floor: string | null;
  dpe_grade: string | null;
  status: LotStatus;
  is_annex: boolean;
  tenant_label: string;
  net_rent: number;
  rental_charges: number;
  deposit: number;
  lease_seniority_months: number | null;
  notice_in_progress: boolean;
  linked_annex_refs: string[];
  designation: string | null;
  // Identifiant locataire (transitoire : regroupement des lots liés, non stocké en base)
  tenant_group: string | null;
  // Champs additionnels de l'état locatif (stockés sur properties / financials)
  postal_code: string | null;
  city: string | null;
  door: string | null;
  usage_type: string | null;
  dpe_kwh_ep: number | null;
  ges_grade: string | null;
  dpe_date: string | null;
  ges_co2_m2: number | null;
  annual_rent_ttc: number | null;
  rent_ttc_per_sqm_hab: number | null;
};

export type ImportPreviewRow = CleanLotImportRow & {
  source_ref: string;
};

export type ImportParseResult = {
  rows: CleanLotImportRow[];
  preview: ImportPreviewRow[];
  warnings: string[];
  stats: {
    total: number;
    rented: number;
    vacant: number;
    annexes: number;
    excludedColumns: string[];
  };
};

export type PropertyOverview = {
  id: string;
  ref_lot: string;
  main_type: string;
  nb_pieces: number | null;
  surface: number | null;
  building_name: string | null;
  address: string | null;
  floor: string | null;
  dpe_grade: string | null;
  status: LotStatus;
  is_annex: boolean;
  tenant_label: string | null;
  net_rent: number | null;
  rental_charges: number | null;
  deposit: number | null;
  lease_seniority_months: number | null;
  notice_in_progress: boolean | null;
  postal_code: string | null;
  city: string | null;
  door: string | null;
  usage_type: string | null;
  dpe_kwh_ep: number | null;
  ges_grade: string | null;
  dpe_date: string | null;
  ges_co2_m2: number | null;
  annual_rent_ttc: number | null;
  rent_ttc_per_sqm_hab: number | null;
  created_at: string;
  updated_at: string;
};

export type LotLink = {
  id: string;
  primary_id: string;
  annex_id: string;
  link_source: 'auto' | 'manuel';
};

export type PropertyTreeRow = PropertyOverview & {
  depth: number;
  link_source: 'auto' | 'manuel' | null;
  parent_ref_lot: string | null;
  subRows?: PropertyTreeRow[];
};

export type ImportActionResult = {
  ok: boolean;
  message: string;
  imported?: number;
  linksCreated?: number;
};
