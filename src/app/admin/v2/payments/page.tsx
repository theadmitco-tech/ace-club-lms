import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2CheckoutEnabled } from '@/lib/server/v2Checkout';
import { createClient } from '@/utils/supabase/server';
import PaymentRecovery from './PaymentRecovery';
export const dynamic = 'force-dynamic';
export default async function PaymentsPage() {
  if (!isV2CheckoutEnabled()) notFound();
  await requirePortalRole('admin');
  const { data, error } = await (await createClient()).rpc('list_v2_checkout_exceptions');
  return <main><h1>Payment exceptions</h1><p>Test Mode only. Recovery verifies the provider order, receipt, captured amount and currency before retrying the original fulfillment. No manual paid-access override is provided.</p>
    {error || !Array.isArray(data) ? <p role="alert">Payment exceptions could not be loaded.</p> : <PaymentRecovery exceptions={data} />}
  </main>;
}
