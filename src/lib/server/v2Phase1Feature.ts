import 'server-only';
import { v2Phase1SurfacesAllowed } from '@/lib/v2Environment';

// Catalogue and My access: Preview, local development, or an approved Production release.
export function isV2Phase1PreviewEnabled(): boolean {
  return v2Phase1SurfacesAllowed(process.env);
}
