'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { createClient } from '@/utils/supabase/client';
import type { MasterWorksheetPlan, Material, Session, WorksheetDailyTarget } from '@/lib/types';
import { DEFAULT_CURRICULUM, getCurriculumWorksheetSection } from '@/lib/curriculum';
import { formatDate, formatRelativeDate } from '@/lib/utils';
import {
  getSessionStatus,
  isMaterialAvailable,
  isSessionPracticeAvailable,
} from '@/lib/sessionAvailability';
import {
  WORKSHEET_SECTION_LABELS,
  formatWorksheetTargetDate,
  getRankBand,
  summarizeWorksheetProgress,
  toDateKey,
} from '@/lib/worksheetProgress';
import './dashboard.css';

type DashboardSession = Session & {
  materials?: Material[];
};

interface SessionCard {
  session: DashboardSession;
  materials: Material[];
  status: 'available' | 'locked' | 'upcoming';
}

interface WorksheetRankData {
  user_total: number;
  user_correct: number;
  user_accuracy: number;
  class_average: number;
  class_accuracy: number;
  percentile: number | null;
  enrolled_count: number;
  active_today: number;
}

interface WorksheetTargetAttempt {
  target_id: string;
  attempted_count: number;
  correct_count: number;
}

interface WorksheetAttemptRow {
  answered_at: string;
  is_correct: boolean | null;
  session_id: string | null;
}

