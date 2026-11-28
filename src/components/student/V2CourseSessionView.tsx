'use client';

import { courseReadmePosition } from '@/lib/v2CourseReadmes';
import dynamic from 'next/dynamic';
import { Component, Fragment, useState, type ReactNode } from 'react';
import { v2ReadingPageId } from '@/lib/v2ReadingPreview';
import { v2SessionStages, v2CourseResourceHref } from '@/lib/v2SessionPresentation';
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
  const read = !!learning?.progress.some(p => p.itemKey === item.key && p.status === 'read');
  const opened = !!learning?.progress.some(p => p.itemKey === item.key);
  const playable = reading || recording || nativeRecording || (learning && learning.feedbackTracking !== false && kind === 'recordings');
  // A worksheet opens on its own page beside the practice log, in the same tab.
  const worksheetPage = learning && mode === 'student' && batchId && kind === 'materials' && !reading ? `/schedule/v2/${batchId}/worksheet/${sessionKey}/${item.key}` : null;
  const markOpened = () => { if (learning && kind === 'preSessionReads') void learning.onProgress(item.key, 'opened'); };
  const icon = kind === 'recordings' ? <path d="m10 8 6 4-6 4z M3 5h18v14H3z" /> : kind === 'materials' && !reading ? <path d="M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7" /> : <path d="M3 5h6a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H3z M21 5h-6a3 3 0 0 0-3 3v12a2.5 2.5 0 0 1 2.5-2.5H21z" />;
  return <div className={styles.resource} data-open={open || undefined} data-read={read || undefined}>
    <div className={styles.resourceRow}>
      <span className={styles.icon} aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">{icon}</svg></span>
      <div className={styles.resourceText}>
        <h5>{item.title || 'Untitled resource'}</h5>
        {learning && kind === 'preSessionReads' && (read || opened) && <small className={styles.progress} data-read={read || undefined}>{read ? '✓ Read' : 'Opened'}</small>}
      </div>
      {source && <div className={styles.actions}>
        {playable ? <button type="button" className={styles.primaryAction} aria-expanded={open} onClick={() => { setOpen(!open); if (!open) markOpened(); }}>
          {open ? 'Close resource' : reading ? 'Read here' : learning && v2RecordingSource(source).kind === 'external' ? 'Recording options' : 'Watch here'}
        </button> : worksheetPage ? <a className={styles.primaryAction} href={worksheetPage}>Open worksheet</a>
          : <a className={styles.primaryAction} href={source} target="_blank" rel="noreferrer" aria-label={`Open ${item.title || 'resource'} in a new tab`}>{kind === 'materials' ? 'Open worksheet' : 'Open'} <span aria-hidden="true">↗</span></a>}
        {(playable || worksheetPage) && <a className={styles.newTab} onClick={markOpened} href={source} target="_blank" rel="noreferrer" aria-label={`Open ${item.title || 'resource'} in a new tab`} title="Open in a new tab"><span aria-hidden="true">↗</span></a>}
      </div>}
    </div>
    {!source ? <p role="alert">A valid resource source and authorized course context are required.</p> : <>
      {open && <div className={styles.expanded}><ContentBoundary key={`${source}:${mode}`}>
        {reading ? pageId ? <div className="material-content"><NotionReader allowSourceEmbedFallback pageId={pageId} sourceUrl={source} title={item.title}
          mode={mode} readingType={kind === 'materials' ? 'material' : kind === 'preSessionReads' ? 'pre-read' : 'post-read'} endpoint={readingEndpoint} /></div>
          : <p className={styles.empty}>Inline reading is available for Notion pages. This resource opens at its source.</p>
          : learning && learning.feedbackTracking !== false && batchId && kind === 'recordings' ? <V2RecordingPlayer url={source} title={item.title || 'Session recording'} batchId={batchId} sessionKey={sessionKey} recordingKey={item.key} publicationRevision={learning.publicationRevision} onFeedbackDue={learning.onFeedbackDue} /> : nativeRecording ? <video controls preload="metadata" src={source} aria-label={item.title || 'Session recording'} style={{maxWidth:'100%'}} /> : recording && <div className={styles.video}><iframe src={recording} title={item.title || 'Session recording'}
            allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>}
      </ContentBoundary></div>}
      {learning && kind === 'preSessionReads' && !read && <button type="button" className={styles.markRead} onClick={() => void learning.onProgress(item.key, 'read')}>Mark as read</button>}
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
  const uniqueResources = resources.filter((resource,index) => resources.findIndex(other => other.item.key === resource.item.key) === index);
  if (!uniqueResources.length) return null;
  return <section aria-label={placement.replaceAll('_',' ')} className={styles.resources}>{uniqueResources.map(({item,kind,session}) =>
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
      <p className={styles.eyebrow}>{session.section === 'programme' ? 'Programme' : session.section === 'di' ? 'DI' : session.section === 'quant' ? 'Quant' : 'Verbal'} · {courseReadmePosition(session.key) ? 'Course README' : 'Course session'}</p>
      <h3>{session.title || 'Untitled session'}</h3>
      {mode === 'admin-preview' && <p className={styles.notice}>Student-view preview · Viewing does not record progress, feedback or attendance.</p>}
    </header>
    <ol className={styles.stages}>{v2SessionStages(session.key).map(({ kind, title, description }, _index, stages) => {
      const items = session.content[kind].filter(item => !outsideStage.has(item.key));
      // Empty sections are hidden, except on single-section pages such as the course reading pages.
      // A missing recording is explained to students, since a missed live class depends on it.
      const recordingPending = kind === 'recordings' && !items.length && mode === 'student' && !!learning && stages.length > 1;
      if (!items.length && stages.length > 1 && !recordingPending) return null;
      return <li key={kind} className={styles.stage} aria-label={title}>
        <h4 className={styles.stageTitle}><span>{title}</span><small>{description}</small></h4>
        <div className={styles.resources}>{recordingPending ? <div className={styles.pendingRecording} role="status"><strong>The recording isn’t available yet</strong><span>{learning?.feedbackDue ? 'You can still give feedback now. If you missed the live class, choose “I didn’t attend”. The recording will appear here once it’s added.' : 'It will appear here once it’s added. Everything else in this session is ready.'}</span></div>
          : !items.length && <p className={styles.emptyRow}>Nothing has been added yet.</p>}{items.map(item => <Fragment key={item.key}>
            {kind === 'recordings' && batchId && <V2PlacedReadings sessions={[session]} placements={placements} placement="before_video" anchorKey={item.key} mode={mode} batchId={batchId} learningForSession={learning ? () => learning : undefined} />}
            <SessionResource item={item} kind={kind} mode={mode} readingEndpoint={readingEndpoint} sessionKey={session.key} batchId={batchId} learning={mode === 'student' ? learning : undefined} />
            {kind === 'recordings' && batchId && <V2PlacedReadings sessions={[session]} placements={placements} placement="after_video" anchorKey={item.key} mode={mode} batchId={batchId} learningForSession={learning ? () => learning : undefined} />}
          </Fragment>)}</div>
      </li>;
    })}</ol>
    {v2SessionStages(session.key).length > 1 && v2SessionStages(session.key).every(({ kind }) => !session.content[kind].some(item => !outsideStage.has(item.key))) && <p className={styles.empty}>Nothing has been added to this session yet.</p>}
  </article>;
}
