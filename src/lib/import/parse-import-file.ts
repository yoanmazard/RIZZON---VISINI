'use client';

import { parseCsvRows } from '@/lib/import/parse-csv';
import { parseXlsxRows } from '@/lib/import/parse-xlsx';
import { transformCsvRows } from '@/lib/import/transform-rows';
import type { ImportParseResult } from '@/lib/import/types';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'] as const;

export const IMPORT_SOURCE_HINT =
  'Etat locatif.xlsx et Etat locatif2.xlsx (exports gestion locative) ou CSV UTF-8.';

function getExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  const match = ACCEPTED_EXTENSIONS.find((extension) => lower.endsWith(extension));
  return match ?? null;
}

async function parseRawRows(file: File): Promise<Record<string, string>[]> {
  const extension = getExtension(file.name);

  if (!extension) {
    throw new Error(`Format non supporté : ${file.name}`);
  }

  if (extension === '.csv') {
    return parseCsvRows(file);
  }

  return parseXlsxRows(file);
}

export async function parseImportFiles(files: File[]): Promise<ImportParseResult> {
  if (files.length === 0) {
    throw new Error('Sélectionnez au moins un fichier.');
  }

  const rawRows: Record<string, string>[] = [];

  for (const file of files) {
    const rows = await parseRawRows(file);
    rawRows.push(...rows);
  }

  return transformCsvRows(rawRows);
}
