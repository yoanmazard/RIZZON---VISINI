import { describe, expect, it } from 'vitest';
import { isAdminRole } from '@/lib/auth/access';

describe('isAdminRole', () => {
  it('identifie le rôle admin', () => {
    expect(isAdminRole('admin')).toBe(true);
  });

  it('rejette owner et valeurs vides', () => {
    expect(isAdminRole('owner')).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});
