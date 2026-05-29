'use client';

import Papa from 'papaparse';
import { transformCsvRows } from '@/lib/import/transform-rows';
import type { ImportParseResult } from '@/lib/import/types';

export function parseCsvRows(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader(header) {
        return header.replace(/^\uFEFF/, '').trim();
      },
      complete(results) {
        if (results.errors.length > 0) {
          reject(new Error(results.errors[0]?.message ?? 'Erreur de parsing CSV'));
          return;
        }

        resolve(results.data);
      },
      error(error) {
        reject(error);
      },
    });
  });
}

export async function parseCsvFile(file: File): Promise<ImportParseResult> {
  const rows = await parseCsvRows(file);
  return transformCsvRows(rows);
}
