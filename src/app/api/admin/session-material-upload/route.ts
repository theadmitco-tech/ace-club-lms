import { randomUUID } from 'node:crypto';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/requireAdmin';
import {
  COURSE_MATERIALS_BUCKET,
  createProtectedMaterialUrl,
  MAX_SESSION_MATERIAL_SIZE_BYTES,
} from '@/lib/materialFiles';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const payload = body && typeof body === 'object' ? body as {
    fileName?: unknown;
    fileSize?: unknown;
    fileType?: unknown;
    sessionId?: unknown;
  } : {};
  const { fileName, fileSize, fileType, sessionId } = payload;

  if (
    typeof fileName !== 'string'
    || typeof fileSize !== 'number'
    || typeof fileType !== 'string'
    || typeof sessionId !== 'string'
    || !UUID_PATTERN.test(sessionId)
  ) {
    return NextResponse.json({ error: 'A Session material PDF and batch session are required.' }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (fileType !== 'application/pdf' || !fileName.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF Session materials can be uploaded.' }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_SESSION_MATERIAL_SIZE_BYTES) {
    return NextResponse.json({ error: 'Session material PDFs must be 50 MB or smaller.' }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration is incomplete.' }, { status: 500, headers: NO_STORE_HEADERS });
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: sessionError } = await admin
    .from('sessions')
    .select('id, session_end_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) {
    console.error('Session material upload session lookup failed:', sessionError);
    return NextResponse.json({ error: 'Unable to validate the selected batch session.' }, { status: 500, headers: NO_STORE_HEADERS });
  }
  if (!session) {
    return NextResponse.json({ error: 'Batch session not found.' }, { status: 404, headers: NO_STORE_HEADERS });
  }
  if (!session.session_end_at) {
    return NextResponse.json({ error: 'Set the batch session end time before adding Session material.' }, { status: 409, headers: NO_STORE_HEADERS });
  }

  const path = `session-materials/${sessionId}/${randomUUID()}.pdf`;
  const { data, error } = await admin.storage
    .from(COURSE_MATERIALS_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });

  if (error) {
    console.error('Session material upload authorization failed:', error);
    return NextResponse.json({ error: 'Unable to authorize the Session material upload.' }, { status: 500, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({
    fileReference: createProtectedMaterialUrl(path),
    uploadPath: data.path,
    uploadToken: data.token,
  }, { headers: NO_STORE_HEADERS });
}
