'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, type AppRole } from '@/lib/auth/access';
import {
  countActiveAdmins,
  getRecordById,
  type AllowedEmailRecord,
} from '@/lib/auth/allowed-emails-queries';

export type { AllowedEmailRecord };

type ActionResult = {
  ok: boolean;
  message: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function addAllowedEmail(email: string, role: AppRole): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    return { ok: false, message: 'Adresse e-mail invalide.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('allowed_emails').insert({
    email: normalized,
    role,
    is_active: true,
  });

  if (error) {
    if (error.code === '23505') {
      return { ok: false, message: 'Cet e-mail est déjà dans la liste.' };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath('/dashboard/acces');
  return { ok: true, message: `${normalized} ajouté à la liste blanche.` };
}

export async function setAllowedEmailRole(id: string, role: AppRole): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  const supabase = await createClient();
  const record = await getRecordById(supabase, id);

  if (!record) {
    return { ok: false, message: 'Compte introuvable.' };
  }

  if (record.role === 'admin' && role === 'owner') {
    const adminCount = await countActiveAdmins(supabase);
    if (record.is_active && adminCount <= 1) {
      return { ok: false, message: 'Impossible de retirer le dernier administrateur actif.' };
    }
  }

  const { error } = await supabase.from('allowed_emails').update({ role }).eq('id', id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/dashboard/acces');
  return { ok: true, message: 'Rôle mis à jour.' };
}

export async function setAllowedEmailActive(id: string, isActive: boolean): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  const supabase = await createClient();
  const record = await getRecordById(supabase, id);

  if (!record) {
    return { ok: false, message: 'Compte introuvable.' };
  }

  if (record.email === adminCheck.access.email && !isActive) {
    return { ok: false, message: 'Vous ne pouvez pas désactiver votre propre accès.' };
  }

  if (record.role === 'admin' && record.is_active && !isActive) {
    const adminCount = await countActiveAdmins(supabase);
    if (adminCount <= 1) {
      return { ok: false, message: 'Impossible de désactiver le dernier administrateur actif.' };
    }
  }

  const { error } = await supabase.from('allowed_emails').update({ is_active: isActive }).eq('id', id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/dashboard/acces');
  return { ok: true, message: isActive ? 'Accès réactivé.' : 'Accès désactivé.' };
}

export async function removeAllowedEmail(id: string): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  const supabase = await createClient();
  const record = await getRecordById(supabase, id);

  if (!record) {
    return { ok: false, message: 'Compte introuvable.' };
  }

  if (record.email === adminCheck.access.email) {
    return { ok: false, message: 'Vous ne pouvez pas supprimer votre propre accès.' };
  }

  if (record.role === 'admin' && record.is_active) {
    const adminCount = await countActiveAdmins(supabase);
    if (adminCount <= 1) {
      return { ok: false, message: 'Impossible de supprimer le dernier administrateur actif.' };
    }
  }

  const { error } = await supabase.from('allowed_emails').delete().eq('id', id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/dashboard/acces');
  return { ok: true, message: `${record.email} retiré de la liste blanche.` };
}
