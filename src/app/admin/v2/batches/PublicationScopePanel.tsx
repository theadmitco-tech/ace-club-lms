'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { DraftRecoveryNotice, useDraftRecovery } from '@/components/DraftRecovery';
import { isPublicationScopeInput, isPublicationScopeReview, type PublicationScopeInput, type PublicationScopeReview } from '@/lib/v2PublicationScopes';
import { V2_TEMPLATE_PRODUCTS, type V2CourseCode } from '@/lib/v2Templates';
import { previewPublicationScopeAction, savePublicationScopeAction } from './scopeActions';
import styles from '../templates/templates.module.css';

type SavedReview = { input: PublicationScopeInput; review: PublicationScopeReview };
function validReview(value: unknown): value is SavedReview {
  if (!value || typeof value !== 'object') return false;
  const data = value as SavedReview;
  return isPublicationScopeInput(data.input) && isPublicationScopeReview(data.review,data.input);
}
export default function PublicationScopePanel({ ownerId, subjectsOnly = false }: { ownerId: string; subjectsOnly?: boolean }) {
  const router = useRouter();
  const [products,setProducts] = useState<V2CourseCode[]>([]);
  const [action,setAction] = useState<'publish' | 'unpublish'>('publish');
  const [review,setReview] = useState<SavedReview | null>(null);
  const [pending,setPending] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const busy = useRef(false);
  const recovery = useDraftRecovery<SavedReview>(ownerId,'v2-publication-scope',validReview);
  useAdminDraftGuard(pending || !!review);
  async function preview() {
    if (busy.current || !products.length || review || recovery.recovered) return;
    busy.current = true; setPending(true); setError(''); setMessage('');
    try {
      const input: PublicationScopeInput = { requestId: crypto.randomUUID(),action,productCodes:products };
      const result = await previewPublicationScopeAction(input);
      if (result.status === 'error') setError(result.message);
      else { const saved = { input,review:result.review }; recovery.remember(saved); setReview(saved); }
    } catch { setError('The scope review could not be loaded.'); }
    finally { busy.current = false; setPending(false); }
  }
  async function confirm() {
    if (busy.current || !review) return;
    busy.current = true; setPending(true); setError('');
    try {
      const result = await savePublicationScopeAction(review.input,review.review.fingerprint);
      if (result.status === 'error') setError(result.message);
      else { setMessage(`${result.documents.length} batches ${review.input.action === 'publish' ? 'published' : 'unpublished'}${result.replayed ? ' · previous confirmation recovered' : ''}.`);
        recovery.forget(); setReview(null); router.refresh(); }
    } catch { setError('Confirmation was interrupted. Retrying this review recovers the same submission.'); }
    finally { busy.current = false; setPending(false); }
  }
  return <section className={styles.card} aria-labelledby="scope-title" aria-busy={pending}>
    <h2 id="scope-title">Publish across offerings</h2>
    <p>A single review covers every saved batch in the selected offerings. The server lists the exact affected revisions before confirmation.</p>
    <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable}
      onRestore={() => { if (recovery.recovered) { setReview(recovery.recovered); recovery.acknowledge(); } }} onDiscard={recovery.forget} />
    <fieldset className={styles.fields} disabled={pending || !!review || !!recovery.recovered}>
      <legend>Offerings in scope</legend>
      {(Object.keys(V2_TEMPLATE_PRODUCTS) as V2CourseCode[]).filter(code => !subjectsOnly || code !== 'full_course').map(code => <label key={code} style={{ display:'block',padding:'0.5rem' }}>
        <input type="checkbox" checked={products.includes(code)} onChange={event => setProducts(current => event.target.checked ? [...current,code] : current.filter(item => item !== code))} /> {V2_TEMPLATE_PRODUCTS[code].label}
      </label>)}
      <label>Publication action <select className="form-input" value={action} onChange={event => setAction(event.target.value as typeof action)}>
        <option value="publish">Publish saved batches</option><option value="unpublish">Unpublish currently published batches</option>
      </select></label>
      <button className="btn btn-secondary" type="button" disabled={!products.length} onClick={preview}>Review affected batches</button>
    </fieldset>
    {review && <section aria-labelledby="scope-review">
      <h3 id="scope-review">{review.input.action === 'publish' ? 'Publish' : 'Unpublish'} {review.review.proposal.items.length} batches</h3>
      <p>All listed changes succeed together. New or changed batches require a fresh review. Student purchases, feedback and attendance remain separate.</p>
      <ul className={styles.list}>{review.review.proposal.items.map(({ document,input }) => <li key={document.batchId}>
        <strong>{document.title}</strong> · {V2_TEMPLATE_PRODUCTS[document.productCode].label}
        <p>Draft {input.batchRevision} → publication {document.revision} · {document.sessions?.length ?? 0} course sessions · {document.events.filter(event => event.kind === 'live').length} live classes</p>
      </li>)}</ul>
      <div className={styles.buttons}><button type="button" className="btn btn-primary" disabled={pending} onClick={confirm}>{pending ? 'Confirming…' : `Confirm ${review.input.action} for all listed batches`}</button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => { setReview(null); recovery.forget(); }}>Cancel scope review</button></div>
    </section>}
    <p role="alert" className={styles.error}>{error}</p><p role="status">{message}</p>
  </section>;
}
