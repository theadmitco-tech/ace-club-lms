'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const SESSION_ID = '772b9072-ee53-498c-b9c3-59fe1c23bc22';
const BUCKET = 'course-materials';

type StepResult = {
  ok: boolean;
  status?: number;
};

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : `Request failed (${response.status}).`);
  }
  return body;
}

export default function Phase4VerificationPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, StepResult> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runLifecycle() {
    setRunning(true);
    setResult(null);
    setError(null);

    let materialId: string | null = null;
    const checks: Record<string, StepResult> = {};

    try {
      const pdf = new Blob([
        '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n',
        '2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
      ], { type: 'application/pdf' });

      const authorizationResponse = await fetch('/api/admin/session-material-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'phase-4-preview-verification.pdf',
          fileSize: pdf.size,
          fileType: pdf.type,
          sessionId: SESSION_ID,
        }),
      });
      const authorization = await readJson(authorizationResponse);
      checks.authorization = { ok: true, status: authorizationResponse.status };

      const { error: uploadError } = await createClient().storage
        .from(BUCKET)
        .uploadToSignedUrl(authorization.uploadPath, authorization.uploadToken, pdf, {
          contentType: 'application/pdf',
          upsert: false,
        });
      if (uploadError) throw uploadError;
      checks.upload = { ok: true };

      const saveResponse = await fetch('/api/admin/session-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileReference: authorization.fileReference,
          sessionId: SESSION_ID,
          title: 'Phase 4 Preview verification reading',
        }),
      });
      const saved = await readJson(saveResponse);
      materialId = saved.id;
      checks.attach = { ok: true, status: saveResponse.status };

      const readResponse = await fetch(authorization.fileReference, {
        headers: { Accept: 'application/json' },
      });
      const delivered = await readJson(readResponse);
      const cacheControl = readResponse.headers.get('cache-control') ?? '';
      if (typeof delivered.signedUrl !== 'string' || !cacheControl.includes('private') || !cacheControl.includes('no-store')) {
        throw new Error('Protected delivery did not return the required short-lived, no-store response.');
      }
      checks.protectedRead = { ok: true, status: readResponse.status };

      const deleteResponse = await fetch('/api/admin/session-materials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId, sessionId: SESSION_ID }),
      });
      const deleted = await readJson(deleteResponse);
      if (deleted.cleanupPending) throw new Error('The database row was removed but private-file cleanup is pending.');
      materialId = null;
      checks.cleanup = { ok: true, status: deleteResponse.status };

      const afterCleanupResponse = await fetch(authorization.fileReference, {
        headers: { Accept: 'application/json' },
      });
      if (afterCleanupResponse.status !== 404) {
        throw new Error(`Removed material remained readable (${afterCleanupResponse.status}).`);
      }
      checks.residue = { ok: true, status: afterCleanupResponse.status };
      setResult(checks);
    } catch (lifecycleError) {
      if (materialId) {
        await fetch('/api/admin/session-materials', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materialId, sessionId: SESSION_ID }),
        }).catch(() => undefined);
      }
      setResult(checks);
      setError(lifecycleError instanceof Error ? lifecycleError.message : 'Verification failed.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section>
      <h1>Phase 4 Preview verification</h1>
      <p>Runs one temporary private-PDF lifecycle against staging and removes it before reporting success.</p>
      <button type="button" onClick={runLifecycle} disabled={running}>
        {running ? 'Running verification…' : 'Run temporary lifecycle'}
      </button>
      {result && (
        <pre aria-label="Sanitized verification result">{JSON.stringify(result, null, 2)}</pre>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
