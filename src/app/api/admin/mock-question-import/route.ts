import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/requireAdmin';
import { createMockAdminClient, loadQuestionPackageContext } from '@/lib/server/mockQuestionBankAdmin';
import { parseMockQuestionPackage } from '@/lib/server/mockQuestionPackage';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const MAX_PACKAGE_BYTES = 50 * 1024 * 1024;
const BUCKET = 'mock-media';

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function previewToken(digest: string, expiresAt: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Question Bank server configuration is incomplete.');
  return createHmac('sha256', secret).update(`${digest}.${expiresAt}`).digest('hex');
}

function tokensMatch(left: string, right: string) {
  const leftBytes = Buffer.from(left, 'hex');
  const rightBytes = Buffer.from(right, 'hex');
  return leftBytes.length === 32 && rightBytes.length === 32 && timingSafeEqual(leftBytes, rightBytes);
}

function rawTopicCode(section: string, label: string) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'label';
  return `raw-${section.replace(/_/g, '-')}-${slug}-${randomUUID().slice(0, 8)}`;
}

async function ensureRawQuestionLabels(admin: ReturnType<typeof createMockAdminClient>, questions: Array<{ section: string; topic: string; subtopic: string | null }>) {
  const { data, error } = await admin.from('mock_topics').select('id,label,section,parent_id,is_active');
  if (error) throw error;
  const rows = data ?? [];
  for (const question of questions) {
    let topic = rows.find((row) => row.is_active && row.section === question.section && row.parent_id === null && row.label.toLowerCase() === question.topic.toLowerCase());
    if (!topic) {
      const result = await admin.from('mock_topics').insert({ code: rawTopicCode(question.section, question.topic), label: question.topic, section: question.section, is_active: true }).select('id,label,section,parent_id,is_active').single();
      if (result.error) throw result.error;
      topic = result.data;
      rows.push(topic);
    }
    if (question.subtopic) {
      const child = rows.find((row) => row.is_active && row.parent_id === topic.id && row.label.toLowerCase() === question.subtopic!.toLowerCase());
      if (!child) {
        const result = await admin.from('mock_topics').insert({ code: rawTopicCode(question.section, `${question.topic}-${question.subtopic}`), label: question.subtopic, section: question.section, parent_id: topic.id, is_active: true }).select('id,label,section,parent_id,is_active').single();
        if (result.error) throw result.error;
        rows.push(result.data);
      }
    }
  }
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_PACKAGE_BYTES + 1024 * 1024) return json({ error: 'Package exceeds the 50 MB limit.' }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Unable to read the multipart upload.' }, 400);
  }
  const file = form.get('package');
  const mode = form.get('mode');
  const submittedDigest = form.get('previewDigest');
  const submittedExpiry = form.get('previewExpiresAt');
  const submittedToken = form.get('previewToken');
  if (!(file instanceof File)) return json({ error: 'Choose an XLSX or ZIP package.' }, 400);
  if (file.size > MAX_PACKAGE_BYTES) return json({ error: 'Package exceeds the 50 MB limit.' }, 413);
  if (mode !== 'validate' && mode !== 'confirm') return json({ error: 'Import mode must be validate or confirm.' }, 400);

  let parsed;
  try {
    const context = await loadQuestionPackageContext(authorization.userId);
    parsed = await parseMockQuestionPackage(Buffer.from(await file.arrayBuffer()), file.name, context);
  } catch (error) {
    console.error('Question package validation failed:', error);
    return json({ error: 'The package could not be validated. Retry with the canonical template.' }, 500);
  }
  if (mode === 'validate') return json({
    preview: parsed.preview,
    previewToken: previewToken(parsed.preview.package.previewDigest, parsed.preview.expiresAt),
  });
  if (!parsed.preview.valid) return json({ error: 'Resolve every validation error before confirming import.', preview: parsed.preview }, 422);
  if (typeof submittedDigest !== 'string' || submittedDigest !== parsed.preview.package.previewDigest) {
    return json({ error: 'The package or preview changed. Run validation again before confirming.' }, 409);
  }
  if (typeof submittedExpiry !== 'string' || !Number.isFinite(Date.parse(submittedExpiry)) || Date.parse(submittedExpiry) <= Date.now()) {
    return json({ error: 'The validation preview expired. Run validation again.' }, 409);
  }
  if (typeof submittedToken !== 'string' || !tokensMatch(submittedToken, previewToken(parsed.preview.package.previewDigest, submittedExpiry))) {
    return json({ error: 'The validation preview token is invalid. Run validation again.' }, 409);
  }

  const admin = createMockAdminClient();
  await ensureRawQuestionLabels(admin, parsed.preview.package.questions);
  const sessionClient = await createClient();
  const operationId = randomUUID();
  const tempPaths: string[] = [];
  const finalPaths: string[] = [];
  let importId: string | null = null;
  try {
    for (const asset of parsed.preview.package.assets) {
      const bytes = parsed.assetBytes.get(asset.sourceAssetId);
      if (!bytes) throw new Error(`Validated asset bytes missing for ${asset.sourceAssetId}`);
      const tempPath = `tmp/${operationId}/${asset.sourceAssetId}`;
      const { error } = await admin.storage.from(BUCKET).upload(tempPath, bytes, {
        contentType: asset.mimeType,
        cacheControl: 'private, max-age=0',
        upsert: false,
      });
      if (error) throw error;
      tempPaths.push(tempPath);
    }

    const operationManifest = {
      operationId,
      tempPaths,
      finalPaths: parsed.preview.package.assets.map((asset) => asset.finalPath),
    };
    const { data: beginResult, error: beginError } = await sessionClient.rpc('begin_mock_question_import', {
      p_package_id: parsed.preview.package.packageId,
      p_package_fingerprint: parsed.preview.package.packageFingerprint,
      p_preview_digest: parsed.preview.package.previewDigest,
      p_namespace_code: parsed.preview.package.submittingNamespace,
      p_payload: {
        questions: parsed.preview.package.questions,
        stimuli: parsed.preview.package.stimuli,
        assets: parsed.preview.package.assets,
      },
      p_operation_manifest: operationManifest,
    });
    if (beginError) throw beginError;
    const result = beginResult as { importId?: string; idempotent?: boolean; status?: string; result?: unknown } | null;
    importId = result?.importId ?? null;
    if (!importId) throw new Error('Import operation did not return an audit ID.');
    if (result?.idempotent) {
      if (tempPaths.length) await admin.storage.from(BUCKET).remove(tempPaths);
      return json({ importId, idempotent: true, result: result.result ?? null });
    }

    for (let index = 0; index < parsed.preview.package.assets.length; index += 1) {
      const asset = parsed.preview.package.assets[index];
      const { error } = await admin.storage.from(BUCKET).move(tempPaths[index], asset.finalPath);
      if (error) throw error;
      finalPaths.push(asset.finalPath);
    }
    const report = {
      packageId: parsed.preview.package.packageId,
      packageFingerprint: parsed.preview.package.packageFingerprint,
      namespace: parsed.preview.package.submittingNamespace,
      completedAt: new Date().toISOString(),
      counts: parsed.preview.counts,
      actions: parsed.preview.package.questions.map((question) => ({ sourceId: question.sourceQuestionId, action: question.action })),
    };
    const { error: finalizeError } = await sessionClient.rpc('finalize_mock_question_import', {
      p_import_id: importId,
      p_result_report: report,
    });
    if (finalizeError) throw finalizeError;
    const { data: items, error: itemsError } = await admin.from('mock_import_items')
      .select('item_kind, source_external_id, action, entity_id, revision_id, outcome')
      .eq('import_id', importId)
      .order('item_kind').order('source_external_id');
    if (itemsError) throw itemsError;
    return json({ importId, idempotent: false, report: { ...report, items: items ?? [] } });
  } catch (error) {
    console.error('Confirmed Question Bank import failed:', error);
    if (importId) {
      const reason = error instanceof Error ? error.message : 'Import failed';
      const { error: compensationError } = await sessionClient.rpc('fail_mock_question_import', {
        p_import_id: importId,
        p_reason: reason,
      });
      if (compensationError) console.error('Question import database compensation remains pending:', compensationError);
    }
    const cleanupPaths = [...new Set([...tempPaths, ...finalPaths])];
    if (cleanupPaths.length) {
      const { error: cleanupError } = await admin.storage.from(BUCKET).remove(cleanupPaths);
      if (cleanupError) console.error('Question import object cleanup remains pending:', cleanupError);
    }
    const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Import failed.';
    return json({ error: message.slice(0, 500), cleanupPending: false }, 409);
  }
}
