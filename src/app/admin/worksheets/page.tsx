'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/lib/AuthContext';
import type {
  MasterWorksheetPlan,
  MasterWorksheetSessionRule,
  WorksheetDailyTarget,
  WorksheetSectionKey,
} from '@/lib/types';
import {
  WORKSHEET_SECTION_LABELS,
  summarizeWorksheetProgress,
  toDateKey,
} from '@/lib/worksheetProgress';
import { getCurriculumWorksheetSection } from '@/lib/curriculum';

interface MasterSessionOption {
  id: string;
  title: string;
  session_number: number;
}

interface CourseOption {
  id: string;
  name: string;
  enrollments?: { id: string; user_id: string; profiles?: { full_name: string; email: string } | null }[];
}

interface RawCourseOption extends Omit<CourseOption, 'enrollments'> {
  enrollments?: { id: string; user_id: string; profiles?: { full_name: string; email: string }[] | { full_name: string; email: string } | null }[];
}

interface RuleDraft {
  enabled: boolean;
  section: WorksheetSectionKey;
  startQuestion: string;
  endQuestion: string;
  dailyTargetCount: string;
}

interface StudentRisk {
  userId: string;
  name: string;
  email: string;
  attempted: number;
  expected: number;
  shortfall: number;
  accuracy: number;
  lastAttemptDate: string | null;
  status: string;
}

interface AttemptStatsRow {
  user_id: string;
  attempted_total: number;
  correct_total: number;
  accuracy: number;
  last_attempt_date: string | null;
  active_today: boolean;
}

function inferSection(title: string): WorksheetSectionKey {
  const normalized = title.toLowerCase();
  if (normalized.includes('data') || normalized.includes('di') || normalized.includes('sufficiency')) return 'di';
  if (normalized.includes('rc') || normalized.includes('cr') || normalized.includes('verbal')) return 'verbal';
  return 'quant';
}

function defaultRuleDraft(session: MasterSessionOption): RuleDraft {
  const curriculumSection = getCurriculumWorksheetSection(session.session_number);

  return {
    enabled: Boolean(curriculumSection),
    section: curriculumSection || inferSection(session.title),
    startQuestion: '1',
    endQuestion: '50',
    dailyTargetCount: '10',
  };
}

