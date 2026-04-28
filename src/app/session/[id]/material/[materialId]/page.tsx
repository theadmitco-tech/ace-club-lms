'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { NotionRenderer } from 'react-notion-x';
import { createClient } from '@/utils/supabase/client';
import { extractNotionPageId } from '@/lib/notion';
import Link from 'next/link';

// Core styles are required
import 'react-notion-x/src/styles.css';
// Collection and code styles (optional but recommended)
import 'prismjs/themes/prism-tomorrow.css';
import 'katex/dist/katex.min.css';

export default function MaterialViewerPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const materialId = params.materialId as string;
  const router = useRouter();
  
  const [material, setMaterial] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [recordMap, setRecordMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [supabase] = useState(() => createClient());

  useEffect(() => {
    async function loadContent() {
      if (!materialId || !sessionId) return;
      
      try {
        setLoading(true);
        
        // 1. Fetch material from Supabase
        const { data: mat, error: matError } = await supabase
          .from('materials')
          .select('*')
          .eq('id', materialId)
          .single();
        
        if (matError || !mat) {
          setError('Material not found');
          return;
        }

        // 2. Fetch session details
        const { data: sess } = await supabase
          .from('sessions')
          .select('title')
          .eq('id', sessionId)
          .single();

        setMaterial(mat);
        setSession(sess);

        // 3. Load Notion content if applicable
        if (mat.type === 'pre_read' && mat.notion_url) {
          const pageId = extractNotionPageId(mat.notion_url);
          if (pageId) {
            const response = await fetch(`/api/notion?pageId=${pageId}`);
            if (response.ok) {
              const data = await response.json();
              setRecordMap(data);
            } else {
              setError('Could not load Notion content. Make sure the page is public.');
            }
          } else {
            setError('Invalid Notion URL');
          }
        }
      } catch (err) {
        console.error(err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [materialId, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="viewer-loading">
        <div className="spinner" />
        <p>Fetching content from Notion...</p>
        <style jsx>{`
          .viewer-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            gap: 16px;
            background: var(--bg-primary);
            color: var(--text-secondary);
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="viewer-error">
        <h1>Oops!</h1>
        <p>{error}</p>
        <Link href={`/session/${sessionId}`} className="btn btn-primary">Back to Session</Link>
        <style jsx>{`
          .viewer-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            gap: 16px;
            background: var(--bg-primary);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="material-viewer">
      <header className="viewer-header">
        <div className="viewer-header-inner">
          <Link href={`/session/${sessionId}`} className="back-link">
            ← Back to {session?.title || 'Session'}
          </Link>
          <div className="viewer-info">
            <span className="material-type-tag">{material?.type?.replace('_', ' ')}</span>
            <h1 className="viewer-title">{material?.title}</h1>
          </div>
        </div>
      </header>

      <main className="viewer-content">
        <div className="notion-container">
          {recordMap ? (
            <NotionRenderer 
              recordMap={recordMap} 
              fullPage={false} 
              darkMode={true}
              className="custom-notion"
            />
          ) : (
            <div className="file-viewer-fallback">
              <p>This material is a {material?.type}.</p>
              {material?.file_url && (
                <a href={material.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  Open File
                </a>
              )}
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        .material-viewer {
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        .viewer-header {
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-primary);
          padding: 20px 0;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .viewer-header-inner {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .back-link {
          color: var(--accent-primary);
          font-size: 14px;
          text-decoration: none;
          font-weight: 500;
        }
        .viewer-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .material-type-tag {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-tertiary);
          font-weight: 700;
        }
        .viewer-title {
          font-size: 24px;
          font-weight: 800;
          margin: 0;
        }
        .viewer-content {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 24px;
        }
        .notion-container {
          background: var(--bg-glass);
          border: 1px solid var(--border-primary);
          border-radius: 16px;
          padding: 20px;
        }
        
        /* Custom Notion Overrides */
        .notion {
          font-family: var(--font-primary) !important;
          color: var(--text-primary) !important;
          background: transparent !important;
        }
        .notion-page {
          padding: 0 !important;
          width: 100% !important;
        }
        .notion-header { display: none !important; }
        .file-viewer-fallback {
          text-align: center;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
      `}</style>
    </div>
  );
}
