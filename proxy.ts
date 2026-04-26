import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (Next.js static assets)
     * - _next/image (image optimization)
     * - favicon.ico
     * - PWA assets that must be reachable without auth: sw.js, sw.js.map, manifest.json
     * - public binary assets by extension
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|sw\\.js\\.map|manifest\\.json|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
