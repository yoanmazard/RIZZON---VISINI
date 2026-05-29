import { signInWithGoogle } from '@/lib/auth/actions';
import { AuthShell } from '@/components/brand/auth-shell';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      description="Plateforme privée d'analyse d'acquisition immobilière"
    >
      <div className="space-y-4">
        {params.error && (
          <Alert variant="destructive">
            <AlertTitle>Connexion impossible</AlertTitle>
            <AlertDescription>
              Vérifiez votre compte Google autorisé et réessayez.
            </AlertDescription>
          </Alert>
        )}

        <form action={signInWithGoogle}>
          <Button type="submit" className="h-11 w-full" size="lg">
            Continuer avec Google
          </Button>
        </form>

        <p className="text-center text-xs text-[var(--gerimalp-fg-3)]">
          Besoin d&apos;accès ? Contactez l&apos;administrateur du portefeuille.
        </p>
      </div>
    </AuthShell>
  );
}
