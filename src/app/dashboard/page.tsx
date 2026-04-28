'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { formatDate, formatRelativeDate, getMaterialTypeIcon } from '@/lib/utils';
import './dashboard.css';

interface SessionCard {
  session: any;
  materials: any[];
  status: 'available' | 'locked' | 'upcoming';
}

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

function getSessionStatus(session: any) {
  const sessionDate = new Date(session.session_date);
  const now = new Date();
  const diffDays = (sessionDate.getTime() - now.getTime()) / (1000 * 3600 * 24);

  if (diffDays <= 0) return 'available'; // Past or today
  if (diffDays <= 7) return 'upcoming'; // Within next 7 days
  return 'locked'; // More than 7 days out
}

export default function DashboardPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [sessionCards, setSessionCards] = useState<SessionCard[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'locked'>('all');
  const [dataLoading, setDataLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!authLoading && user?.role === 'admin') {
      router.replace('/admin');
      return;
    }

    async function fetchDashboardData() {
      if (!user) return;
      setDataLoading(true);

      // 1. Get user's enrollment
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id)
        .limit(1);

      if (enrollments && enrollments.length > 0) {
        const courseId = enrollments[0].course_id;

        // 2. Get course details
        const { data: courseData } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
        
        if (courseData) setCourse(courseData);

        // 3. Get sessions and their materials
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('*, materials(*)')
          .eq('course_id', courseId)
          .eq('is_published', true)
          .order('session_number', { ascending: true });

        if (sessionsData) {
          const cards: SessionCard[] = sessionsData.map((session) => {
            const materials = session.materials || [];
            return {
              session,
              materials,
              status: getSessionStatus(session),
            };
          });
          setSessionCards(cards);
        }
      }
      setDataLoading(false);
    }

    if (user && !authLoading) {
      fetchDashboardData();
    }
  }, [user, authLoading, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = authLoading || dataLoading;

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
                {user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
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
                    const matchingMaterials = card.materials.filter(m => m.type === type);
                    const mat = matchingMaterials[0];
                    if (!mat) return null;
                    const available = isMaterialAvailable(mat, card.session);
                    const label =
                      type === 'pre_read'
                        ? `Pre-read${matchingMaterials.length > 1 ? `s (${matchingMaterials.length})` : ''}`
                        : type === 'class_material'
                          ? 'Slides'
                          : type === 'worksheet'
                            ? 'Worksheet'
                            : 'Video';
                    
                    let availabilityText = '';
                    if (!available) {
                      if (type === 'pre_read') {
                        const availableDate = new Date(new Date(card.session.session_date).getTime() - 7 * 24 * 60 * 60 * 1000);
                        availabilityText = `Available ${formatRelativeDate(availableDate.toISOString())}`;
                      } else {
                        availabilityText = `Available after class`;
                      }
                    }

                    return (
                      <div
                        key={type}
                        className={`material-indicator ${available ? 'available' : 'locked'}`}
                        title={`${getMaterialTypeIcon(type)} ${label} — ${available ? 'Available' : availabilityText}`}
                      >
                        <span className="material-indicator-icon">{getMaterialTypeIcon(type)}</span>
                        <span className="material-indicator-label">
                          {label}
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
