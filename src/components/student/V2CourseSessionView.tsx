'use client';

import dynamic from 'next/dynamic';
import { Component, Fragment, useState, type ReactNode } from 'react';
import { v2ReadingPageId } from '@/lib/v2ReadingPreview';
import { V2_SESSION_STAGES, v2CourseResourceHref } from '@/lib/v2SessionPresentation';
import { getYoutubeEmbedUrl } from '@/lib/youtube';
import type { V2CourseSession, V2SessionContentItem, V2SessionContentKind } from '@/lib/v2Templates';
import styles from './v2CourseSession.module.css';
import type { ContentPlacementView, ContentPlacement } from '@/lib/v2ContentPublishing';
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

export function SessionResource({ item, kind, mode, readingEndpoint, sessionKey, batchId, learning }: {
  item: V2SessionContentItem; kind: V2SessionContentKind; mode: 'admin-preview' | 'student'; readingEndpoint?: string;
  sessionKey: string; batchId?: string; learning?: V2ResourceLearning;
}) {
  const [open, setOpen] = useState(false);
  const source = v2CourseResourceHref(item.url, { mode, sessionKey, batchId, itemKey: item.key });
  const pageId = v2ReadingPageId(item.url);
  const reading = kind === 'preSessionReads' || kind === 'postSessionReads' || (kind === 'materials' && pageId !== null);
  const recording = kind === 'recordings' && source ? getYoutubeEmbedUrl(source) : null;
  const nativeRecording = kind === 'recordings' && source && v2RecordingSource(source).kind === 'native';
  return <div className={styles.resource}>
    <h5>{item.title || 'Untitled resource'}</h5>
    {!source ? <p role="alert">A valid resource source and authorized course context are required.</p> : <>
      {(reading || recording || nativeRecording || learning && learning.feedbackTracking !== false && kind === 'recordings') && <button type="button" className={styles.button} aria-expanded={open} onClick={() => { setOpen(!open); if (!open && learning && kind === 'preSessionReads') void learning.onProgress(item.key, 'opened'); }}>
        {open ? 'Close resource' : reading ? 'Read here' : learning && v2RecordingSource(source).kind === 'external' ? 'Recording options' : 'Watch here'}
      </button>}
      {open && <ContentBoundary key={`${source}:${mode}`}>
        {reading ? pageId ? <div className="material-content"><NotionReader allowSourceEmbedFallback pageId={pageId} sourceUrl={source} title={item.title}
          mode={mode} readingType={kind === 'materials' ? 'material' : kind === 'preSessionReads' ? 'pre-read' : 'post-read'} endpoint={readingEndpoint} /></div>
          : <p>Inline reading is available for Notion pages. This resource opens at its source.</p>
          : learning && learning.feedbackTracking !== false && batchId && kind === 'recordings' ? <V2RecordingPlayer url={source} title={item.title || 'Session recording'} batchId={batchId} sessionKey={sessionKey} recordingKey={item.key} publicationRevision={learning.publicationRevision} onFeedbackDue={learning.onFeedbackDue} /> : nativeRecording ? <video controls preload="metadata" src={source} aria-label={item.title || 'Session recording'} style={{maxWidth:'100%'}} /> : recording && <div className={styles.video}><iframe src={recording} title={item.title || 'Session recording'}
            allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>}
      </ContentBoundary>}
      {learning && kind === 'preSessionReads' && <div><small className={styles.progress}>{learning.progress.some(p => p.itemKey === item.key && p.status === 'read') ? '● Marked as read' : learning.progress.some(p => p.itemKey === item.key) ? '● Previously opened' : 'Ready to read'}</small><button type="button" className={styles.button} disabled={learning.progress.some(p => p.itemKey === item.key && p.status === 'read')} onClick={() => void learning.onProgress(item.key, 'read')}>Mark as read</button><p className={styles.empty}>A personal visual reminder; opening or reading does not trigger feedback.</p></div>}
      <a className={styles.source} onClick={() => { if (learning && kind === 'preSessionReads') void learning.onProgress(item.key, 'opened'); }} href={source} target="_blank" rel="noreferrer">Open {item.title || 'resource'} in a new tab <span aria-hidden="true">↗</span></a>
    </>}
  </div>;
}

