import { createClient as createAdminClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import {
  COURSE_MATERIALS_BUCKET,
  createProtectedMaterialUrl,
  isSessionMaterialStoragePath,
  isSupportedProtectedMaterialPath,
  isWorksheetStoragePath,
} from '@/lib/materialFiles';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');
  if (!path || !isSupportedProtectedMaterialPath(path)) {
    return NextResponse.json({ error: 'Invalid material path' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile?.is_active) {
    return NextResponse.json({ error: 'Active account required' }, { status: 403 });
  }

  const fileUrl = createProtectedMaterialUrl(path);
  const expectedType = isWorksheetStoragePath(path)
    ? 'worksheet'
    : isSessionMaterialStoragePath(path)
      ? 'session_material'
      : null;
  if (!expectedType) {
    return NextResponse.json({ error: 'Invalid material path' }, { status: 400 });
  }
  const { data: material, error: materialError } = await supabase
    .from('materials')
    .select('id')
    .eq('file_url', fileUrl)
    .eq('type', expectedType)
    .limit(1)
    .maybeSingle();

  if (materialError || !material) {
    return NextResponse.json({ error: 'Material not found' }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration is incomplete.' }, { status: 500 });
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.storage
    .from(COURSE_MATERIALS_BUCKET)
    .createSignedUrl(path, 60);

  if (error || !data?.signedUrl) {
    console.error('Material signed URL creation failed:', error);
    return NextResponse.json({ error: 'Unable to open material.' }, { status: 500 });
  }

  if (request.headers.get('accept')?.includes('application/json')) {
    return NextResponse.json(
      { signedUrl: data.signedUrl },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  return new NextResponse(null, {
    status: 307,
    headers: {
      'Cache-Control': 'private, no-store',
      Location: data.signedUrl,
    },
  });
}
