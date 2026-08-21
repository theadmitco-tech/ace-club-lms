'use client';

import { useState } from 'react';
import type { QuestionPackagePreview } from '@/lib/mockQuestionBank/types';
import { MockRichContent } from './MockRichContent';

type ValidationResponse = { preview?: QuestionPackagePreview; previewToken?: string; error?: string };

export function MockBulkUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<QuestionPackagePreview | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [report, setReport] = useState<unknown>(null);

  async function submit(mode: 'validate' | 'confirm') {
    if (!file) { setMessage('Choose an XLSX or ZIP package first.'); return; }
    setBusy(true); setMessage(''); setReport(null);
    const form = new FormData();
    form.set('package', file);
    form.set('mode', mode);
    if (mode === 'confirm' && preview) {
      form.set('previewDigest', preview.package.previewDigest);
      form.set('previewExpiresAt', preview.expiresAt);
      form.set('previewToken', token);
    }
    try {
      const response = await fetch('/api/admin/mock-question-import', { method: 'POST', body: form });
      const result = await response.json() as ValidationResponse & { report?: unknown; result?: unknown; importId?: string; idempotent?: boolean };
      if (!response.ok) throw new Error(result.error || 'Question package request failed.');
      if (mode === 'validate' && result.preview) {
        setPreview(result.preview); setToken(result.previewToken ?? '');
        setMessage(result.preview.valid ? 'Dry run passed. Review the preview, then confirm the all-or-nothing Draft import.' : 'Dry run found blocking errors. No Question Bank records or Storage objects were created.');
      } else {
        const finalReport = result.report ?? result.result ?? { importId: result.importId, idempotent: result.idempotent };
        setReport(finalReport); setMessage(result.idempotent ? 'This exact package was already imported; the prior result was returned.' : 'Import completed. Every question was saved as Draft.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Question package request failed.');
    } finally { setBusy(false); }
  }

  function downloadReport() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'ace-club-question-import-result.json'; anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="admin-card mock-workspace-card" aria-labelledby="bulk-upload-title">
      <div className="admin-card-header"><div><h2 className="admin-card-title" id="bulk-upload-title">Bulk upload questions</h2><p className="admin-page-subtitle">XLSX alone, or ZIP with one root workbook and assets/ images. Validation writes nothing.</p></div></div>
      <label className="mock-field"><span>Question package</span><input type="file" accept=".xlsx,.zip,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setToken(''); setReport(null); }} /></label>
      <div className="mock-action-row"><button className="btn btn-secondary" disabled={busy || !file} onClick={() => void submit('validate')}>{busy ? 'Working…' : 'Validate and preview'}</button>{preview?.valid && <button className="btn btn-primary" disabled={busy} onClick={() => void submit('confirm')}>Confirm all-or-nothing Draft import</button>}{report ? <button className="btn btn-secondary" onClick={downloadReport}>Download result report</button> : null}</div>
      {message && <p className="mock-status" role="status" aria-live="polite">{message}</p>}
      {preview && <div className="mock-preview-stack">
        <div className="admin-stats-grid mock-stats"><div className="admin-stat-card"><div className="admin-stat-number">{preview.counts.questions}</div><div className="admin-stat-label">Questions</div></div><div className="admin-stat-card"><div className="admin-stat-number">{preview.counts.stimuli}</div><div className="admin-stat-label">Stimuli</div></div><div className="admin-stat-card"><div className="admin-stat-number">{preview.counts.errors}</div><div className="admin-stat-label">Errors</div></div><div className="admin-stat-card"><div className="admin-stat-number">{preview.counts.likelyDuplicates}</div><div className="admin-stat-label">Likely duplicates</div></div></div>
        {preview.issues.length > 0 && <div className="admin-table-container"><table className="admin-table"><caption className="sr-only">Package validation findings</caption><thead><tr><th>Level</th><th>Location</th><th>Finding</th><th>Correction</th></tr></thead><tbody>{preview.issues.map((issue, index) => <tr key={`${issue.sheet}-${issue.row}-${issue.field}-${index}`}><td><span className={`badge ${issue.severity === 'error' ? 'badge-locked' : 'badge-upcoming'}`}>{issue.severity}</span></td><td>{issue.sheet}{issue.row ? ` row ${issue.row}` : ''}{issue.field ? ` · ${issue.field}` : ''}</td><td>{issue.message}</td><td>{issue.correctiveAction}</td></tr>)}</tbody></table></div>}
        <div className="mock-preview-grid">{preview.package.questions.map((question) => <article className="mock-question-preview" key={question.sourceQuestionId}><div className="mock-preview-heading"><strong>{question.questionType} · {question.topic}</strong><span className="badge badge-locked">Draft</span></div><code>{question.sourceNamespace}::{question.sourceQuestionId}</code>{question.sourceStimulusId && <p>Shared stimulus: <code>{question.sourceStimulusId}</code> · group {question.stimulusGroupOrder}</p>}<MockRichContent value={question.stem} /><div className="mock-options-preview">{question.options.map((option) => <div key={`${option.slotId}-${option.optionId}`} className={option.isCorrect ? 'mock-correct-option' : ''}><span>{option.slotId} / {option.optionId}</span><MockRichContent value={option.content} />{option.isCorrect && <strong>Correct</strong>}</div>)}</div></article>)}</div>
      </div>}
    </section>
  );
}
