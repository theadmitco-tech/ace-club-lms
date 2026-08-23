import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/requireAdmin';
import { createTaxonomyTopic, listTaxonomyAdmin, updateTaxonomyValue } from '@/lib/server/mockTaxonomyAdmin';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET() { const auth = await requireAdmin(); if (!auth.authorized) return auth.response; try { return NextResponse.json({ taxonomy: await listTaxonomyAdmin() }, { headers }); } catch { return NextResponse.json({ error: 'Unable to load taxonomy.' }, { status: 500, headers }); } }
export async function POST(request: Request) {
  const auth = await requireAdmin(); if (!auth.authorized) return auth.response;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid taxonomy request.' }, { status: 400, headers }); }
  try {
    if (body.action === 'create') return NextResponse.json({ taxonomy: await createTaxonomyTopic(auth.userId, { label: body.label, section: body.section, parentId: body.parentId }) }, { headers });
    if (body.action === 'update') return NextResponse.json({ taxonomy: await updateTaxonomyValue(auth.userId, String(body.id ?? ''), { label: body.label, isActive: body.isActive }) }, { headers });
    return NextResponse.json({ error: 'Unsupported taxonomy action.' }, { status: 400, headers });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Taxonomy operation failed.' }, { status: 400, headers }); }
}
