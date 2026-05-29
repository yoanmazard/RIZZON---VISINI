/**
 * Pousse site_url, redirect URLs et MFA TOTP via l'API Management Supabase.
 * Prérequis : supabase login (token CLI) ou SUPABASE_ACCESS_TOKEN
 */
import { loadSupabaseAccessToken } from './load-supabase-token.mjs';

const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'qgnqgvwkgynmbxpyjtna';
const token = loadSupabaseAccessToken();

if (!token) {
  console.warn(
    'Token Management API introuvable — auth sera configurée via supabase config push uniquement.',
  );
  process.exit(0);
}

const siteUrl = 'https://v0-acquisitionrizzon.vercel.app';
const uriAllowList = [
  'http://localhost:3000/auth/callback',
  'https://v0-acquisitionrizzon.vercel.app/auth/callback',
  'https://*.vercel.app/auth/callback',
].join(',');

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
  {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_url: siteUrl,
      uri_allow_list: uriAllowList,
      mfa_totp_enroll_enabled: true,
      mfa_totp_verify_enabled: true,
    }),
  },
);

const body = await response.text();
if (!response.ok) {
  console.error('Echec config auth:', response.status, body);
  process.exit(1);
}

console.log('Configuration auth mise à jour:');
console.log(JSON.parse(body));
