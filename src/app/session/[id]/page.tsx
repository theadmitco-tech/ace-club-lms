'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { formatDate, formatRelativeDate, getYouTubeEmbedUrl, getMaterialTypeIcon, getMaterialTypeLabel } from '@/lib/utils';
import './session.css';

function isMaterialAvailable(material: any, session: any) {
  const sessionDate = new Date(session.session_date);
  const now = new Date();
  
  if (material.type === 'pre_read') {
    // 1 week before the session
    const availableDate = new Date(sessionDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    return now >= availableDate;
  } else {
    // right after the session (defaulting to 10 AM session, so +2 hours = 12 PM UTC)
    const availableDate = new Date(sessionDate.getTime() + 2 * 60 * 60 * 1000);
    return now >= availableDate;
  }
}

export default function SessionPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }

    async function fetchSession() {
      setDataLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('*, materials(*)')
        .eq('id', sessionId)
        .single();
      
      if (!error && data) {
        setSession(data);
      }
      setDataLoading(false);
    }

    if (user && sessionId) {
      fetchSession();
    }
  }, [user, authLoading, router, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = authLoading || dataLoading;

  if (isLoading || !user || !session) {
    return (
      <div className="session-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const materials = session.materials || [];
  const preReads = materials.filter((m: any) => m.type === 'pre_read');
  const classMaterial = materials.find((m: any) => m.type === 'class_material');
  const worksheet = materials.find((m: any) => m.type === 'worksheet');
  const video = materials.find((m: any) => m.type === 'video');

  const renderMaterialSection = (material: any, type: string) => {
    if (!material) return null;
    
    const available = isMaterialAvailable(material, session);
    const icon = getMaterialTypeIcon(type);
    const label = getMaterialTypeLabel(type);

    let availabilityText = '';
    if (!available) {
      if (type === 'pre_read') {
        const availableDate = new Date(new Date(session.session_date).getTime() - 7 * 24 * 60 * 60 * 1000);
        availabilityText = formatRelativeDate(availableDate.toISOString());
      } else {
        availabilityText = `after class`;
      }
    }

    return (
      <div className={`material-section glass-card ${available ? 'available' : 'locked'}`}>
        <div className="material-section-header">
          <div className="material-section-icon">{icon}</div>
          <div className="material-section-info">
            <h3 className="material-section-title">{material.title}</h3>
            <span className="material-section-type">{label}</span>
          </div>
          <div className="material-section-status">
            {available ? (
              <span className="badge badge-available">● Available</span>
            ) : (
              <span className="badge badge-locked">
                🔒 {availabilityText}
              </span>
            )}
          </div>
        </div>

        {available ? (
          <div className="material-section-content">
            {/* Pre-read: Notion link */}
            {type === 'pre_read' && material.notion_url && (
              <div className="material-action-area">
                <div className="notion-preview">
                  <div className="notion-preview-icon">📖</div>
                  <div className="notion-preview-info">
                    <h4>Pre-read Material</h4>
                    <p>Read the concept overview directly within the Ace Club platform.</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/session/${sessionId}/material/${material.id}`)}
                  className="btn btn-primary"
                >
                  Start Reading →
                </button>
              </div>
            )}

            {/* Video: YouTube embed */}
            {type === 'video' && material.video_url && (
              <div className="video-embed-container">
                <iframe
                  src={getYouTubeEmbedUrl(material.video_url) || ''}
                  title={material.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="video-embed"
                />
              </div>
            )}

            {/* PDF: Class Material or Worksheet */}
            {(type === 'class_material' || type === 'worksheet') && material.file_url && (
              <div className="material-action-area">
                <div className="pdf-preview">
                  <div className="pdf-preview-icon">📄</div>
                  <div className="pdf-preview-info">
                    <h4>{material.title}</h4>
                    <p>PDF document ready to view or download.</p>
                  </div>
                </div>
                <div className="pdf-actions">
                  <a
                    href={material.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    View PDF →
                  </a>
                  <a
                    href={material.file_url}
                    download
                    className="btn btn-secondary"
                  >
                    ⬇ Download
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="material-locked-message">
            <div className="locked-icon-large">🔒</div>
            <p>This content will be available <strong>{availabilityText}</strong></p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="session-page">
      {/* Top Navigation */}
      <nav className="session-nav">
        <div className="session-nav-inner">
          <button className="btn btn-ghost" onClick={() => router.push('/dashboard')}>
            ← Back to Dashboard
          </button>
          <div className="session-nav-right">
            <div className="nav-user-avatar">
              {user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="session-main">
        <div className="session-container">
          {/* Session Header */}
          <div className="session-header animate-fade-in-up">
            <div className="session-header-top">
              <span className="session-badge">Session {String(session.session_number).padStart(2, '0')}</span>
              <span className="session-date">{formatDate(session.session_date)}</span>
            </div>
            <h1 className="session-title">{session.title}</h1>
            <div className="session-meta">
              <div className="session-material-count">
                {materials.length} material{materials.length !== 1 ? 's' : ''} · {materials.filter((m: any) => isMaterialAvailable(m, session)).length} available
              </div>
            </div>
          </div>

          {/* Content Sections */}
          {preReads.map((preRead: any, index: number) => (
            <div className="session-content animate-fade-in-up stagger-1" key={preRead.id}>
              {renderMaterialSection(preRead, 'pre_read')}
              {index === 0 && preReads.length > 1 && (
                <div style={{ height: 'var(--space-sm)' }} />
              )}
            </div>
          ))}

          <div className="session-content animate-fade-in-up stagger-2">
            {renderMaterialSection(video, 'video')}
          </div>

          <div className="session-content animate-fade-in-up stagger-3">
            {renderMaterialSection(classMaterial, 'class_material')}
          </div>

          <div className="session-content animate-fade-in-up stagger-4">
            {renderMaterialSection(worksheet, 'worksheet')}
          </div>

          {materials.length === 0 && (
            <div className="empty-state animate-fade-in-up">
              <div className="empty-state-icon">📭</div>
              <h3 className="empty-state-title">No materials yet</h3>
              <p className="empty-state-text">
                Materials for this session haven&apos;t been added yet. Check back later!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
