import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

const publicRoutes = ['/login', '/register', '/api/health'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Bypass middleware for public routes and static files
  if (publicRoutes.includes(path) || path.startsWith('/_next') || path.includes('.')) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verify the JWT token securely
    await decrypt(sessionToken);
    return NextResponse.next();
  } catch (error) {
    // Token is invalid or expired
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
