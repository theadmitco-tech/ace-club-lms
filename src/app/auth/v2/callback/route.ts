import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isV2CheckoutEnabled } from '@/lib/server/v2Checkout';
export async function GET(request: Request) {
  if (!isV2CheckoutEnabled()) return new NextResponse(null, { status: 404 });
  const url = new URL(request.url), code = url.searchParams.get('code');
  const failed = () => NextResponse.redirect(new URL('/courses/v2/checkout?auth=failed', url.origin));
  if (!code || url.searchParams.has('error')) return failed();
  try {
    const client = await createClient();
    if ((await client.auth.exchangeCodeForSession(code)).error) return failed();
  } catch {
    return failed();
  }
  // The verified session may precede paid activation; checkout independently checks eligibility.
  return NextResponse.redirect(new URL('/courses/v2/checkout', url.origin));
}
