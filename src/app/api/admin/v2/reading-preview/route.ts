import { NextRequest, NextResponse } from 'next/server';
import { NotionAPI } from 'notion-client';
import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { isV2TemplateAuthoringEnabled } from '@/lib/server/v2TemplateFeature';
import { isV2BatchAuthoringEnabled } from '@/lib/server/v2BatchFeature';
import { hasV2ReadingContent } from '@/lib/v2ReadingPreview';

export const dynamic = 'force-dynamic';
const response = (value: unknown, status: number) => NextResponse.json(value, {
  status, headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' },
});

// Admin draft preview only. No material, publication, feedback or progress writes.
// The existing Student Notion endpoint retains its material-access checks.
export async function GET(request: NextRequest) {
  try {
    if (!isV2TemplateAuthoringEnabled() && !isV2BatchAuthoringEnabled()) return response({ error: 'Preview unavailable' }, 404);
    const identity = await getPortalIdentity();
    if (!identity) return response({ error: 'Sign in with an active Admin account' }, 401);
    if (identity.role !== 'admin') return response({ error: 'Admin access required' }, 403);
    const pageId = request.nextUrl.searchParams.get('pageId');
    if (!pageId || !/^[a-f0-9]{32}$/.test(pageId)
      || [...request.nextUrl.searchParams.keys()].some((key) => key !== 'pageId')
      || request.nextUrl.searchParams.getAll('pageId').length !== 1) return response({ error: 'Invalid reading reference' }, 400);
    // No token, custom API host, arbitrary URL or caller identity is accepted.
    const notion = new NotionAPI({ ofetchOptions: { timeout: 10000, retry: 0 } });
    const recordMap = await notion.getPage(pageId, { fetchRelationPages: false, throwOnCollectionErrors: true });
    if (!hasV2ReadingContent(recordMap, pageId)) return response({ error: 'The reading is empty or unavailable' }, 422);
    return response(recordMap, 200);
  } catch {
    return response({ error: 'The reading could not be loaded. Check its sharing settings and retry.' }, 502);
  }
}
