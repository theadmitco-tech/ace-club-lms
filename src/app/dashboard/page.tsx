'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getSessions, getMaterials, getEnrollments, getCourse, isMaterialAvailable, getSessionStatus } from '@/lib/mockData';
import { Session, Material, Course } from '@/lib/types';
import { formatDate, formatRelativeDate, getMaterialTypeIcon } from '@/lib/utils';
import './dashboard.css';

interface SessionCard {
  session: Session;
  materials: Material[];
  status: 'available' | 'locked' | 'upcoming';
}

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [sessionCards, setSessionCards] = useState<SessionCard[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'locked'>('all');

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!isLoading && user?.role === 'admin') {
      router.replace('/admin');
      return;
    }

    if (user) {
      // Get enrolled course
      const enrollments = getEnrollments(user.id);
      if (enrollments.length > 0) {
        const courseData = getCourse(enrollments[0].course_id);
        setCourse(courseData);

        // Get sessions with materials
        const allSessions = getSessions(enrollments[0].course_id);
        const cards: SessionCard[] = allSessions
          .filter(s => s.is_published)
          .map(session => {
            const mats = getMaterials(session.id);
            return {
              session,
              materials: mats,
              status: getSessionStatus(session),
            };
          });
        setSessionCards(cards);
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="dashboard-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const filteredCards = filter === 'all' 
    ? sessionCards 
    : sessionCards.filter(c => c.status === filter);

  const availableCount = sessionCards.filter(c => c.status === 'available').length;
  const lockedCount = sessionCards.filter(c => c.status === 'locked').length;
  const upcomingCount = sessionCards.filter(c => c.status === 'upcoming').length;

  return (
    <div className="dashboard">
      {/* Top Navigation */}
      <nav className="dashboard-nav">
        <div className="dashboard-nav-inner">
          <div className="dashboard-nav-brand">
            <div className="nav-logo">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <path d="M16 2L30 9V23L16 30L2 23V9L16 2Z" fill="url(#nav-grad)" fillOpacity="0.3" stroke="url(#nav-grad)" strokeWidth="1.5"/>
                <path d="M16 8L24 12.5V21.5L16 26L8 21.5V12.5L16 8Z" fill="url(#nav-grad)" fillOpacity="0.5"/>
                <text x="16" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">A</text>
                <defs>
                  <linearGradient id="nav-grad" x1="2" y1="2" x2="30" y2="30">
                    <stop offset="0%" stopColor="#4F7CFF"/>
                    <stop offset="100%" stopColor="#7C3AED"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="nav-brand-text">Ace Club</span>
          </div>

          <div className="dashboard-nav-right">
            <div className="nav-user-info">
              <div className="nav-user-avatar">
                {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="nav-user-details">
                <span className="nav-user-name">{user.full_name}</span>
                <span className="nav-user-role">Student</span>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-container">
          {/* Welcome Header */}
          <div className="dashboard-header animate-fade-in-up">
            <div className="dashboard-welcome">
              <h1 className="dashboard-title">
                Welcome back, <span className="gradient-text">{user.full_name.split(' ')[0]}</span>
              </h1>
              <p className="dashboard-course-name">
                {course?.name || 'GMAT Preparation Course'}
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="dashboard-stats animate-fade-in-up stagger-1">
            <div className="stat-card">
              <div className="stat-number">{sessionCards.length}</div>
              <div className="stat-label">Total Sessions</div>
            </div>
            <div className="stat-card stat-available">
              <div className="stat-number">{availableCount}</div>
              <div className="stat-label">Available</div>
            </div>
            <div className="stat-card stat-upcoming">
              <div className="stat-number">{upcomingCount}</div>
              <div className="stat-label">Upcoming</div>
            </div>
            <div className="stat-card stat-locked">
              <div className="stat-number">{lockedCount}</div>
              <div className="stat-label">Locked</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="dashboard-filter-bar animate-fade-in-up stagger-2">
            <div className="filter-tabs">
              <button
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All Sessions
              </button>
              <button
                className={`filter-tab ${filter === 'available' ? 'active' : ''}`}
                onClick={() => setFilter('available')}
              >
                Available
              </button>
              <button
                className={`filter-tab ${filter === 'locked' ? 'active' : ''}`}
                onClick={() => setFilter('locked')}
              >
                Locked
              </button>
            </div>
          </div>

          {/* Session Cards Grid */}
          <div className="sessions-grid">
            {filteredCards.map((card, index) => (
              <div
                key={card.session.id}
                className={`session-card glass-card animate-fade-in-up stagger-${Math.min(index + 1, 8)} ${card.status}`}
                onClick={() => {
                  if (card.status !== 'locked') {
                    router.push(`/session/${card.session.id}`);
                  }
                }}
                style={{ cursor: card.status === 'locked' ? 'not-allowed' : 'pointer' }}
              >
                {/* Session Number Badge */}
                <div className="session-number-badge">
                  <span>{String(card.session.session_number).padStart(2, '0')}</span>
                </div>

                {/* Card Header */}
                <div className="session-card-header">
                  <div className="session-card-title-row">
                    <h3 className="session-card-title">{card.session.title}</h3>
                    <span className={`badge badge-${card.status}`}>
                      {card.status === 'available' && '● Available'}
                      {card.status === 'locked' && '🔒 Locked'}
                      {card.status === 'upcoming' && '◐ Upcoming'}
                    </span>
                  </div>
                  <p className="session-card-date">
                    {formatDate(card.session.session_date)} · {formatRelativeDate(card.session.session_date)}
                  </p>
                </div>

                {/* Materials Indicators */}
                <div className="session-card-materials">
                  {(['pre_read', 'class_material', 'worksheet', 'video'] as const).map((type) => {
                    const mat = card.materials.find(m => m.type === type);
                    if (!mat) return null;
                    const available = isMaterialAvailable(mat);
                    return (
                      <div
                        key={type}
                        className={`material-indicator ${available ? 'available' : 'locked'}`}
                        title={`${getMaterialTypeIcon(type)} ${mat.title} — ${available ? 'Available' : `Available ${formatRelativeDate(mat.available_from)}`}`}
                      >
                        <span className="material-indicator-icon">{getMaterialTypeIcon(type)}</span>
                        <span className="material-indicator-label">
                          {type === 'pre_read' && 'Pre-read'}
                          {type === 'class_material' && 'Slides'}
                          {type === 'worksheet' && 'Worksheet'}
                          {type === 'video' && 'Video'}
                        </span>
                        {!available && <span className="material-lock-icon">🔒</span>}
                        {available && <span className="material-check-icon">✓</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Card Footer */}
                {card.status !== 'locked' && (
                  <div className="session-card-footer">
                    <span className="session-card-cta">
                      View Session →
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredCards.length === 0 && (
            <div className="empty-state animate-fade-in-up">
              <div className="empty-state-icon">📚</div>
              <h3 className="empty-state-title">No sessions found</h3>
              <p className="empty-state-text">
                {filter === 'all'
                  ? 'No sessions have been published yet. Check back soon!'
                  : `No ${filter} sessions right now.`}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
