import 'server-only';

// A Preview integration, independent of the Phase 2 authoring flags.
export function isV2Phase1PreviewEnabled(): boolean {
  if (process.env.VERCEL_ENV === 'production') return false;
  return process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development';
}
