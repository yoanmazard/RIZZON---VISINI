import Link from 'next/link';
import { AuthShell } from '@/components/brand/auth-shell';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <AuthShell
      title="Accès refusé"
      description="Votre compte Google n'est pas autorisé sur cette plateforme."
    >
      <Button asChild className="w-full">
        <Link href="/login">Retour à la connexion</Link>
      </Button>
    </AuthShell>
  );
}
