'use client';

import { useEffect, useState } from 'react';

export function PdfViewer({ fileUrl, title }: { fileUrl: string; title: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch(fileUrl, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`PDF request failed with ${response.status}`);
        const data = await response.json() as { signedUrl?: string };
        if (!data.signedUrl) throw new Error('PDF response did not include a signed URL');
        setSignedUrl(data.signedUrl);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error('PDF load failed:', error);
        setStatus('failed');
      });

    return () => controller.abort();
  }, [fileUrl, requestKey]);

  if (status === 'loading') {
    return (
      <div className="material-status" role="status">
        <strong>Loading PDF</strong>
        <p>Preparing the protected PDF…</p>
      </div>
    );
  }

  if (status === 'failed' || !signedUrl) {
    return (
      <div className="material-status material-status-error" role="alert">
        <strong>We couldn&apos;t open this PDF</strong>
        <p>Retry now. If it still fails, contact the programme team and name this curriculum item.</p>
        <button
          className="student-button"
          type="button"
          onClick={() => {
            setSignedUrl(null);
            setStatus('loading');
            setRequestKey((current) => current + 1);
          }}
        >
          Retry PDF
        </button>
      </div>
    );
  }

  return (
    <div className="file-workspace">
      <iframe
        src={signedUrl}
        title={title}
        onError={() => setStatus('failed')}
      />
      <a className="student-button" href={signedUrl} target="_blank" rel="noreferrer">
        Open or download PDF
      </a>
    </div>
  );
}
