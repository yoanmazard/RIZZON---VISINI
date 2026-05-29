import { redirect } from 'next/navigation';
import { getCurrentUserAccess } from '@/lib/auth/access';
import { listAllowedEmails } from '@/lib/auth/allowed-emails-actions';
import { AllowedEmailsPanel } from '@/components/admin/allowed-emails-panel';

export default async function AccesPage() {
  const access = await getCurrentUserAccess();
  if (!access?.isAdmin) {
    redirect('/dashboard');
  }

  const records = await listAllowedEmails();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold">Gestion des accès</h2>
        <p className="text-sm text-muted-foreground">
          Liste blanche Google OAuth · réservée aux administrateurs
        </p>
      </div>

      <AllowedEmailsPanel records={records} currentEmail={access.email} />
    </div>
  );
}
