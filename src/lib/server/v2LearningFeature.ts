import 'server-only';

export function isV2LearningEnabled(): boolean {
  if (process.env.V2_LEARNING_DELIVERY_ENABLED !== 'true' || process.env.VERCEL_ENV === 'production') return false;
  if (process.env.VERCEL_ENV !== 'preview' && !(process.env.NODE_ENV === 'development' && !process.env.VERCEL_ENV)) return false;
  return process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://eyphkkginlgoaxflauog.supabase.co';
}
