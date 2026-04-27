'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getSession, isMaterialAvailable } from '@/lib/mockData';
import { Session, Material } from '@/lib/types';
import { formatDate, formatDateTime, formatRelativeDate, getYouTubeEmbedUrl, getMaterialTypeIcon, getMaterialTypeLabel } from '@/lib/utils';
import './session.css';

export default function SessionPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (sessionId) {
      const data = getSession(sessionId);
      setSession(data);
    }
  }, [user, isLoading, router, sessionId]);

  if (isLoading || !user || !session) {
    return (
      <div className="session-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const materials = session.materials || [];
  const preRead = materials.find(m => m.type === 'pre_read');
  const classMaterial = materials.find(m => m.type === 'class_material');
  const worksheet = materials.find(m => m.type === 'worksheet');
  const video = materials.find(m => m.type === 'video');

  const renderMaterialSection = (material: Material | undefined, type: string) => {
    if (!material) return null;
    
    const available = isMaterialAvailable(material);
    const icon = getMaterialTypeIcon(type);
    const label = getMaterialTypeLabel(type);

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
                🔒 {formatRelativeDate(material.available_from)}
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
                    <p>Open in Notion to read the concept overview before your session.</p>
                  </div>
                </div>
                <a
                  href={material.notion_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Open in Notion →
                </a>
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
            <p>This content will be available on <strong>{formatDateTime(material.available_from)}</strong></p>
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
              {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
                {materials.length} material{materials.length !== 1 ? 's' : ''} · {materials.filter(m => isMaterialAvailable(m)).length} available
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="session-content animate-fade-in-up stagger-1">
            {renderMaterialSection(preRead, 'pre_read')}
          </div>

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
