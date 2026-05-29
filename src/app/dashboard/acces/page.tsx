import { redirect } from 'next/navigation';
import { getCurrentUserAccess } from '@/lib/auth/access';
import { fetchAllowedEmails } from '@/lib/auth/allowed-emails-queries';
import { AllowedEmailsPanel } from '@/components/admin/allowed-emails-panel';

export default async function AccesPage() {
  const access = await getCurrentUserAccess();
  if (!access?.isAdmin) {
    redirect('/dashboard');
  }

  const records = await fetchAllowedEmails();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold">Gestion des accès</h2>
        <p className="text-sm text-muted-foreground">
          Liste blanche Google OAuth · réservée aux administrateurs
        </p>
      </div>

      {records.length === 0 && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Impossible de charger la liste des accès. Rechargez la page ou contactez le support.
        </p>
      )}

      <AllowedEmailsPanel records={records} currentEmail={access.email} />
    </div>
  );
}
