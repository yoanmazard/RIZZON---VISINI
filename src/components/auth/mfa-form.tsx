'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type MfaStep = 'loading' | 'enroll' | 'verify';

export function MfaForm() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<MfaStep>('loading');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        setError(factorsError.message);
        setStep('enroll');
        return;
      }

      const verifiedFactor = factors.totp.find((factor) => factor.status === 'verified');

      if (verifiedFactor) {
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: verifiedFactor.id,
        });

        if (challengeError) {
          setError(challengeError.message);
          return;
        }

        setFactorId(verifiedFactor.id);
        setChallengeId(challenge.id);
        setStep('verify');
        return;
      }

      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Application authenticator',
      });

      if (enrollError) {
        setError(enrollError.message);
        return;
      }

      setFactorId(enrolled.id);
      setQrCode(enrolled.totp.qr_code);
      setSecret(enrolled.totp.secret);
      setStep('enroll');
    }

    void init();
  }, [supabase.auth]);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId) return;

    setIsSubmitting(true);
    setError(null);

    let activeChallengeId = challengeId;

    if (!activeChallengeId) {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        setError(challengeError.message);
        setIsSubmitting(false);
        return;
      }

      activeChallengeId = challenge.id;
      setChallengeId(challenge.id);
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: activeChallengeId,
      code: code.trim(),
    });

    setIsSubmitting(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  if (step === 'loading') {
    return <p className="text-sm text-muted-foreground">Chargement de la sécurité du compte…</p>;
  }

  return (
    <div className="space-y-6">
      {step === 'enroll' && (
        <div className="space-y-4">
          <Alert>
            <AlertTitle>MFA obligatoire</AlertTitle>
            <AlertDescription>
              Scannez ce QR code avec votre application d&apos;authentification (Google Authenticator,
              Authy, etc.), puis saisissez le code à 6 chiffres.
            </AlertDescription>
          </Alert>

          {qrCode && (
            <div className="flex justify-center rounded-lg border bg-white p-4">
              <Image
                src={qrCode}
                alt="QR code MFA"
                width={192}
                height={192}
                unoptimized
              />
            </div>
          )}

          {secret && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Secret manuel : <span className="font-mono text-foreground">{secret}</span>
            </p>
          )}
        </div>
      )}

      {step === 'verify' && (
        <Alert>
          <AlertTitle>Vérification MFA</AlertTitle>
          <AlertDescription>
            Saisissez le code généré par votre application d&apos;authentification.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfa-code">Code TOTP</Label>
          <Input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={6}
            required
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Vérification…' : 'Valider'}
        </Button>
      </form>
    </div>
  );
}
