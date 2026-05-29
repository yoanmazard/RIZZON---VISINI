import { AuthShell } from '@/components/brand/auth-shell';
import { MfaForm } from '@/components/auth/mfa-form';

export default function MfaPage() {
  return (
    <AuthShell
      title="Authentification sécurisée"
      description="Sécurisation obligatoire de votre compte avant l'accès aux analyses."
    >
      <MfaForm />
    </AuthShell>
  );
}
