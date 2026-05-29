import Link from 'next/link';
import { signOut } from '@/lib/auth/actions';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Button } from '@/components/ui/button';

export function AppHeader({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="border-b border-[var(--gerimalp-line-1)] bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="flex min-w-0 items-center gap-5">
          <BrandLogo href="/dashboard" className="h-9" />
          <div className="hidden min-w-0 border-l border-[var(--gerimalp-line-1)] pl-5 sm:block">
            <p className="eyebrow text-[var(--gerimalp-fg-3)]">Acquisition</p>
            <h1 className="font-display text-xl font-bold tracking-tight text-[var(--gerimalp-blue-primary)]">
              Projet RIZZON
            </h1>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">Tableau de bord</Link>
          </Button>
          {isAdmin && (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/acces">Accès</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/historique">Historique exports</Link>
              </Button>
            </>
          )}
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Déconnexion
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
