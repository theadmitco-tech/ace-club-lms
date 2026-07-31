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

  const formData = await request.formData();
  const file = formData.get('file');
  const masterSessionId = formData.get('masterSessionId');

  if (!(file instanceof File) || typeof masterSessionId !== 'string' || !masterSessionId) {
    return NextResponse.json({ error: 'A worksheet PDF and master session are required.' }, { status: 400 });
  }

  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF worksheets can be uploaded.' }, { status: 400 });
  }

  if (file.size > MAX_WORKSHEET_SIZE_BYTES) {
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
    .upload(path, file, { contentType: 'application/pdf', upsert: false });

  if (error) {
    console.error('Master worksheet upload failed:', error);
    return NextResponse.json({ error: 'Unable to upload the worksheet.' }, { status: 500 });
  }

  return NextResponse.json({
    fileName: file.name,
    fileReference: createProtectedMaterialUrl(data.path),
  });
}
