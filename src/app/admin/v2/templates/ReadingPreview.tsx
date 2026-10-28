'use client';

import { Component, useState, type ReactNode } from 'react';
import { NotionReader } from '@/components/student/NotionReader';
import { v2ReadingPageId } from '@/lib/v2ReadingPreview';
import type { V2SessionContentItem } from '@/lib/v2Templates';
import '@/app/session/[id]/material/[materialId]/material.css';

class ReadingBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div role="alert">This reading could not be rendered. Close the preview, check the source and try again.</div> : this.props.children;
  }
}

export function ReadingPreview({ item, sessionTitle, kind, position }: {
  item: V2SessionContentItem; sessionTitle: string; kind: 'preSessionReads' | 'postSessionReads'; position: number;
}) {
  const [open, setOpen] = useState(false);
  const pageId = v2ReadingPageId(item.url);
  const readingType = kind === 'preSessionReads' ? 'pre-read' : 'post-read';
  return <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
    <button type="button" className="btn btn-secondary" aria-expanded={open} onClick={() => setOpen(!open)}>
      {open ? 'Close' : 'Preview'} {readingType} {position + 1}
    </button>
    {open && <section aria-label="Draft reading preview" className="material-content" style={{ marginTop: '1rem', padding: '1rem' }}>
      <p><strong>Draft preview · Not published</strong></p>
      <p>{kind === 'preSessionReads' ? 'Before' : 'After'} session: {sessionTitle || 'Untitled session'} · Item {position + 1}</p>
      <h4>{item.title || 'Untitled reading'}</h4>
      {!item.title.trim() ? <p role="alert">Add the student-facing title before previewing this reading.</p>
        : !pageId ? <p role="alert">Rendered preview requires a Notion page link with a page ID. This source has not been previewed.</p>
          : <ReadingBoundary key={`${pageId}:${item.url}`}><NotionReader pageId={pageId} sourceUrl={item.url} title={item.title} mode="admin-preview" readingType={readingType} /></ReadingBoundary>}
    </section>}
  </div>;
}
