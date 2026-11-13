import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isV2CheckoutEnabled } from '@/lib/server/v2Checkout';
export async function GET(request: Request) {
  if (!isV2CheckoutEnabled()) return new NextResponse(null, { status: 404 });
  const url = new URL(request.url), code = url.searchParams.get('code');
  const client = await createClient();
  if (!code || (await client.auth.exchangeCodeForSession(code)).error) return NextResponse.redirect(new URL('/courses/v2/checkout?auth=failed', url.origin));
  // The verified session may precede paid activation; checkout independently checks eligibility.
  return NextResponse.redirect(new URL('/courses/v2/checkout', url.origin));
}
