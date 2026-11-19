'use client';

import { V2_SESSION_STAGES } from '@/lib/v2SessionPresentation';
import type { V2SessionContent, V2SessionContentKind } from '@/lib/v2Templates';
import styles from './session-draft-resources.module.css';

export default function SessionDraftResources({ content, onChange, invalidField, errorId }: {
  content: V2SessionContent; onChange: (content: V2SessionContent) => void; invalidField: string | null; errorId: string;
}) {
  function change(kind: V2SessionContentKind, key: string, field: 'title' | 'url', value: string) {
    onChange({ ...content, [kind]: content[kind].map(item => item.key === key ? { ...item, [field]: value } : item) });
  }
  function add(kind: V2SessionContentKind) {
    const key = crypto.randomUUID();
    onChange({ ...content, [kind]: [...content[kind], { key, title: '', url: '' }] });
    requestAnimationFrame(() => document.getElementById(`${key}-title`)?.focus());
  }
  return <section aria-label="New session resources" className={styles.resources}>
    <h3>Session resources</h3>
    <p>Readings, recordings and worksheets can be prepared now using HTTPS links or existing protected PDF links. All resources stay private with the session draft.</p>
    {V2_SESSION_STAGES.map(({ kind, title }) => <details key={kind} className={styles.stage}>
      <summary>{title}<span>{content[kind].length ? `${content[kind].length} added` : 'Optional'}</span></summary>
      {content[kind].map((item, index) => <fieldset key={item.key} className={styles.item}>
        <legend>{title} {index + 1}</legend>
        <label htmlFor={`${item.key}-title`}>Title<input id={`${item.key}-title`} required maxLength={120} value={item.title}
          aria-invalid={invalidField === `${item.key}-title` || undefined} aria-describedby={invalidField === `${item.key}-title` ? errorId : undefined}
          onChange={event => change(kind, item.key, 'title', event.target.value)} /></label>
        <label htmlFor={`${item.key}-url`}>Resource link<input id={`${item.key}-url`} required inputMode="url" maxLength={2048} value={item.url}
          aria-invalid={invalidField === `${item.key}-url` || undefined} aria-describedby={invalidField === `${item.key}-url` ? errorId : undefined}
          onChange={event => change(kind, item.key, 'url', event.target.value)} /></label>
        <button type="button" onClick={() => {
          onChange({ ...content, [kind]: content[kind].filter(resource => resource.key !== item.key) });
          requestAnimationFrame(() => document.getElementById(`add-session-${kind}`)?.focus());
        }}>Remove {title.toLowerCase()} {index + 1}</button>
      </fieldset>)}
      <button type="button" id={`add-session-${kind}`} disabled={content[kind].length >= 50} onClick={() => add(kind)}>Add {title.toLowerCase()}</button>
    </details>)}
  </section>;
}
