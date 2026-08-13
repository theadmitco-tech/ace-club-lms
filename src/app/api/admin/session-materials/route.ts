import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  COURSE_MATERIALS_BUCKET,
  getProtectedMaterialPath,
  isSessionMaterialStoragePath,
} from '@/lib/materialFiles';
import { requireAdmin } from '@/lib/server/requireAdmin';
import { createClient } from '@/utils/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

type SaveResult = {
  id: string;
  available_from: string;
  previous_file_url: string | null;
};

type RemoveResult = {
  id: string;
  file_url: string;
};

function getStorageAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function removePrivateFile(fileReference: string) {
  const path = getProtectedMaterialPath(fileReference);
  const admin = getStorageAdmin();
  if (!path || !isSessionMaterialStoragePath(path) || !admin) return false;

  const { error } = await admin.storage.from(COURSE_MATERIALS_BUCKET).remove([path]);
  if (error) {
    console.error('Session material private-file cleanup failed:', error);
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid Session material request.' }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const payload = body && typeof body === 'object' ? body as {
    fileReference?: unknown;
    materialId?: unknown;
    sessionId?: unknown;
    title?: unknown;
  } : {};
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : '';
  const materialId = typeof payload.materialId === 'string' ? payload.materialId : null;
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const fileReference = typeof payload.fileReference === 'string' ? payload.fileReference : null;
  let uploadedPath: string | null = null;
  let fileReferenceWasInUse = false;

  if (!UUID_PATTERN.test(sessionId) || (materialId !== null && !UUID_PATTERN.test(materialId)) || !title) {
    return NextResponse.json({ error: 'A valid batch session and title are required.' }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (!materialId && !fileReference) {
    return NextResponse.json({ error: 'Upload a PDF before creating Session material.' }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (fileReference) {
    const path = getProtectedMaterialPath(fileReference);
    if (!path || !isSessionMaterialStoragePath(path, sessionId)) {
      return NextResponse.json({ error: 'The uploaded PDF does not belong to the selected batch session.' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    uploadedPath = path;

    const admin = getStorageAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Server configuration is incomplete.' }, { status: 500, headers: NO_STORE_HEADERS });
    }

    const { data: referencedMaterial, error: referenceError } = await admin
      .from('materials')
      .select('id')
      .eq('file_url', fileReference)
      .eq('type', 'session_material')
      .limit(1)
      .maybeSingle();
    if (referenceError) {
      console.error('Session material file-reference validation failed:', referenceError);
      return NextResponse.json({ error: 'Unable to validate the uploaded PDF.' }, { status: 500, headers: NO_STORE_HEADERS });
    }
    if (referencedMaterial && referencedMaterial.id !== materialId) {
      return NextResponse.json({ error: 'That PDF is already attached to another Session material.' }, { status: 409, headers: NO_STORE_HEADERS });
    }
    fileReferenceWasInUse = Boolean(referencedMaterial);

    const pathParts = path.split('/');
    const fileName = pathParts.pop();
    const folder = pathParts.join('/');
    const { data: storedFiles, error: storageError } = await admin.storage
      .from(COURSE_MATERIALS_BUCKET)
      .list(folder, { limit: 2, search: fileName });
    if (storageError) {
      console.error('Session material private-file validation failed:', storageError);
      return NextResponse.json({ error: 'Unable to validate the uploaded PDF.' }, { status: 500, headers: NO_STORE_HEADERS });
    }
    if (!fileName || !storedFiles?.some((file) => file.name === fileName)) {
      return NextResponse.json({ error: 'The PDF upload did not finish. Upload it again before saving.' }, { status: 409, headers: NO_STORE_HEADERS });
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('save_batch_session_material', {
    p_session_id: sessionId,
    p_title: title,
    p_file_url: fileReference,
    p_material_id: materialId,
  });

  if (error || !data) {
    if (fileReference && uploadedPath && !fileReferenceWasInUse) {
      await removePrivateFile(fileReference);
    }
    console.error('Session material failed to save:', error);
    const status = error?.code === 'P0002' ? 404 : error?.code === '42501' ? 403 : 400;
    return NextResponse.json({ error: error?.message || 'Unable to save Session material.' }, { status, headers: NO_STORE_HEADERS });
  }

  const saved = data as SaveResult;
  let cleanupPending = false;
  if (saved.previous_file_url && saved.previous_file_url !== fileReference) {
    cleanupPending = !(await removePrivateFile(saved.previous_file_url));
  }

  return NextResponse.json({
    id: saved.id,
    availableFrom: saved.available_from,
    cleanupPending,
  }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid Session material request.' }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const payload = body && typeof body === 'object' ? body as {
    materialId?: unknown;
    sessionId?: unknown;
  } : {};
  const materialId = typeof payload.materialId === 'string' ? payload.materialId : '';
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : '';
  if (!UUID_PATTERN.test(materialId) || !UUID_PATTERN.test(sessionId)) {
    return NextResponse.json({ error: 'A valid Session material and batch session are required.' }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (!getStorageAdmin()) {
    return NextResponse.json({ error: 'Server configuration is incomplete.' }, { status: 500, headers: NO_STORE_HEADERS });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('remove_batch_session_material', {
    p_material_id: materialId,
    p_session_id: sessionId,
  });
  if (error || !data) {
    console.error('Session material failed to remove:', error);
    const status = error?.code === 'P0002' ? 404 : error?.code === '42501' ? 403 : 400;
    return NextResponse.json({ error: error?.message || 'Unable to remove Session material.' }, { status, headers: NO_STORE_HEADERS });
  }

  const removed = data as RemoveResult;
  const cleanupPending = !(await removePrivateFile(removed.file_url));
  return NextResponse.json({ id: removed.id, cleanupPending }, { headers: NO_STORE_HEADERS });
}
