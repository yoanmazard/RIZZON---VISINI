# Projet RIZZON — Plateforme d'analyse d'acquisition immobilière

Outil web privé d'aide à la décision pour l'acquisition de lots immobiliers (appartements + annexes).

**Stack cible :** Next.js · Supabase · Vercel · Cursor

## Projet Supabase

| Paramètre | Valeur |
|-----------|--------|
| Nom | Projet RIZZON |
| Project ref | `qgnqgvwkgynmbxpyjtna` |
| URL | https://qgnqgvwkgynmbxpyjtna.supabase.co |

## Schéma BDD (V1)

| Table | Rôle |
|-------|------|
| `allowed_emails` | Liste blanche des accès (Google OAuth + MFA) |
| `properties` | Lots (appartements, garages, caves, parkings) |
| `lot_links` | Associations appartement ↔ annexes (N annexes) |
| `financials` | Données financières pseudonymisées (Locataire 1, 2…) |
| `simulations` | Hypothèses acquéreur (prix, loyer, travaux, charges) |
| `scenarios` | Panier d'acquisition sauvegardé (modes lié / délié) |
| `download_history` | Historique des exports Excel |
| `properties_overview` | Vue lecture seule pour le data grid |

### Règles métier clés

- **Loyer hors charges** mappé sur `Loyer HT` (pas `Loyer TTC`)
- **Aucune donnée nominative** importée (nom, mail, téléphone, SIRET, CAF…)
- **Pseudonymes** : `Locataire 1`, `Locataire 2`… ou `Vacant`
- **Statut** : croisement locataire + dates de bail + préavis (pas seul mot VACANT)
- **Déliation** : scénario `délié` sans modifier la donnée source
- **Rentabilité nette** : taxe foncière, charges non récup., vacance, frais de gestion

## Setup Supabase CLI

```bash
supabase login
npm run supabase:link
supabase db push
```

Le seed insère les comptes autorisés dans `allowed_emails`.

## Application Next.js

```bash
npm run dev
```

Ouvrir http://localhost:3000

### Routes

| Route | Description |
|-------|-------------|
| `/login` | Connexion Google OAuth |
| `/auth/mfa` | Enrôlement / vérification MFA TOTP |
| `/auth/unauthorized` | E-mail non autorisé |
| `/dashboard` | Tableau de bord (protégé) |

### Configuration Supabase Dashboard

1. **Authentication → Providers → Google** : activer OAuth
2. **Authentication → URL Configuration** : ajouter `http://localhost:3000/auth/callback`
3. **Authentication → Multi-Factor** : activer TOTP
4. **`supabase db push`** : appliquer le schéma + seed `allowed_emails`
5. Remplacer les e-mails dans `allowed_emails` et `.env` (`ALLOWED_EMAILS`)

### Import CSV (dashboard)

1. Exporter le fichier de gestion locative en **CSV** (depuis Excel : Enregistrer sous → CSV UTF-8)
2. Se connecter au dashboard → **Import CSV pseudonymisé**
3. Vérifier l'aperçu des 5 premières lignes (Loyer HC = colonne **Loyer HT**)
4. Confirmer l'import → upsert idempotent sur `ref_lot` + reconstruction des liens annexes

Colonnes filtrées côté navigateur (jamais envoyées) : nom, mail, téléphone, date/lieu de naissance, profession, SIRET, n° CAF…

## Scripts npm

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur de développement Next.js |
| `npm run build` | Build production |
| `npm run db:check` | Teste la connexion PostgreSQL distante |
| `npm run supabase:link` | Lie le projet Supabase CLI |

## Plan de développement (cahier des charges §9)

1. ~~Schéma BDD + RLS~~
2. Next.js (App Router) + Tailwind + shadcn/ui
3. Auth Google OAuth + MFA + liste blanche
4. Import CSV (PapaParse client-side, pseudonymisation)
5. Data grid (TanStack Table)
6. Fiche lot + formules rentabilité
7. Déliation / panier / scénarios
8. Export Excel + historique
9. Déploiement Vercel

## Note réseau

L'hôte DB Supabase peut être en IPv6 uniquement. Utiliser le **Session pooler (IPv4)** du dashboard si `npm run db:check` échoue.

## État actuel

- [x] `supabase init`
- [x] Schéma métier V1 (migration SQL + RLS)
- [x] Application Next.js (auth Google + MFA + liste blanche)
- [x] Import CSV pseudonymisé + TanStack Table
- [x] Fiche lot + rentabilité brute/nette (slide-over)
- [x] Déliation appartement/annexes (ventilation 90/10)
- [x] Panier d'acquisition + scénarios sauvegardés
- [x] Export Excel + historique des téléchargements
- [x] Configuration Vercel (`v0-acquisitionrizzon`) — voir [DEPLOIEMENT.md](./DEPLOIEMENT.md)
- [x] Premier déploiement prod : https://v0-acquisitionrizzon.vercel.app
- [x] `supabase db push` + seed `allowed_emails` (pooler `aws-1-eu-north-1`)
- [ ] `supabase login` + `npm run supabase:auth` (URLs + MFA TOTP)
- [ ] Google OAuth dans Supabase Dashboard
