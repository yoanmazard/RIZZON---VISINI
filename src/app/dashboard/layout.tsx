import { getCurrentUserAccess } from '@/lib/auth/access';
import { AppHeader } from '@/components/brand/app-header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getCurrentUserAccess();
  const isAdmin = access?.isAdmin ?? false;

  return (
    <div className="min-h-screen bg-[var(--gerimalp-bg-2)]">
      <AppHeader isAdmin={isAdmin} />
      {children}
    </div>
  );
}