type WorksheetTargetWithSession = WorksheetDailyTarget & {
  sessions?: Pick<Session, 'id' | 'title' | 'session_number' | 'session_date'> | null;
};

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
  const [courseId, setCourseId] = useState<string | null>(null);
  const [worksheetPlan, setWorksheetPlan] = useState<MasterWorksheetPlan | null>(null);
  const [worksheetTargets, setWorksheetTargets] = useState<WorksheetTargetWithSession[]>([]);
  const [worksheetTargetAttempts, setWorksheetTargetAttempts] = useState<Record<string, WorksheetTargetAttempt>>({});
  const [worksheetAttemptDates, setWorksheetAttemptDates] = useState<string[]>([]);
  const [worksheetAttemptRows, setWorksheetAttemptRows] = useState<WorksheetAttemptRow[]>([]);
  const [worksheetRank, setWorksheetRank] = useState<WorksheetRankData | null>(null);
  const [worksheetUnavailable, setWorksheetUnavailable] = useState(false);

  const supabase = createClient();

  const loadWorksheetData = async (batchId: string, studentId: string) => {
    try {
      setWorksheetUnavailable(false);
      const { data: planData, error: planError } = await supabase
        .from('master_worksheet_plans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planError) throw planError;
      const activePlan = planData as MasterWorksheetPlan | null;
      setWorksheetPlan(activePlan);

      if (!activePlan) {
        setWorksheetTargets([]);
        setWorksheetTargetAttempts({});
        setWorksheetAttemptDates([]);
        setWorksheetAttemptRows([]);
        setWorksheetRank(null);
        return;
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const [
        { data: targetsData, error: targetsError },
        { data: targetAttemptsData, error: targetAttemptsError },
        { data: rankData, error: rankError },
        { data: attemptDateData, error: attemptDateError },
        { data: attemptRowsData, error: attemptRowsError },
      ] = await Promise.all([
        supabase
          .from('worksheet_daily_targets')
          .select('*, sessions(id, title, session_number, session_date)')
          .eq('course_id', batchId)
          .eq('is_active', true)
          .order('target_date', { ascending: true }),
        supabase.rpc('get_student_worksheet_target_attempts', {
          p_course_id: batchId,
        }),
        supabase.rpc('get_student_worksheet_attempt_rank', {
          p_course_id: batchId,
        }),
        supabase
          .from('master_practice_attempts')
          .select('answered_at')
          .eq('course_id', batchId)
          .eq('user_id', studentId),
        supabase
          .from('master_practice_attempts')
          .select('answered_at, is_correct, session_id')
          .eq('course_id', batchId)
          .eq('user_id', studentId)
          .gte('answered_at', sevenDaysAgo.toISOString()),
      ]);

      if (targetsError) throw targetsError;
      if (targetAttemptsError) throw targetAttemptsError;
      if (attemptDateError) throw attemptDateError;
      if (attemptRowsError) throw attemptRowsError;

      const nextTargets = (targetsData || []) as WorksheetTargetWithSession[];
      setWorksheetTargets(nextTargets);
      setWorksheetTargetAttempts(
        ((targetAttemptsData || []) as WorksheetTargetAttempt[]).reduce<Record<string, WorksheetTargetAttempt>>((acc, row) => {
          acc[row.target_id] = row;
          return acc;
        }, {})
      );
      setWorksheetAttemptDates(
        Array.from(new Set(((attemptDateData || []) as WorksheetAttemptRow[]).map((attempt) => attempt.answered_at.slice(0, 10))))
      );
      setWorksheetAttemptRows((attemptRowsData || []) as WorksheetAttemptRow[]);

      if (!rankError && rankData?.[0]) {
        setWorksheetRank(rankData[0] as WorksheetRankData);
      } else {
        setWorksheetRank(null);
      }
    } catch (error) {
      console.info('Worksheet tracker is not available yet.', error);
      setWorksheetUnavailable(true);
      setWorksheetPlan(null);
      setWorksheetTargets([]);
      setWorksheetTargetAttempts({});
      setWorksheetAttemptDates([]);
      setWorksheetAttemptRows([]);
      setWorksheetRank(null);
    }
  };

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
        setCourseId(courseId);

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

        await loadWorksheetData(courseId, user.id);
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
  const todayKey = toDateKey(new Date());
  const eligibleSectionsBySessionId = new Map(
    sessionCards
      .filter((card) => card.session.session_number > 1 && isSessionPracticeAvailable(card.session, now))
      .map((card) => [card.session.id, getCurriculumWorksheetSection(card.session.session_number)])
      .filter((entry): entry is [string, 'quant' | 'verbal' | 'di'] => Boolean(entry[1]))
  );
  const eligibleWorksheetTargets = Array.from(
    worksheetTargets
      .filter((target) => {
        const sessionSection = target.sessions
          ? getCurriculumWorksheetSection(target.sessions.session_number)
          : eligibleSectionsBySessionId.get(target.session_id);
        const sessionAvailable = target.sessions
          ? target.sessions.session_number > 1 && isSessionPracticeAvailable(target.sessions as Session, now)
          : eligibleSectionsBySessionId.has(target.session_id);
        return sessionAvailable && sessionSection === target.section;
      })
      .reduce<Map<string, WorksheetTargetWithSession>>((acc, target) => {
        const key = `${target.session_id}:${target.section}:${target.target_date}:${target.question_start}:${target.question_end}`;
        if (!acc.has(key)) acc.set(key, target);
        return acc;
      }, new Map())
      .values()
  );
  const todayWorksheetTargets = eligibleWorksheetTargets.filter((target) => target.target_date === todayKey);
  const worksheetAttemptLogs = eligibleWorksheetTargets
    .map((target) => ({
      id: target.id,
      target_id: target.id,
      course_id: target.course_id,
      user_id: user.id,
      log_date: target.target_date,
      section: target.section,
      attempted_count: worksheetTargetAttempts[target.id]?.attempted_count || 0,
      created_at: target.created_at,
    }));
  const worksheetSummary = summarizeWorksheetProgress({ targets: eligibleWorksheetTargets, logs: worksheetAttemptLogs });
  const rankBand = getRankBand(worksheetRank?.percentile ?? null);
  const classAverage = worksheetRank ? Math.round(Number(worksheetRank.class_average || 0)) : null;
  const classAccuracy = worksheetRank ? Math.round(Number(worksheetRank.class_accuracy || 0)) : null;
  const userAccuracy = worksheetRank ? Math.round(Number(worksheetRank.user_accuracy || 0)) : 0;
  const attemptStreak = (() => {
    const attemptDateSet = new Set(worksheetAttemptDates);
    let streak = 0;
    const cursor = new Date();
    while (cursor.getDay() === 0 || cursor.getDay() === 6) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (attemptDateSet.has(toDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      while (cursor.getDay() === 0 || cursor.getDay() === 6) {
        cursor.setDate(cursor.getDate() - 1);
      }
    }
    return streak;
  })();
  const completionPercent = Math.min(100, Math.max(0, worksheetSummary.completionPercent));
  const todayExpectedTotal = todayWorksheetTargets.reduce((sum, target) => sum + target.target_count, 0);
  const todayAttemptedTotal = todayWorksheetTargets.reduce(
    (sum, target) => sum + (worksheetTargetAttempts[target.id]?.attempted_count || 0),
    0
  );
  const todayCompletionPercent = todayExpectedTotal > 0
    ? Math.min(100, Math.round((todayAttemptedTotal / todayExpectedTotal) * 100))
    : 0;
  const nextWorksheetTarget = todayWorksheetTargets.find((target) => (
    (worksheetTargetAttempts[target.id]?.attempted_count || 0) < target.target_count
  )) || todayWorksheetTargets[0] || eligibleWorksheetTargets.find((target) => target.target_date >= todayKey);
  const catchupTargets = eligibleWorksheetTargets
    .filter((target) => (
      target.target_date < todayKey
      && (worksheetTargetAttempts[target.id]?.attempted_count || 0) < target.target_count
    ))
    .slice(0, 3);
  const primaryPracticeTarget = catchupTargets[0] || nextWorksheetTarget;
  const primaryPracticeAttempted = primaryPracticeTarget
    ? worksheetTargetAttempts[primaryPracticeTarget.id]?.attempted_count || 0
    : todayAttemptedTotal;
  const primaryPracticeTotal = primaryPracticeTarget?.target_count || todayExpectedTotal;
  const primaryPracticePercent = primaryPracticeTotal > 0
    ? Math.min(100, Math.round((primaryPracticeAttempted / primaryPracticeTotal) * 100))
    : 0;
  const primaryPracticeDateLabel = primaryPracticeTarget
    ? formatWorksheetTargetDate(primaryPracticeTarget.target_date)
    : '';
  const getPracticeHref = (target: WorksheetDailyTarget) => `/session/${target.session_id}?tab=practice`;
  const sevenDayActivity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dateKey = toDateKey(date);
    const attempts = worksheetAttemptRows.filter((attempt) => attempt.answered_at.slice(0, 10) === dateKey);
    return {
      dateKey,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      attempted: attempts.length,
      correct: attempts.filter((attempt) => attempt.is_correct).length,
    };
  });
  const maxDailyAttempts = Math.max(1, ...sevenDayActivity.map((day) => day.attempted));
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (completionPercent / 100) * ringCircumference;
  const classAttemptPercent = classAverage && worksheetSummary.expectedTotal > 0
    ? Math.min(100, Math.round((classAverage / worksheetSummary.expectedTotal) * 100))
    : 0;
  const classAccuracyValue = classAccuracy ?? 0;
  const statusDetail = worksheetSummary.status === 'behind'
    ? `${worksheetSummary.shortfall} questions behind expected pace`
    : worksheetSummary.status === 'ahead'
      ? "Ahead of today's expected pace"
      : 'On pace for today';

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
          {worksheetPlan && !worksheetUnavailable && (
            <section className="worksheet-tracker-card animate-fade-in-up" aria-label="Daily worksheet progress">
              <div className="worksheet-tracker-header">
                <div>
                  <span className="dashboard-eyebrow">Daily worksheet</span>
                  <h1>{worksheetPlan.title}</h1>
                  <p>{statusDetail}</p>
                </div>
                <span className={`worksheet-status-pill ${worksheetSummary.status}`}>
                  {worksheetSummary.status === 'ahead' ? 'Ahead' : worksheetSummary.status === 'behind' ? 'Behind' : 'On track'}
                </span>
              </div>

              <div className="worksheet-hero-grid">
                <div className="worksheet-overview-panel">
                  <div className="worksheet-ring-wrap" aria-label={`${completionPercent}% complete against expected work`}>
                    <svg className="worksheet-ring" viewBox="0 0 108 108" role="img">
                      <circle cx="54" cy="54" r={ringRadius} className="worksheet-ring-base" />
                      <circle
                        cx="54"
                        cy="54"
                        r={ringRadius}
                        className="worksheet-ring-progress"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                      />
                    </svg>
                    <div className="worksheet-ring-center">
                      <strong>{completionPercent}%</strong>
                      <span>complete</span>
                    </div>
                  </div>

                  <div className="worksheet-kpi-stack">
                    <div>
                      <span>Attempted</span>
                      <strong>{worksheetSummary.attemptedTotal}</strong>
                    </div>
                    <div>
                      <span>Expected today</span>
                      <strong>{worksheetSummary.expectedTotal}</strong>
                    </div>
                    <div>
                      <span>{worksheetSummary.shortfall > 0 ? 'Behind' : 'Pace buffer'}</span>
                      <strong>{worksheetSummary.shortfall > 0 ? worksheetSummary.shortfall : Math.max(worksheetSummary.attemptedTotal - worksheetSummary.expectedTotal, 0)}</strong>
                    </div>
                  </div>
                </div>

                <div className="worksheet-focus-panel">
                  <div>
                    <span className="worksheet-panel-label">Next target</span>
                    <strong>{primaryPracticeTarget ? primaryPracticeTarget.range_label : `${todayAttemptedTotal}/${todayExpectedTotal}`}</strong>
                    <p>
                      {primaryPracticeTarget
                        ? `${WORKSHEET_SECTION_LABELS[primaryPracticeTarget.section]} due ${primaryPracticeDateLabel}`
                        : 'No practice target scheduled'}
                    </p>
                  </div>
                  <div className="worksheet-progress-track" aria-hidden="true">
                    <span style={{ width: `${primaryPracticePercent}%` }} />
                  </div>
                  {primaryPracticeTarget ? (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => router.push(getPracticeHref(primaryPracticeTarget))}
                    >
                      Practice next target
                    </button>
                  ) : (
                    <button className="btn btn-secondary btn-sm" disabled>
                      No practice due
                    </button>
                  )}
                </div>

                <div className="worksheet-compare-panel">
                  <div className="worksheet-compare-row">
                    <span>Class comparison</span>
                    <strong>{classAverage === null ? 'Pending' : `${classAverage} questions`}</strong>
                  </div>
                  <div className="worksheet-comparison-group" aria-label="Student pace compared with class average pace">
                    <span className="worksheet-comparison-title">Pace</span>
                    <div className="worksheet-comparison-bars">
                      <div>
                        <span>You</span>
                        <strong>{worksheetSummary.attemptedTotal}/{worksheetSummary.expectedTotal}</strong>
                        <div className="worksheet-progress-track">
                          <span style={{ width: `${completionPercent}%` }} />
                        </div>
                      </div>
                      <div>
                        <span>Class</span>
                        <strong>{classAverage === null ? 'Pending' : `${classAverage}/${worksheetSummary.expectedTotal}`}</strong>
                        <div className="worksheet-progress-track muted">
                          <span style={{ width: `${classAttemptPercent}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="worksheet-comparison-group" aria-label="Student accuracy compared with class average accuracy">
                    <span className="worksheet-comparison-title">Accuracy</span>
                    <div className="worksheet-comparison-bars">
                      <div>
                        <span>You</span>
                        <strong>{userAccuracy}%</strong>
                        <div className="worksheet-progress-track">
                          <span style={{ width: `${userAccuracy}%` }} />
                        </div>
                      </div>
                      <div>
                        <span>Class</span>
                        <strong>{classAccuracy === null ? 'Pending' : `${classAccuracyValue}%`}</strong>
                        <div className="worksheet-progress-track muted">
                          <span style={{ width: `${classAccuracyValue}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="worksheet-rank-row">
                    <span>{rankBand}</span>
                    <strong>{attemptStreak} day study streak</strong>
                  </div>
                </div>
              </div>

              <div className="worksheet-analytics-grid">
                <div className="worksheet-chart-card">
                  <div className="worksheet-chart-heading">
                    <span>7-day activity</span>
                    <strong>{sevenDayActivity.reduce((sum, day) => sum + day.attempted, 0)} attempts</strong>
                  </div>
                  <div className="worksheet-bars" aria-label="Attempts over the last seven days">
                    {sevenDayActivity.map((day) => {
                      const height = Math.max(day.attempted > 0 ? 8 : 2, Math.round((day.attempted / maxDailyAttempts) * 72));
                      const correctHeight = day.attempted > 0 ? Math.round((day.correct / day.attempted) * height) : 0;

                      return (
                        <div key={day.dateKey} className="worksheet-day-bar">
                          <div className="worksheet-day-column" title={`${day.attempted} attempted, ${day.correct} correct`}>
                            <span className="worksheet-day-fill" style={{ height: `${height}px` }}>
                              <span className="worksheet-day-correct" style={{ height: `${correctHeight}px` }} />
                            </span>
                          </div>
                          <span>{day.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </section>
          )}

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
