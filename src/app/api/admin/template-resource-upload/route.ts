import { randomUUID } from 'node:crypto';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { COURSE_MATERIALS_BUCKET, createProtectedMaterialUrl, MAX_WORKSHEET_SIZE_BYTES } from '@/lib/materialFiles';
import { requireAdmin } from '@/lib/server/requireAdmin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid template resource upload request.' }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const templateId = typeof payload.templateId === 'string' ? payload.templateId : '';
  const fileName = typeof payload.fileName === 'string' ? payload.fileName : '';
  const fileSize = typeof payload.fileSize === 'number' ? payload.fileSize : 0;
  const fileType = typeof payload.fileType === 'string' ? payload.fileType : '';
  if (!UUID_PATTERN.test(templateId)) return NextResponse.json({ error: 'Choose a valid template.' }, { status: 400, headers: NO_STORE_HEADERS });
  if (fileType !== 'application/pdf' || !fileName.toLowerCase().endsWith('.pdf')) return NextResponse.json({ error: 'Only PDF worksheets can be uploaded.' }, { status: 400, headers: NO_STORE_HEADERS });
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_WORKSHEET_SIZE_BYTES) return NextResponse.json({ error: 'Worksheet PDFs must be 50 MB or smaller.' }, { status: 400, headers: NO_STORE_HEADERS });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: 'Server configuration is incomplete.' }, { status: 500, headers: NO_STORE_HEADERS });
  const admin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: template, error: templateError } = await admin.from('course_templates').select('id').eq('id', templateId).maybeSingle();
  if (templateError) return NextResponse.json({ error: 'Unable to validate the template.' }, { status: 500, headers: NO_STORE_HEADERS });
  if (!template) return NextResponse.json({ error: 'Template not found.' }, { status: 404, headers: NO_STORE_HEADERS });

  const path = `worksheets/${templateId}/${randomUUID()}.pdf`;
  const { data, error } = await admin.storage.from(COURSE_MATERIALS_BUCKET).createSignedUploadUrl(path, { upsert: false });
  if (error) {
    console.error('Template worksheet upload authorization failed:', error);
    return NextResponse.json({ error: 'Unable to authorize the protected worksheet upload.' }, { status: 500, headers: NO_STORE_HEADERS });
  }
  return NextResponse.json({ fileReference: createProtectedMaterialUrl(path), uploadPath: data.path, uploadToken: data.token }, { headers: NO_STORE_HEADERS });
}
