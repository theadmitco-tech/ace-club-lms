'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import type { ImportWorkspace as Workspace } from '@/lib/server/v2ContentImports';
import { contentImportAction } from './actions';
import styles from './imports.module.css';

type Review = { fingerprint: string; assets?: number; placements?: number; templates?: number; scope?: { templateId: string; title: string; expectedRevision: number; items: number }[] };
type Plan = { drafts: { templateId: string; expectedRevision: number; document: { title: string } }[]; [key: string]: unknown };
export default function ImportWorkspace({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [importId, setImportId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [assetId, setAssetId] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [templateIds, setTemplateIds] = useState<string[]>([]);
  const [replacement, setReplacement] = useState<Review | null>(null);
  const [replacementId, setReplacementId] = useState('');
  const [replacementConfirmed, setReplacementConfirmed] = useState(false);
  const [recoveryId, setRecoveryId] = useState('');
  useAdminDraftGuard(pending || review !== null || replacement !== null || recoveryId !== '');
  const asset = workspace.assets.find(item => item.id === assetId);
  const request = { assetId, title, url, templateIds };
  function clearReplacement() { setReplacement(null); setReplacementConfirmed(false); setReplacementId(''); }
  function run(operation: string, input: unknown, onSuccess: (data: Record<string, unknown>) => void) {
    startTransition(async () => {
      setMessage('');
      try {
        const result = await contentImportAction(operation, input);
        if (result.status === 'error') { setMessage(result.message); return; }
        onSuccess(result.data);
      } catch { setMessage('Confirmation was interrupted. Retrying this same review recovers the submission.'); }
    });
  }
  return <div className={styles.workspace}>
    <p role="status" aria-live="polite">{message}</p>
    <section className="admin-card" aria-labelledby="import-heading">
      <h2 id="import-heading">Import reviewed material</h2>
      <p>The prepared mapping file identifies each source, destination and placement. Source records are checked again before import.</p>
      <label className={styles.field}>Reviewed transfer file
        <input type="file" accept="application/json,.json" disabled={pending} onChange={async event => {
          setPlan(null); setReview(null); setConfirmed(false); setImportId(''); setMessage('');
          const file = event.target.files?.[0]; if (!file) return;
          try {
            if (file.size > 700_000) throw new Error();
            const parsed = JSON.parse(await file.text());
            if (parsed?.format !== 'v2-content-transfer-plan-1' || !Array.isArray(parsed.drafts) || !parsed.drafts.every((draft: Plan['drafts'][number]) => typeof draft?.document?.title === 'string' && typeof draft.templateId === 'string')) throw new Error();
            setPlan(parsed);
          } catch { setMessage('A valid reviewed transfer file smaller than 700 KB is required.'); }
        }} />
      </label>
      <button type="button" disabled={pending || !plan} onClick={() => run('preview', { plan }, data => {
        setReview(data as Review); setImportId(crypto.randomUUID()); setConfirmed(false);
      })}>Review import scope</button>
      {review && plan && <div className={styles.review}>
        <h3>Material transfer scope</h3>
        <p>{review.assets} shared assets · {review.placements} placements · {review.templates} courses</p>
        <ul>{plan.drafts.map(draft => <li key={draft.templateId}>{draft.document.title} · draft revision {draft.expectedRevision} → {draft.expectedRevision + 1}</li>)}</ul>
        <label><input type="checkbox" checked={confirmed} disabled={pending} onChange={event => setConfirmed(event.target.checked)} /> The listed sources and destinations have been reviewed.</label>
        <button type="button" disabled={pending || !confirmed} onClick={() => run('apply', { id: importId, plan, fingerprint: review.fingerprint }, () => {
          setMessage('Material imported into private drafts. Publication remains a separate action.'); setReview(null); setPlan(null); setConfirmed(false); router.refresh();
        })}>Confirm import into drafts</button>
      </div>}
    </section>
    <section className="admin-card" aria-labelledby="asset-heading">
      <h2 id="asset-heading">Replace a shared asset</h2>
      <p>Selected course drafts receive a new asset version. Published batches retain their pinned content until a separate publication review.</p>
      {workspace.assets.length === 0 ? <p>No shared assets have been imported yet.</p> : <>
        <label className={styles.field}>Shared asset<select value={assetId} disabled={pending} onChange={event => {
          const selected = workspace.assets.find(item => item.id === event.target.value);
          setAssetId(event.target.value); setTitle(selected?.title ?? ''); setUrl(selected?.url ?? ''); setTemplateIds([]); clearReplacement();
        }}><option value="">Select an asset</option>{workspace.assets.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
        {asset && <>
          <label className={styles.field}>Replacement title<input value={title} maxLength={120} disabled={pending} onChange={event => { setTitle(event.target.value); clearReplacement(); }} /></label>
          <label className={styles.field}>Replacement HTTPS link<input type="url" value={url} maxLength={2048} disabled={pending} onChange={event => { setUrl(event.target.value); clearReplacement(); }} /></label>
          <fieldset><legend>Courses receiving the replacement</legend>{workspace.templates.filter(template => asset.templateIds.includes(template.id)).map(template => <label className={styles.choice} key={template.id}>
            <input type="checkbox" disabled={pending} checked={templateIds.includes(template.id)} onChange={event => {
              setTemplateIds(previous => event.target.checked ? [...previous, template.id] : previous.filter(id => id !== template.id)); clearReplacement();
            }} />{template.title}
          </label>)}</fieldset>
          <button type="button" disabled={pending || !templateIds.length || !title || !url} onClick={() => run('previewReplacement', { request }, data => {
            setReplacement(data as Review); setReplacementId(crypto.randomUUID()); setReplacementConfirmed(false);
          })}>Review affected courses</button>
          {replacement && <div className={styles.review}><h3>Replacement scope</h3>
            <ul>{replacement.scope?.map(scope => <li key={scope.templateId}>{scope.title} · revision {scope.expectedRevision} · {scope.items} placement(s)</li>)}</ul>
            <label><input type="checkbox" checked={replacementConfirmed} disabled={pending} onChange={event => setReplacementConfirmed(event.target.checked)} /> The selected replacement scope has been reviewed.</label>
            <button type="button" disabled={pending || !replacementConfirmed} onClick={() => run('replace', { id: replacementId, request, fingerprint: replacement.fingerprint }, () => {
              setMessage('The selected course drafts now reference the new asset version.'); clearReplacement(); router.refresh();
            })}>Confirm scoped replacement</button>
          </div>}
        </>}
      </>}
    </section>
    <section className="admin-card" aria-labelledby="history-heading">
      <h2 id="history-heading">Transfer history & recovery</h2>
      <p>Recovery restores the previous draft through a new revision. Later edits or batch references require a separate review.</p>
      {workspace.imports.length === 0 ? <p>No material transfers have been recorded.</p> : <ul className={styles.history}>{workspace.imports.map(item => <li key={item.id}>
        <span>{new Date(item.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST · {item.templates} courses · {item.placements} placements</span>
        {item.recovered ? <strong>Recovered</strong> : <button type="button" disabled={pending} onClick={() => setRecoveryId(item.id)}>Review recovery</button>}
        {recoveryId === item.id && !item.recovered && <div className={styles.review}><p>Recovery will restore only this transfer’s unchanged destination drafts. Shared assets and the audit record remain available.</p>
          <button type="button" disabled={pending} onClick={() => run('recover', { id: item.id }, () => { setRecoveryId(''); setMessage('Previous content restored as a new private draft revision.'); router.refresh(); })}>Confirm recovery</button>
          <button type="button" disabled={pending} onClick={() => setRecoveryId('')}>Cancel</button>
        </div>}
      </li>)}</ul>}
    </section>
  </div>;
}
