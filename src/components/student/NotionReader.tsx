'use client';

import { useEffect, useState } from 'react';
import type { ExtendedRecordMap } from 'notion-types';
import { NotionRenderer } from 'react-notion-x';
import 'react-notion-x/src/styles.css';
import 'prismjs/themes/prism-tomorrow.css';
import 'katex/dist/katex.min.css';

export function NotionReader({ pageId }: { pageId: string }) {
  const [recordMap, setRecordMap] = useState<ExtendedRecordMap | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/notion?pageId=${encodeURIComponent(pageId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Notion request failed with ${response.status}`);
        const data = await response.json() as ExtendedRecordMap;
        if (!ignore) {
          setRecordMap(data);
          setStatus('ready');
        }
      })
      .catch((error: unknown) => {
        console.error('Pre-read load failed:', error);
        if (!ignore) setStatus('failed');
      });

    return () => {
      ignore = true;
    };
  }, [pageId, requestKey]);

  if (status === 'loading') {
    return <div className="material-status" role="status"><strong>Loading pre-read</strong><p>Fetching the Notion page…</p></div>;
  }

  if (status === 'failed' || !recordMap) {
    return (
      <div className="material-status material-status-error" role="alert">
        <strong>We couldn&apos;t load this pre-read</strong>
        <p>Retry now. If it still fails, contact the programme team and name this curriculum item.</p>
        <button
          className="student-button"
          type="button"
          onClick={() => {
            setStatus('loading');
            setRequestKey((current) => current + 1);
          }}
        >
          Retry pre-read
        </button>
      </div>
    );
  }

  return <NotionRenderer recordMap={recordMap} fullPage={false} darkMode={false} className="custom-notion" />;
}
