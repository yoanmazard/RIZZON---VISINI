'use client';

function normalizeImportRow(row: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.replace(/^\uFEFF/, '').trim(), String(value ?? '').trim()]),
  );
}

export async function parseXlsxRows(file: File): Promise<Record<string, string>[]> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('Fichier Excel vide.');
  }

  const sheet = workbook.Sheets[sheetName];
  // raw:false → valeurs formatées comme affichées (dates « jj/mm/aaaa », montants lisibles)
  // plutôt que des numéros de série Excel, pour fiabiliser dates et montants.
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  if (rows.length === 0) {
    throw new Error('Aucune ligne trouvée dans le fichier Excel.');
  }

  return rows.map(normalizeImportRow);
}
