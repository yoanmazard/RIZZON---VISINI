import { writeFileSync } from 'fs';
import pg from 'pg';
import { getPoolerConfig } from './pooler-config.mjs';

const RIZZON_TABLES = [
  'allowed_emails',
  'properties',
  'lot_links',
  'financials',
  'simulations',
  'scenarios',
  'download_history',
];

const client = new pg.Client(getPoolerConfig());

try {
  await client.connect();

  const lines = [
    '-- Projet RIZZON — schéma métier V1 (cahier des charges §5)',
    '-- Généré automatiquement depuis la base Supabase distante.',
    '-- Source de vérité : supabase/migrations/*.sql',
    '',
  ];

  for (const tableName of RIZZON_TABLES) {
    const columns = await client.query(
      `
      select
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
      order by ordinal_position
    `,
      [tableName],
    );

    if (columns.rows.length === 0) {
      lines.push(`-- ATTENTION: table public.${tableName} absente`);
      lines.push('');
      continue;
    }

    lines.push(`create table if not exists public.${tableName} (`);

    const defs = columns.rows.map((col) => {
      let type = col.data_type;
      if (type === 'ARRAY') type = 'uuid[]';
      if (type === 'USER-DEFINED' && col.udt_name === 'uuid') type = 'uuid';
      if (type === 'character varying') type = 'text';
      if (type === 'timestamp with time zone') type = 'timestamptz';

      let def = `  ${col.column_name} ${type}`;
      if (col.is_nullable === 'NO') def += ' not null';
      if (col.column_default) def += ` default ${col.column_default}`;
      return def;
    });

    lines.push(defs.join(',\n'));
    lines.push(');');
    lines.push('');
  }

  const viewDef = await client.query(`
    select pg_get_viewdef('public.properties_overview'::regclass, true) as definition
  `);

  lines.push('create or replace view public.properties_overview');
  lines.push('with (security_invoker = true)');
  lines.push('as');
  lines.push(viewDef.rows[0].definition.trim() + ';');
  lines.push('');

  writeFileSync('supabase/schema.sql', lines.join('\n'), 'utf8');
  console.log('Wrote supabase/schema.sql');
} finally {
  await client.end();
}
