import { signInWithGoogle } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Projet RIZZON</CardTitle>
          <CardDescription>
            Plateforme privée d&apos;analyse d&apos;acquisition immobilière
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error && (
            <Alert variant="destructive">
              <AlertTitle>Connexion impossible</AlertTitle>
              <AlertDescription>
                Vérifiez votre compte Google autorisé et réessayez.
              </AlertDescription>
            </Alert>
          )}

          <form action={signInWithGoogle}>
            <Button type="submit" className="w-full" size="lg">
              Continuer avec Google
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Besoin d&apos;accès ? Contactez l&apos;administrateur du portefeuille.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
