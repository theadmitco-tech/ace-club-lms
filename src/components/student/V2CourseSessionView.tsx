'use client';

import dynamic from 'next/dynamic';
import { Component, useState, type ReactNode } from 'react';
import { v2ReadingPageId } from '@/lib/v2ReadingPreview';
import { V2_SESSION_STAGES, v2CourseResourceHref } from '@/lib/v2SessionPresentation';
import { getYoutubeEmbedUrl } from '@/lib/youtube';
import type { V2CourseSession, V2SessionContentItem, V2SessionContentKind } from '@/lib/v2Templates';
import styles from './v2CourseSession.module.css';
import '@/app/session/[id]/material/[materialId]/material.css';

const NotionReader = dynamic(() => import('./NotionReader').then((module) => module.NotionReader), {
  loading: () => <p role="status">Loading the reading renderer…</p>,
});

class ContentBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p role="alert">The content could not be rendered. The source remains available below.</p> : this.props.children;
  }
}

function SessionResource({ item, kind, mode, readingEndpoint, sessionKey, batchId }: {
  item: V2SessionContentItem; kind: V2SessionContentKind; mode: 'admin-preview' | 'student'; readingEndpoint?: string;
  sessionKey: string; batchId?: string;
}) {
  const [open, setOpen] = useState(false);
  const source = v2CourseResourceHref(item.url, { mode, sessionKey, batchId, itemKey: item.key });
  const pageId = v2ReadingPageId(item.url);
  const reading = kind === 'preSessionReads' || kind === 'postSessionReads';
  const recording = kind === 'recordings' && source ? getYoutubeEmbedUrl(source) : null;
  return <div className={styles.resource}>
    <h5>{item.title || 'Untitled resource'}</h5>
    {!source ? <p role="alert">A valid resource source and authorized course context are required.</p> : <>
      {(reading || recording) && <button type="button" className={styles.button} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Close resource' : reading ? 'Read here' : 'Watch here'}
      </button>}
      {open && <ContentBoundary key={`${source}:${mode}`}>
        {reading ? pageId ? <div className="material-content"><NotionReader pageId={pageId} sourceUrl={source} title={item.title}
          mode={mode} readingType={kind === 'preSessionReads' ? 'pre-read' : 'post-read'} endpoint={readingEndpoint} /></div>
          : <p>Inline reading is available for Notion pages. This resource opens at its source.</p>
          : recording && <div className={styles.video}><iframe src={recording} title={item.title || 'Session recording'}
            allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>}
      </ContentBoundary>}
      <a className={styles.source} href={source} target="_blank" rel="noreferrer">Open {item.title || 'resource'} in a new tab <span aria-hidden="true">↗</span></a>
    </>}
  </div>;
}

export function V2CourseSessionView({ session, mode, readingEndpoint, batchId }: {
  session: V2CourseSession; mode: 'admin-preview' | 'student'; readingEndpoint?: string; batchId?: string;
}) {
  return <article className={styles.session} aria-label={`Session content: ${session.title}`}>
    <header className={styles.heading}>
      <p className={styles.eyebrow}>{session.section === 'programme' ? 'Programme' : session.section === 'di' ? 'DI' : session.section === 'quant' ? 'Quant' : 'Verbal'} · Course session</p>
      <h3>{session.title || 'Untitled session'}</h3>
      {mode === 'admin-preview' && <p className={styles.notice}>Student-view preview · Draft content. Viewing does not record progress, feedback or attendance.</p>}
    </header>
    <ol className={styles.stages}>{V2_SESSION_STAGES.map(({ kind, title, description }, index) => <li key={kind}>
      <details className={styles.stage} open={session.content[kind].length === 0 ? undefined : true}>
        <summary><span className={styles.number}>{index + 1}</span><span><strong>{title}</strong><small>{description}</small></span>
          <span className={styles.count}>{session.content[kind].length}</span></summary>
        <div className={styles.resources}>{session.content[kind].length === 0 ? <p className={styles.empty}>No {title.toLowerCase()} has been added.</p>
          : session.content[kind].map((item) => <SessionResource key={item.key} item={item} kind={kind} mode={mode} readingEndpoint={readingEndpoint} sessionKey={session.key} batchId={batchId} />)}</div>
      </details>
    </li>)}</ol>
  </article>;
}