export function V2PlacedReadings({ sessions, placements, placement, anchorKey, mode, batchId, learningForSession }: {
  sessions: V2CourseSession[]; placements: ContentPlacementView[]; placement: ContentPlacement; anchorKey?: string;
  mode: 'admin-preview' | 'student'; batchId: string; learningForSession?: (sessionKey: string) => V2ResourceLearning;
}) {
  const resources = placements.filter(p => p.placement === placement && (anchorKey === undefined || p.anchorKey === anchorKey))
    .toSorted((a,b) => a.order-b.order || a.key.localeCompare(b.key)).flatMap(p => {
      const session = sessions.find(s => s.key === p.sessionKey);
      if (!session) return [];
      return (['preSessionReads','postSessionReads'] as const).flatMap(kind => session.content[kind].filter(i => i.key === p.key).map(item => ({item,kind,session})));
    });
  if (!resources.length) return null;
  return <section aria-label={placement.replaceAll('_',' ')} className={styles.resources}>{resources.map(({item,kind,session}) =>
    <SessionResource key={`${session.key}:${item.key}`} item={item} kind={kind} sessionKey={session.key} mode={mode} batchId={batchId}
      readingEndpoint={mode === 'admin-preview' ? '/api/admin/v2/reading-preview' : `/api/v2/course-reading?batchId=${batchId}&sessionKey=${session.key}`}
      learning={mode === 'student' ? learningForSession?.(session.key) : undefined} />)}</section>;
}

export function V2CourseSessionView({ session, mode, readingEndpoint, batchId, learning, placements = [] }: {
  session: V2CourseSession; mode: 'admin-preview' | 'student'; readingEndpoint?: string; batchId?: string; learning?: V2ResourceLearning; placements?: ContentPlacementView[];
}) {
  const outsideStage = new Set(placements.filter(p => p.sessionKey === session.key && p.placement !== 'session').map(p => p.key));
  return <article className={styles.session} aria-label={`Session content: ${session.title}`}>
    <header className={styles.heading}>
      <p className={styles.eyebrow}>{session.section === 'programme' ? 'Programme' : session.section === 'di' ? 'DI' : session.section === 'quant' ? 'Quant' : 'Verbal'} · Course session</p>
      <h3>{session.title || 'Untitled session'}</h3>
      {mode === 'admin-preview' && <p className={styles.notice}>Student-view preview · Viewing does not record progress, feedback or attendance.</p>}
    </header>
    <ol className={styles.stages}>{V2_SESSION_STAGES.map(({ kind, title, description }, index) => {
      const items = session.content[kind].filter(item => !outsideStage.has(item.key));
      return <li key={kind}><details className={styles.stage} open={items.length === 0 ? undefined : true}>
        <summary><span className={styles.number}>{index + 1}</span><span><strong>{title}</strong><small>{description}</small></span><span className={styles.count}>{items.length}</span></summary>
        <div className={styles.resources}>{items.length === 0 ? <p className={styles.empty}>No {title.toLowerCase()} has been added.</p>
          : items.map(item => <Fragment key={item.key}>
            {kind === 'recordings' && batchId && <V2PlacedReadings sessions={[session]} placements={placements} placement="before_video" anchorKey={item.key} mode={mode} batchId={batchId} learningForSession={learning ? () => learning : undefined} />}
            <SessionResource item={item} kind={kind} mode={mode} readingEndpoint={readingEndpoint} sessionKey={session.key} batchId={batchId} learning={mode === 'student' ? learning : undefined} />
            {kind === 'recordings' && batchId && <V2PlacedReadings sessions={[session]} placements={placements} placement="after_video" anchorKey={item.key} mode={mode} batchId={batchId} learningForSession={learning ? () => learning : undefined} />}
          </Fragment>)}</div>
      </details></li>;
    })}</ol>
  </article>;
}
