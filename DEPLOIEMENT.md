# Déploiement Vercel — v0-acquisitionrizzon

Projet Vercel : **v0-acquisitionrizzon**  
Supabase : **qgnqgvwkgynmbxpyjtna** (Projet RIZZON)

## 1. Prérequis Supabase (une seule fois)

Connexion BDD via **pooler IPv4** (`aws-1-eu-north-1`, port `6543`) :

```bash
npm run db:push      # migrations (déjà appliquées en prod)
npm run db:seed      # comptes autorisés
npm run db:verify    # contrôle tables + migrations
```

Auth (site URL, redirects, MFA) — token CLI requis :

```bash
supabase login
npm run supabase:auth
```

Puis dans [Supabase Dashboard](https://supabase.com/dashboard/project/qgnqgvwkgynmbxpyjtna/auth/providers) :

| Section | Action |
|---------|--------|
| **Authentication → Providers → Google** | Activer OAuth |
| **Authentication → Multi-Factor** | Activer TOTP |
| **Authentication → URL Configuration** | Site URL : `https://v0-acquisitionrizzon.vercel.app` |
| **Redirect URLs** | Ajouter : |
| | `https://v0-acquisitionrizzon.vercel.app/auth/callback` |
| | `http://localhost:3000/auth/callback` |
| | `https://*.vercel.app/auth/callback` (previews) |
| **Table Editor → allowed_emails** | Vérifier les 3 comptes autorisés |

## 2. Variables d'environnement Vercel

Dashboard Vercel → **v0-acquisitionrizzon** → Settings → Environment Variables :

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qgnqgvwkgynmbxpyjtna.supabase.co` | idem | idem |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé publishable Supabase | idem | idem |
| `NEXT_PUBLIC_SITE_URL` | `https://v0-acquisitionrizzon.vercel.app` | *(vide — fallback VERCEL_URL)* | `http://localhost:3000` |
| `ALLOWED_EMAILS` | `yoan@mmimm.fr,yoan.mazard@gmail.com,arnaud.visini@gmail.com` | idem | idem |

Ne **jamais** exposer `DATABASE_URL` ni clé `service_role` sur Vercel (non nécessaires pour l'app).

## 3. Lier et déployer

```bash
cd "c:\Users\yoan_mmimm\Documents\Rizzon Visini"
vercel login
vercel link --project v0-acquisitionrizzon
vercel --prod
```

Ou connecter le dépôt GitHub dans Vercel → Import → déploiement automatique à chaque push.

## 4. Vérifications post-déploiement

1. Ouvrir `https://v0-acquisitionrizzon.vercel.app`
2. Connexion Google → MFA TOTP → dashboard
3. Import CSV test → export Excel → `/dashboard/historique`

## 5. Commandes utiles

```bash
npm run build          # test local production
npm test               # formules + panier + export
vercel env pull        # récupérer les env localement (.env.local)
vercel logs            # logs production
```
