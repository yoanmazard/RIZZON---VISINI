'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AppRole } from '@/lib/auth/access';
import {
  addAllowedEmail,
  removeAllowedEmail,
  setAllowedEmailActive,
  setAllowedEmailRole,
  type AllowedEmailRecord,
} from '@/lib/auth/allowed-emails-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function AllowedEmailsPanel({
  records,
  currentEmail,
}: {
  records: AllowedEmailRecord[];
  currentEmail: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('owner');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setIsAdding(true);
    setError(null);
    setMessage(null);

    const result = await addAllowedEmail(email, role);
    setIsAdding(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setEmail('');
    setRole('owner');
    setMessage(result.message);
    router.refresh();
  }

  async function runAction(id: string, action: () => Promise<{ ok: boolean; message: string }>) {
    setPendingId(id);
    setError(null);
    setMessage(null);

    const result = await action();
    setPendingId(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert>
          <AlertTitle>Succès</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ajouter un accès</CardTitle>
          <CardDescription>
            L&apos;utilisateur devra se connecter via Google OAuth et activer le MFA TOTP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-email">Adresse e-mail</Label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="utilisateur@example.com"
                required
              />
            </div>
            <div className="space-y-2 md:w-40">
              <Label htmlFor="new-role">Rôle</Label>
              <select
                id="new-role"
                value={role}
                onChange={(event) => setRole(event.target.value as AppRole)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="owner">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? 'Ajout…' : 'Ajouter'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comptes autorisés</CardTitle>
          <CardDescription>{records.length} compte(s) enregistré(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">E-mail</th>
                  <th className="px-3 py-2 text-left font-medium">Rôle</th>
                  <th className="px-3 py-2 text-left font-medium">Statut</th>
                  <th className="px-3 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const isSelf = record.email === currentEmail;
                  const isPending = pendingId === record.id;

                  return (
                    <tr key={record.id} className="border-t">
                      <td className="px-3 py-2 font-medium">
                        {record.email}
                        {isSelf && (
                          <span className="ml-2 text-xs text-muted-foreground">(vous)</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={record.role}
                          disabled={isPending}
                          onChange={(event) =>
                            runAction(record.id, () =>
                              setAllowedEmailRole(record.id, event.target.value as AppRole),
                            )
                          }
                          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                        >
                          <option value="owner">Utilisateur</option>
                          <option value="admin">Administrateur</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {record.is_active ? (
                          <span className="text-emerald-700">Actif</span>
                        ) : (
                          <span className="text-muted-foreground">Inactif</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending || isSelf}
                            onClick={() =>
                              runAction(record.id, () =>
                                setAllowedEmailActive(record.id, !record.is_active),
                              )
                            }
                          >
                            {record.is_active ? 'Désactiver' : 'Réactiver'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={isPending || isSelf}
                            onClick={() =>
                              runAction(record.id, () => removeAllowedEmail(record.id))
                            }
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