export default function AdminWorksheetsPage() {
  const supabase = createClient();
  const { addToast } = useAuth();
  const todayKey = toDateKey(new Date());

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [masterSessions, setMasterSessions] = useState<MasterSessionOption[]>([]);
  const [plan, setPlan] = useState<MasterWorksheetPlan | null>(null);
  const [rules, setRules] = useState<Record<string, RuleDraft>>({});
  const [targets, setTargets] = useState<WorksheetDailyTarget[]>([]);
  const [attemptStats, setAttemptStats] = useState<AttemptStatsRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tablesUnavailable, setTablesUnavailable] = useState(false);
  const [title, setTitle] = useState('GMAT Daily Worksheet Plan');
  const [focusedSessionId, setFocusedSessionId] = useState('');

  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const enrolledStudents = useMemo(() => selectedCourse?.enrollments || [], [selectedCourse]);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, enrollments(id, user_id, profiles(full_name, email))')
      .order('created_at', { ascending: false });

    if (error) {
      addToast('error', 'Failed to load batches.');
      return;
    }

    const nextCourses = ((data || []) as unknown as RawCourseOption[]).map((course) => ({
      ...course,
      enrollments: (course.enrollments || []).map((enrollment) => ({
        ...enrollment,
        profiles: Array.isArray(enrollment.profiles) ? enrollment.profiles[0] || null : enrollment.profiles || null,
      })),
    }));

    setCourses(nextCourses);
    if (!selectedCourseId && nextCourses.length > 0) setSelectedCourseId(nextCourses[0].id);
  };

  const fetchTemplate = async () => {
    setTablesUnavailable(false);
    const [{ data: sessionData, error: sessionError }, { data: planData, error: planError }] = await Promise.all([
      supabase.from('master_sessions').select('id, title, session_number').order('session_number', { ascending: true }),
      supabase
        .from('master_worksheet_plans')
        .select('*, master_worksheet_session_rules(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (sessionError) {
      addToast('error', 'Failed to load master sessions.');
      return;
    }

    if (planError) {
      setTablesUnavailable(true);
      return;
    }

    const nextMasterSessions = (sessionData || []) as MasterSessionOption[];
    setMasterSessions(nextMasterSessions);

    const activePlan = planData as MasterWorksheetPlan | null;
    setPlan(activePlan);
    if (activePlan) setTitle(activePlan.title);

    const existingRules = (activePlan?.master_worksheet_session_rules || []) as MasterWorksheetSessionRule[];
    const nextRules: Record<string, RuleDraft> = {};
    for (const session of nextMasterSessions) {
      const existing = existingRules.find((rule) => rule.master_session_id === session.id);
      nextRules[session.id] = existing
        ? {
            enabled: existing.is_active,
            section: existing.section,
            startQuestion: String(existing.start_question),
            endQuestion: String(existing.end_question),
            dailyTargetCount: String(existing.daily_target_count),
          }
        : defaultRuleDraft(session);
    }
    setRules(nextRules);
  };

  const fetchCourseProgress = async (courseId: string) => {
    if (!courseId) return;
    const [{ data: targetData, error: targetError }, { data: attemptData, error: attemptError }] = await Promise.all([
      supabase
        .from('worksheet_daily_targets')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('target_date', { ascending: true }),
      supabase.rpc('get_course_worksheet_attempt_stats', { p_course_id: courseId }),
    ]);

    if (targetError || attemptError) {
      setTargets([]);
      setAttemptStats([]);
      return;
    }

    setTargets((targetData || []) as WorksheetDailyTarget[]);
    setAttemptStats((attemptData || []) as AttemptStatsRow[]);
  };

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await Promise.all([fetchCourses(), fetchTemplate()]);
      setIsLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedCourseId) fetchCourseProgress(selectedCourseId);
  }, [selectedCourseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (masterSessions.length === 0) return;

    const sessionId = new URLSearchParams(window.location.search).get('session');
    if (!sessionId || !masterSessions.some((session) => session.id === sessionId)) return;

    setFocusedSessionId(sessionId);
    window.setTimeout(() => {
      document.getElementById(`worksheet-rule-${sessionId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100);
  }, [masterSessions]);

  const riskRows = useMemo<StudentRisk[]>(() => {
    return enrolledStudents.map((enrollment) => {
      const stats = attemptStats.find((row) => row.user_id === enrollment.user_id);
      const summary = summarizeWorksheetProgress({
        targets,
        logs: [{
          id: enrollment.user_id,
          target_id: enrollment.user_id,
          course_id: selectedCourseId,
          user_id: enrollment.user_id,
          log_date: todayKey,
          section: 'quant',
          attempted_count: stats?.attempted_total || 0,
          created_at: todayKey,
        }],
      });

      return {
        userId: enrollment.user_id,
        name: enrollment.profiles?.full_name || 'Student',
        email: enrollment.profiles?.email || '',
        attempted: stats?.attempted_total || 0,
        expected: summary.expectedTotal,
        shortfall: summary.shortfall,
        accuracy: Number(stats?.accuracy || 0),
        lastAttemptDate: stats?.last_attempt_date || null,
        status: summary.status,
      };
    });
  }, [attemptStats, enrolledStudents, selectedCourseId, targets, todayKey]);

  const worksheetStats = useMemo(() => {
    const expectedTotal = targets.reduce((sum, target) => target.target_date <= todayKey ? sum + target.target_count : sum, 0);
    const possibleTotal = expectedTotal * Math.max(enrolledStudents.length, 1);
    const attemptedTotal = attemptStats.reduce((sum, row) => sum + Number(row.attempted_total || 0), 0);
    const correctTotal = attemptStats.reduce((sum, row) => sum + Number(row.correct_total || 0), 0);
    const activeToday = attemptStats.filter((row) => row.active_today).length;

    return {
      completionPercent: possibleTotal > 0 ? Math.round((attemptedTotal / possibleTotal) * 100) : 0,
      activeToday,
      classAverage: enrolledStudents.length > 0 ? Math.round(attemptedTotal / enrolledStudents.length) : 0,
      classAccuracy: attemptedTotal > 0 ? Math.round((correctTotal / attemptedTotal) * 100) : 0,
      behindCount: riskRows.filter((row) => row.status === 'behind').length,
      onTrackCount: riskRows.filter((row) => row.status !== 'behind').length,
    };
  }, [attemptStats, enrolledStudents.length, riskRows, targets, todayKey]);

  const updateRule = (sessionId: string, updates: Partial<RuleDraft>) => {
    setRules((current) => ({
      ...current,
      [sessionId]: { ...current[sessionId], ...updates },
    }));
  };

  const saveUniversalPlan = async () => {
    if (!title.trim()) {
      addToast('error', 'Add a plan title.');
      return;
    }

    setIsSaving(true);
    try {
      let planId = plan?.id;
      if (planId) {
        const { error } = await supabase
          .from('master_worksheet_plans')
          .update({ title: title.trim(), updated_at: new Date().toISOString() })
          .eq('id', planId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('master_worksheet_plans')
          .insert({ title: title.trim(), is_active: true })
          .select()
          .single();
        if (error) throw error;
        planId = data.id;
      }

      await supabase.from('master_worksheet_session_rules').delete().eq('plan_id', planId);
      const ruleRows = masterSessions.map((session) => {
        const draft = rules[session.id] || defaultRuleDraft(session);
        return {
          plan_id: planId,
          master_session_id: session.id,
          session_number: session.session_number,
          section: draft.section,
          start_question: Number(draft.startQuestion || 1),
          end_question: Number(draft.endQuestion || 50),
          daily_target_count: Number(draft.dailyTargetCount || 10),
          is_active: draft.enabled,
        };
      });

      const { error: ruleError } = await supabase.from('master_worksheet_session_rules').insert(ruleRows);
      if (ruleError) throw ruleError;

      const { error: syncError } = await supabase.rpc('sync_universal_worksheet_targets');
      if (syncError) throw syncError;

      addToast('success', 'Universal worksheet plan saved and synced to all batches.');
      await fetchTemplate();
      if (selectedCourseId) await fetchCourseProgress(selectedCourseId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save worksheet plan.';
      addToast('error', message);
      console.error(error);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Worksheet Tracker</h1>
          <p className="admin-page-subtitle">Edit the universal worksheet plan and sync it to every batch.</p>
        </div>
      </div>

      {tablesUnavailable && (
        <div className="admin-card" style={{ marginBottom: 'var(--space-xl)', borderColor: 'var(--warning)' }}>
          <h2 className="admin-card-title">Database setup needed</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            Apply the universal worksheet tracker SQL from <code>schema.sql</code> in Supabase, then reload this page.
          </p>
        </div>
      )}

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon">%</div>
          <div className="admin-stat-info">
            <div className="admin-stat-number">{worksheetStats.completionPercent}%</div>
            <div className="admin-stat-label">Batch completion</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">✓</div>
          <div className="admin-stat-info">
            <div className="admin-stat-number">{worksheetStats.activeToday}</div>
            <div className="admin-stat-label">Active today</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">Ø</div>
          <div className="admin-stat-info">
            <div className="admin-stat-number">{worksheetStats.classAverage}</div>
            <div className="admin-stat-label">Class average</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">%</div>
          <div className="admin-stat-info">
            <div className="admin-stat-number">{worksheetStats.classAccuracy}%</div>
            <div className="admin-stat-label">Class accuracy</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">→</div>
          <div className="admin-stat-info">
            <div className="admin-stat-number">{worksheetStats.onTrackCount}</div>
            <div className="admin-stat-label">On track</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">!</div>
          <div className="admin-stat-info">
            <div className="admin-stat-number">{worksheetStats.behindCount}</div>
            <div className="admin-stat-label">Behind</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.8fr)', gap: 'var(--space-xl)', alignItems: 'start' }}>
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Universal plan</h2>
            <span className="badge badge-available">{masterSessions.length} sessions</span>
          </div>

          <div className="admin-form" style={{ maxWidth: '100%' }}>
            <div className="form-group">
              <label className="form-label">Plan title</label>
              <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="worksheet-rule-list">
              {masterSessions.map((session) => {
                const rule = rules[session.id] || defaultRuleDraft(session);
                return (
                  <div
                    key={session.id}
                    id={`worksheet-rule-${session.id}`}
                    className={`worksheet-rule-row ${rule.enabled ? 'enabled' : ''} ${focusedSessionId === session.id ? 'focused' : ''}`}
                  >
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => updateRule(session.id, { enabled: e.target.checked })}
                        style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
                      />
                      S{String(session.session_number).padStart(2, '0')}
                    </label>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{session.title}</div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>50 questions by default</div>
                    </div>
                    <select className="form-input" value={rule.section} onChange={(e) => updateRule(session.id, { section: e.target.value as WorksheetSectionKey })}>
                      {Object.entries(WORKSHEET_SECTION_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <input className="form-input" type="number" min="1" value={rule.startQuestion} onChange={(e) => updateRule(session.id, { startQuestion: e.target.value })} aria-label={`${session.title} start question`} />
                    <input className="form-input" type="number" min="1" value={rule.endQuestion} onChange={(e) => updateRule(session.id, { endQuestion: e.target.value })} aria-label={`${session.title} end question`} />
                    <input className="form-input" type="number" min="1" value={rule.dailyTargetCount} onChange={(e) => updateRule(session.id, { dailyTargetCount: e.target.value })} aria-label={`${session.title} daily target`} />
                  </div>
                );
              })}
            </div>

            <div className="admin-form-actions">
              <button className="btn btn-primary" disabled={isSaving || tablesUnavailable} onClick={saveUniversalPlan}>
                {isSaving ? 'Syncing...' : 'Save & Sync All Batches'}
              </button>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Batch monitor</h2>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
            <label className="form-label">Batch</label>
            <select className="form-input" value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>

          <div className="admin-table-container">
            <table className="admin-table" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Attempted</th>
                  <th>Shortfall</th>
                  <th>Accuracy</th>
                  <th>Last attempt</th>
                </tr>
              </thead>
              <tbody>
                {riskRows.filter((row) => row.status === 'behind').slice(0, 8).map((row) => (
                  <tr key={row.userId}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.name}</div>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{row.email}</div>
                      </td>
                    <td>{row.attempted} / {row.expected}</td>
                    <td>{row.shortfall} q</td>
                    <td>{Math.round(row.accuracy)}%</td>
                    <td>{row.lastAttemptDate || 'No attempts'}</td>
                  </tr>
                ))}
                {riskRows.filter((row) => row.status === 'behind').length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 28 }}>
                      No students are behind by 2 weekdays.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
