'use client';

import { useEffect, useState } from 'react';
import type { ExtendedRecordMap } from 'notion-types';
import { hasV2ReadingContent } from '@/lib/v2ReadingPreview';
import { NotionRenderer } from 'react-notion-x';
import 'react-notion-x/src/styles.css';
import 'prismjs/themes/prism-tomorrow.css';
import 'katex/dist/katex.min.css';

function getNotionUrl(sourceUrl?: string | null) {
  if (!sourceUrl) return null;

  const iframeSrc = sourceUrl.match(/src=["']([^"']+)["']/i)?.[1];
  const candidate = (iframeSrc ?? sourceUrl).replaceAll('&amp;', '&').trim();

  try {
    const url = new URL(candidate);
    const isNotionHost = url.hostname === 'notion.so'
      || url.hostname.endsWith('.notion.so')
      || url.hostname === 'notion.site'
      || url.hostname.endsWith('.notion.site');

    return url.protocol === 'https:' && isNotionHost ? url.toString() : null;
  } catch {
    return null;
  }
}

type NotionReaderProps = {
  pageId: string; sourceUrl?: string | null; title?: string;
  mode?: 'student' | 'admin-preview'; readingType?: 'pre-read' | 'post-read';
};

export function NotionReader(props: NotionReaderProps) {
  return <NotionReaderContent key={`${props.mode}:${props.pageId}:${props.sourceUrl}`} {...props} />;
}

function NotionReaderContent({
  pageId,
  sourceUrl,
  title = 'Notion pre-read', mode = 'student', readingType = 'pre-read',
}: NotionReaderProps) {
  const [recordMap, setRecordMap] = useState<ExtendedRecordMap | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [requestKey, setRequestKey] = useState(0);
  const notionUrl = getNotionUrl(sourceUrl);
  const embedUrl = mode === 'student' && notionUrl && new URL(notionUrl).pathname.split('/').includes('ebd')
    ? notionUrl
    : null;

  useEffect(() => {
    if (embedUrl) return;

    let ignore = false;
    const controller = new AbortController();
    const endpoint = mode === 'admin-preview' ? '/api/admin/v2/reading-preview' : '/api/notion';
    fetch(`${endpoint}?pageId=${encodeURIComponent(pageId)}`, { signal: controller.signal, cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Notion request failed with ${response.status}`);
        const data = await response.json() as ExtendedRecordMap;
        if (mode === 'admin-preview' && !hasV2ReadingContent(data, pageId)) throw new Error('Reading content is unavailable');
        if (!ignore) {
          setRecordMap(data);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!ignore) setStatus('failed');
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [embedUrl, pageId, requestKey, mode]);

  if (embedUrl) {
    return (
      <div className="notion-embed-shell">
        <iframe
          className="notion-fallback-embed"
          src={embedUrl}
          title={title}
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  if (status === 'loading') {
    return <div className="material-status" role="status"><strong>Loading {readingType}</strong><p>Fetching the Notion page…</p></div>;
  }

  if (status === 'failed' || !recordMap) {
    return (
      <div className="material-status material-status-error" role="alert">
        <strong>We couldn&apos;t load this {readingType}</strong>
        <p>Retry the embedded view or open the Notion page in a new tab.</p>
        <div className="material-status-actions">
          <button
            className="student-button"
            type="button"
            onClick={() => {
              setStatus('loading');
              setRequestKey((current) => current + 1);
            }}
          >
            Retry {readingType}
          </button>
          {notionUrl && (
            <a className="student-button student-button-secondary" href={notionUrl} target="_blank" rel="noreferrer">
              Open in Notion
            </a>
          )}
        </div>
      </div>
    );
  }

  return <NotionRenderer recordMap={recordMap} fullPage={false} darkMode={false} className="custom-notion" />;
}
