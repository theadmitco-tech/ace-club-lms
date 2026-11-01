import { isPhase1VerificationEnabled, verifyPhase1CallerSession } from '@/lib/server/v2Phase1Verification';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff' };

export async function POST(request: Request) {
  if (!isPhase1VerificationEnabled()) return Response.json({ error: 'Not found' }, { status: 404, headers });
  // Next can normalize request.url to its internal listener hostname. Compare
  // the browser's Origin to Host, never an operator-supplied forwarded host.
  const url = new URL(request.url);
  const host = request.headers.get('host');
  let expectedOrigin = '';
  try {
    if (host && ['https:', 'http:'].includes(url.protocol)) {
      const external = new URL(`${url.protocol}//${host}`);
      if (external.host === host && !external.username && !external.password
        && external.pathname === '/' && !external.search && !external.hash && !host.includes(',')) expectedOrigin = external.origin;
    }
  } catch { /* Malformed Host must fail before any database call. */ }
  if (!expectedOrigin || request.headers.get('origin') !== expectedOrigin
    || !request.headers.get('content-type')?.startsWith('application/json')) {
    return Response.json({ error: 'Same-origin JSON request required' }, { status: 403, headers });
  }
  if ((await request.text()).trim() !== '{}') {
    return Response.json({ error: 'No account, fixture or grant parameters are accepted' }, { status: 400, headers });
  }
  return Response.json(await verifyPhase1CallerSession(), { headers });
}
