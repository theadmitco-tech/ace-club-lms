'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { createClient } from '@/utils/supabase/client';
import type { Material, Session } from '@/lib/types';
import { DEFAULT_CURRICULUM } from '@/lib/curriculum';
import { formatDate, formatRelativeDate } from '@/lib/utils';
import './dashboard.css';

type DashboardSession = Session & {
  materials?: Material[];
};

interface SessionCard {
  session: DashboardSession;
  materials: Material[];
  status: 'available' | 'locked' | 'upcoming';
}

function isMaterialAvailable(material: Material, session: Session) {
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

function getSessionStatus(session: Session) {
  const sessionDate = new Date(session.session_date);
  const now = new Date();
  const diffDays = (sessionDate.getTime() - now.getTime()) / (1000 * 3600 * 24);

  if (diffDays <= 0) return 'available'; // Past or today
  if (diffDays <= 7) return 'upcoming'; // Within next 7 days
  return 'locked'; // More than 7 days out
}

function getMaterialColumnState(materials: Material[], session: Session, type: 'pre_read' | 'worksheet') {
  const matchingMaterials = materials.filter((material) => material.type === type);
  if (matchingMaterials.length === 0) {
    return {
      className: 'none',
      label: 'Not added',
    };
  }

  const availableCount = matchingMaterials.filter((material) => isMaterialAvailable(material, session)).length;
  if (availableCount > 0) {
    return {
      className: 'ready',
      label: availableCount > 1 ? `${availableCount} ready` : 'Ready',
    };
  }

  return {
    className: 'locked',
    label: 'Locked',
  };
}

function getSessionCategory(sessionNumber: number) {
  const category = DEFAULT_CURRICULUM[sessionNumber - 1]?.category;
  if (category === 'Quants') return 'Quant';
  if (category === 'Data Insights') return 'DI';
  return category || 'Class';
}

export default function DashboardPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [sessionCards, setSessionCards] = useState<SessionCard[]>([]);
  const [hasEnrollment, setHasEnrollment] = useState(false);
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

        setHasEnrollment(true);

        // 2. Get sessions and their materials
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

  const firstName = user.full_name.split(' ')[0];
  const now = new Date();
  const nextSessionCard = sessionCards.find((card) => new Date(card.session.session_date) >= now)
    || [...sessionCards].reverse().find((card) => card.status === 'available')
    || null;
  const nextSession = nextSessionCard?.session;
  const nextSessionAvailableMaterials = nextSessionCard
    ? nextSessionCard.materials.filter((material) => isMaterialAvailable(material, nextSessionCard.session))
    : [];
  const availableMaterials = sessionCards.flatMap((card) => (
    card.materials.filter((material) => isMaterialAvailable(material, card.session))
  ));
  const availablePreReadsCount = availableMaterials.filter((material) => material.type === 'pre_read').length;
  const availableWorksheetsCount = availableMaterials.filter((material) => material.type === 'worksheet').length;
  const completedCount = sessionCards.filter((card) => new Date(card.session.session_date) < now).length;
  const remainingCount = Math.max(sessionCards.length - completedCount, 0);
  const currentPosition = nextSession
    ? `Session ${String(nextSession.session_number).padStart(2, '0')}`
    : completedCount > 0
      ? 'Completed'
      : 'Pending';
  const currentSessionNumber = nextSession?.session_number;
  const nextClassCta = nextSessionCard?.status === 'available'
    ? 'Continue Session'
    : nextSessionAvailableMaterials.length > 0
      ? 'Prepare for Class'
      : 'View Next Class';

  return (
    <div className="dashboard">
      {/* Top Navigation */}
      <nav className="dashboard-nav">
        <div className="dashboard-nav-inner">
          <div className="dashboard-nav-brand">
            <div className="nav-logo">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <path d="M16 2L30 9V23L16 30L2 23V9L16 2Z" fill="#003b30" stroke="#003b30" strokeWidth="1.5"/>
                <path d="M16 8L24 12.5V21.5L16 26L8 21.5V12.5L16 8Z" fill="#0f5a4c"/>
                <text x="16" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">A</text>
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
          <section className="student-progress-card animate-fade-in-up stagger-1" aria-label="Course progress">
            <div className="progress-copy">
              <span className="dashboard-eyebrow">Hi {firstName}</span>
              <strong>{currentPosition}</strong>
              <p>{completedCount} done · {remainingCount} left</p>
            </div>

            <div className="session-rail" aria-label={`${completedCount} classes done and ${remainingCount} classes left`}>
              {sessionCards.map((card) => {
                const category = getSessionCategory(card.session.session_number);
                const isDone = new Date(card.session.session_date) < now;
                const isCurrent = card.session.session_number === currentSessionNumber;

                return (
                  <span
                    key={card.session.id}
                    className={`rail-dot category-${category.toLowerCase().replace(' ', '-')} ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                    title={`Session ${card.session.session_number}: ${category}`}
                  />
                );
              })}
            </div>

            <div className="next-action-card">
              {nextSession ? (
                <>
                  <span>Next class</span>
                  <strong>{nextSession.title}</strong>
                  <small>{formatDate(nextSession.session_date)} · {formatRelativeDate(nextSession.session_date)}</small>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => router.push(`/session/${nextSession.id}`)}
                  >
                    {nextClassCta}
                  </button>
                </>
              ) : (
                <>
                  <span>Schedule</span>
                  <strong>{hasEnrollment ? 'Coming soon' : 'No batch yet'}</strong>
                  <small>{hasEnrollment ? 'Your classes will appear once published.' : 'You will see classes after enrollment.'}</small>
                </>
              )}
            </div>

            <div className="prep-tiles" aria-label="Available prep">
              <div className="prep-tile">
                <span>📖</span>
                <strong>{availablePreReadsCount}</strong>
                <small>Pre-reads</small>
              </div>
              <div className="prep-tile">
                <span>✍️</span>
                <strong>{availableWorksheetsCount}</strong>
                <small>Worksheets</small>
              </div>
            </div>
          </section>

          {/* Course Roadmap */}
          <section className="schedule-section animate-fade-in-up stagger-2">
            <div className="section-heading">
              <div>
                <span className="dashboard-eyebrow">Course schedule</span>
                <h1>All classes</h1>
              </div>
              <span className="section-note">{sessionCards.length} session{sessionCards.length === 1 ? '' : 's'}</span>
            </div>

            {sessionCards.length > 0 ? (
              <div className="schedule-table">
                <div className="schedule-header" aria-hidden="true">
                  <span>#</span>
                  <span>Class</span>
                  <span>Section</span>
                  <span>Date</span>
                  <span>Pre-read</span>
                  <span>Worksheet</span>
                  <span>Status</span>
                </div>
                {sessionCards.map((card) => {
                  const unlockedCount = card.materials.filter((material) => isMaterialAvailable(material, card.session)).length;
                  const canOpen = card.status !== 'locked';
                  const isDone = new Date(card.session.session_date) < now;
                  const category = getSessionCategory(card.session.session_number);
                  const preReadState = getMaterialColumnState(card.materials, card.session, 'pre_read');
                  const worksheetState = getMaterialColumnState(card.materials, card.session, 'worksheet');

                  return (
                    <button
                      key={card.session.id}
                      className={`schedule-row ${card.status}`}
                      onClick={() => {
                        if (canOpen) router.push(`/session/${card.session.id}`);
                      }}
                      disabled={!canOpen}
                    >
                      <span className="schedule-number">{String(card.session.session_number).padStart(2, '0')}</span>
                      <span className="schedule-title">
                        <strong>{card.session.title}</strong>
                      </span>
                      <span className={`category-pill category-${category.toLowerCase().replace(' ', '-')}`}>
                        {category}
                      </span>
                      <span className="schedule-date">
                        {formatDate(card.session.session_date)}
                        <small>{formatRelativeDate(card.session.session_date)}</small>
                      </span>
                      <span className={`material-cell ${preReadState.className}`}>
                        <span className="material-cell-dot" />
                        {preReadState.label}
                      </span>
                      <span className={`material-cell ${worksheetState.className}`}>
                        <span className="material-cell-dot" />
                        {worksheetState.label}
                      </span>
                      <span className={`schedule-status ${card.status}`}>
                        {card.status === 'available' && (isDone ? 'Done' : unlockedCount > 0 ? `${unlockedCount} ready` : 'Open')}
                        {card.status === 'locked' && 'Locked'}
                        {card.status === 'upcoming' && 'Upcoming'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state animate-fade-in-up">
                <div className="empty-state-icon">📚</div>
                <h3 className="empty-state-title">No sessions found</h3>
                <p className="empty-state-text">
                  {hasEnrollment
                    ? 'No sessions have been published for this batch yet. Check back soon.'
                    : 'You are not enrolled in a batch yet. Once you are added, your course plan will appear here.'}
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
