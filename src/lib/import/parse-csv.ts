'use client';

import Papa from 'papaparse';
import { transformCsvRows } from '@/lib/import/transform-rows';
import type { ImportParseResult } from '@/lib/import/types';

export function parseCsvFile(file: File): Promise<ImportParseResult> {
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

        resolve(transformCsvRows(results.data));
      },
      error(error) {
        reject(error);
      },
    });
  });
}
