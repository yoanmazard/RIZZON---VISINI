import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdminRole, resolveUserRole } from '@/lib/auth/roles';

const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth/unauthorized'];
const ADMIN_PATHS = ['/dashboard/historique', '/dashboard/acces'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isAdminPath(pathname: string) {
  return ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}


function getAllowedEmailsFromEnv() {
  return (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user) {
    if (isPublicPath(pathname)) {
      return supabaseResponse;
    }

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const email = user.email?.toLowerCase() ?? '';
  const allowedFromEnv = getAllowedEmailsFromEnv();
  let isAllowed = allowedFromEnv.includes(email);

  if (!isAllowed) {
    const { data: allowedRow } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle();

    isAllowed = Boolean(allowedRow);
  }

  if (!isAllowed) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/auth/unauthorized';
    return NextResponse.redirect(url);
  }

  const isMfaPath = pathname.startsWith('/auth/mfa');
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasVerifiedTotp =
    factors?.totp?.some((factor) => factor.status === 'verified') ?? false;

  if (!hasVerifiedTotp) {
    if (!isMfaPath && pathname !== '/auth/callback') {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/mfa';
      return NextResponse.redirect(url);
    }
  } else {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2' && !isMfaPath && pathname !== '/auth/callback') {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/mfa';
      return NextResponse.redirect(url);
    }
  }

  if (pathname === '/login' || pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (isAdminPath(pathname)) {
    const role = await resolveUserRole(supabase, email);
    if (!isAdminRole(role)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
