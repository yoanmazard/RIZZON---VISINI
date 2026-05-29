/**
 * Import CLI — Etat locatif Excel → Supabase (service role)
 *
 * Usage:
 *   npm run import:etat-locatif -- "./Etat locatif2.xlsx"
 *
 * Variables (.env) :
 *   SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   IMPORT_SALT (optionnel, stable entre imports)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  importEtatLocatifRows,
  parseEtatLocatifWorkbook,
} from '../src/lib/import/etat-locatif-importer';

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile();

  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: npm run import:etat-locatif -- <fichier.xlsx>');
    process.exit(1);
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    console.error('Variables manquantes dans .env :');
    if (!supabaseUrl) console.error('  - SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL)');
    if (!serviceRole) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), fileArg);
  const buffer = readFileSync(filePath);
  const rows = await parseEtatLocatifWorkbook(buffer);

  console.log(`Fichier : ${filePath}`);
  console.log(`Lignes : ${rows.length}`);

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const result = await importEtatLocatifRows(supabase, rows, {
    importSalt: process.env.IMPORT_SALT ?? 'rizzon-import-salt',
    onProgress: (imported, total) => console.log(`  ${imported}/${total}…`),
  });

  console.log(
    `\nTerminé : ${result.imported} importées, ${result.skipped} ignorées, ${result.linksCreated} lien(s) annexe.`,
  );
}

main().catch((error) => {
  console.error('Erreur import :', error?.message ?? error);
  if (error?.details) console.error('Détails :', error.details);
  if (error?.hint) console.error('Hint :', error.hint);
  process.exit(1);
});
