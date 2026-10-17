import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/requireAdmin';
import { assignLatestMock, assignMock, createMockAssessment, grantMockAssignmentTester, listMockAssessments, listMockAssignmentTesters, loadMockAssessment, loadMockBuilderReference, publishMock, revokeMockAssignmentTester, saveMockItems, validateMock } from '@/lib/server/mockBuilder';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) { const auth = await requireAdmin(); if (!auth.authorized) return auth.response; try { const params = new URL(request.url).searchParams; const assignmentId = params.get('assignmentId'); if (assignmentId) return NextResponse.json({ testers: await listMockAssignmentTesters(assignmentId) }, { headers }); const id = params.get('assessmentId'); if (id) return NextResponse.json(await loadMockAssessment(id), { headers }); const [assessments, reference] = await Promise.all([listMockAssessments(), loadMockBuilderReference()]); return NextResponse.json({ assessments, reference }, { headers }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load Mock Builder.' }, { status: 500, headers }); } }
export async function POST(request: Request) {
  const auth = await requireAdmin(); if (!auth.authorized) return auth.response; let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400, headers }); }
  try {
    const action = body.action;
    if (action === 'create') return NextResponse.json({ id: await createMockAssessment(auth.userId, String(body.name ?? '').trim(), body.purpose === 'diagnostic' ? 'diagnostic' : 'standard') }, { headers });
    if (action === 'items') { const raw = Array.isArray(body.items) ? body.items : []; await saveMockItems(String(body.assessmentId), raw as Array<{ section: string; question_revision_id: string; display_order: number; stimulus_group_key?: string | null }>, auth.userId); return NextResponse.json({ saved: raw.length }, { headers }); }
    if (action === 'validate') return NextResponse.json(await validateMock(String(body.assessmentId)), { headers });
    if (action === 'publish') return NextResponse.json({ version: await publishMock(String(body.assessmentId), auth.userId) }, { headers });
    if (action === 'assign') { const courseId = String(body.courseId); const releaseAt = String(body.releaseAt); const dueAt = body.dueAt ? String(body.dueAt) : null; const id = body.versionId ? await assignMock(String(body.versionId), courseId, releaseAt, dueAt, auth.userId) : await assignLatestMock(String(body.assessmentId), courseId, releaseAt, dueAt, auth.userId); return NextResponse.json({ id }, { headers }); }
    if (action === 'grant-tester') { const profile = await grantMockAssignmentTester(String(body.assignmentId), String(body.email ?? ''), auth.userId); return NextResponse.json({ profile, testers: await listMockAssignmentTesters(String(body.assignmentId)) }, { headers }); }
    if (action === 'revoke-tester') { await revokeMockAssignmentTester(String(body.assignmentId), String(body.userId), auth.userId); return NextResponse.json({ testers: await listMockAssignmentTesters(String(body.assignmentId)) }, { headers }); }
    return NextResponse.json({ error: 'Unsupported Mock Builder action.' }, { status: 400, headers });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Mock Builder operation failed.' }, { status: 400, headers }); }
}
