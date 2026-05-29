import Link from 'next/link';
import { signOut } from '@/lib/auth/actions';
import { getCurrentUserAccess } from '@/lib/auth/access';
import { Button } from '@/components/ui/button';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getCurrentUserAccess();
  const isAdmin = access?.isAdmin ?? false;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Projet RIZZON</p>
            <h1 className="text-xl font-semibold">
              Plateforme privée d&apos;analyse d&apos;acquisition immobilière
            </h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">Tableau de bord</Link>
            </Button>
            {isAdmin && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/historique">Historique exports</Link>
              </Button>
            )}
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Déconnexion
              </Button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}
