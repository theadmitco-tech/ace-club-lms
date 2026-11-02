'use client';

import dynamic from 'next/dynamic';
import { Component, useState, type ReactNode } from 'react';
import { v2ReadingPageId } from '@/lib/v2ReadingPreview';
import { V2_SESSION_STAGES, v2CourseResourceHref } from '@/lib/v2SessionPresentation';
import { getYoutubeEmbedUrl } from '@/lib/youtube';
import type { V2CourseSession, V2SessionContentItem, V2SessionContentKind } from '@/lib/v2Templates';
import styles from './v2CourseSession.module.css';
import type { V2ResourceLearning } from './V2LearningWorkspace';
import { V2RecordingPlayer, v2RecordingSource } from './V2RecordingPlayer';
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

function SessionResource({ item, kind, mode, readingEndpoint, sessionKey, batchId, learning }: {
  item: V2SessionContentItem; kind: V2SessionContentKind; mode: 'admin-preview' | 'student'; readingEndpoint?: string;
  sessionKey: string; batchId?: string; learning?: V2ResourceLearning;
}) {
  const [open, setOpen] = useState(false);
  const source = v2CourseResourceHref(item.url, { mode, sessionKey, batchId, itemKey: item.key });
  const pageId = v2ReadingPageId(item.url);
  const reading = kind === 'preSessionReads' || kind === 'postSessionReads' || (kind === 'materials' && pageId !== null);
  const recording = kind === 'recordings' && source ? getYoutubeEmbedUrl(source) : null;
  return <div className={styles.resource}>
    <h5>{item.title || 'Untitled resource'}</h5>
    {!source ? <p role="alert">A valid resource source and authorized course context are required.</p> : <>
      {(reading || recording || learning && learning.feedbackTracking !== false && kind === 'recordings') && <button type="button" className={styles.button} aria-expanded={open} onClick={() => { setOpen(!open); if (!open && learning && kind === 'preSessionReads') void learning.onProgress(item.key, 'opened'); }}>
        {open ? 'Close resource' : reading ? 'Read here' : learning && v2RecordingSource(source).kind === 'external' ? 'Recording options' : 'Watch here'}
      </button>}
      {open && <ContentBoundary key={`${source}:${mode}`}>
        {reading ? pageId ? <div className="material-content"><NotionReader allowSourceEmbedFallback pageId={pageId} sourceUrl={source} title={item.title}
          mode={mode} readingType={kind === 'materials' ? 'material' : kind === 'preSessionReads' ? 'pre-read' : 'post-read'} endpoint={readingEndpoint} /></div>
          : <p>Inline reading is available for Notion pages. This resource opens at its source.</p>
          : learning && learning.feedbackTracking !== false && batchId && kind === 'recordings' ? <V2RecordingPlayer url={source} title={item.title || 'Session recording'} batchId={batchId} sessionKey={sessionKey} recordingKey={item.key} publicationRevision={learning.publicationRevision} onFeedbackDue={learning.onFeedbackDue} /> : recording && <div className={styles.video}><iframe src={recording} title={item.title || 'Session recording'}
            allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>}
      </ContentBoundary>}
      {learning && kind === 'preSessionReads' && <div><small className={styles.progress}>{learning.progress.some(p => p.itemKey === item.key && p.status === 'read') ? '● Marked as read' : learning.progress.some(p => p.itemKey === item.key) ? '● Previously opened' : 'Ready to read'}</small><button type="button" className={styles.button} disabled={learning.progress.some(p => p.itemKey === item.key && p.status === 'read')} onClick={() => void learning.onProgress(item.key, 'read')}>Mark as read</button><p className={styles.empty}>A personal visual reminder; opening or reading does not trigger feedback.</p></div>}
      <a className={styles.source} onClick={() => { if (learning && kind === 'preSessionReads') void learning.onProgress(item.key, 'opened'); }} href={source} target="_blank" rel="noreferrer">Open {item.title || 'resource'} in a new tab <span aria-hidden="true">↗</span></a>
    </>}
  </div>;
}

export function V2CourseSessionView({ session, mode, readingEndpoint, batchId, learning }: {
  session: V2CourseSession; mode: 'admin-preview' | 'student'; readingEndpoint?: string; batchId?: string; learning?: V2ResourceLearning;
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
          : session.content[kind].map((item) => <SessionResource key={item.key} item={item} kind={kind} mode={mode} readingEndpoint={readingEndpoint} sessionKey={session.key} batchId={batchId} learning={mode === 'student' ? learning : undefined} />)}</div>
      </details>
    </li>)}</ol>
  </article>;
}
