import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/requireAdmin';
import {
  COURSE_MATERIALS_BUCKET,
  createProtectedMaterialUrl,
  MAX_WORKSHEET_SIZE_BYTES,
} from '@/lib/materialFiles';

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  const payload = body && typeof body === 'object' ? body as {
    fileName?: unknown;
    fileSize?: unknown;
    fileType?: unknown;
    masterSessionId?: unknown;
  } : {};
  const { fileName, fileSize, fileType, masterSessionId } = payload;

  if (
    typeof fileName !== 'string'
    || typeof fileSize !== 'number'
    || typeof fileType !== 'string'
    || typeof masterSessionId !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(masterSessionId)
  ) {
    return NextResponse.json({ error: 'A worksheet PDF and master session are required.' }, { status: 400 });
  }

  if (fileType !== 'application/pdf' || !fileName.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF worksheets can be uploaded.' }, { status: 400 });
  }

  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_WORKSHEET_SIZE_BYTES) {
    return NextResponse.json({ error: 'Worksheet PDFs must be 50 MB or smaller.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration is incomplete.' }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const path = `worksheets/${masterSessionId}/${randomUUID()}.pdf`;
  const { data, error } = await admin.storage
    .from(COURSE_MATERIALS_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });

  if (error) {
    console.error('Master worksheet upload authorization failed:', error);
    return NextResponse.json({ error: 'Unable to authorize the worksheet upload.' }, { status: 500 });
  }

  return NextResponse.json({
    fileName,
    fileReference: createProtectedMaterialUrl(path),
    uploadPath: data.path,
    uploadToken: data.token,
  });
}
