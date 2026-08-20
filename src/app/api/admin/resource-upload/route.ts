import { randomUUID } from 'node:crypto';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  COURSE_MATERIALS_BUCKET,
  createProtectedMaterialUrl,
  MAX_SESSION_MATERIAL_SIZE_BYTES,
} from '@/lib/materialFiles';
import { requireAdmin } from '@/lib/server/requireAdmin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid resource upload request.' }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const category = typeof payload.category === 'string' ? payload.category : '';
  const courseId = typeof payload.courseId === 'string' ? payload.courseId : '';
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : null;
  const fileName = typeof payload.fileName === 'string' ? payload.fileName : '';
  const fileSize = typeof payload.fileSize === 'number' ? payload.fileSize : 0;
  const fileType = typeof payload.fileType === 'string' ? payload.fileType : '';

  if (!UUID_PATTERN.test(courseId) || !['worksheet', 'session_material'].includes(category)) {
    return NextResponse.json({ error: 'Choose a valid batch and PDF resource category.' }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (category === 'session_material' && (!sessionId || !UUID_PATTERN.test(sessionId))) {
    return NextResponse.json({ error: 'Choose the batch event for this Session material.' }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (fileType !== 'application/pdf' || !fileName.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF resources can be uploaded.' }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_SESSION_MATERIAL_SIZE_BYTES) {
    return NextResponse.json({ error: 'PDF resources must be 50 MB or smaller.' }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration is incomplete.' }, { status: 500, headers: NO_STORE_HEADERS });
  }
  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (sessionId) {
    const { data: session, error } = await admin.from('sessions').select('id').eq('id', sessionId).eq('course_id', courseId).maybeSingle();
    if (error) return NextResponse.json({ error: 'Unable to validate the selected batch event.' }, { status: 500, headers: NO_STORE_HEADERS });
    if (!session) return NextResponse.json({ error: 'The selected event does not belong to this batch.' }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const folderId = category === 'session_material' ? sessionId! : courseId;
  const folder = category === 'session_material' ? 'session-materials' : 'worksheets';
  const path = `${folder}/${folderId}/${randomUUID()}.pdf`;
  const { data, error } = await admin.storage.from(COURSE_MATERIALS_BUCKET).createSignedUploadUrl(path, { upsert: false });
  if (error) {
    console.error('Flexible resource upload authorization failed:', error);
    return NextResponse.json({ error: 'Unable to authorize the protected PDF upload.' }, { status: 500, headers: NO_STORE_HEADERS });
  }
  return NextResponse.json({
    fileReference: createProtectedMaterialUrl(path),
    uploadPath: data.path,
    uploadToken: data.token,
  }, { headers: NO_STORE_HEADERS });
}
