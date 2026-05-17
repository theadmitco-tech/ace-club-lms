'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { createClient } from '@/utils/supabase/client';
import type { Material, MaterialType, PracticeAttempt, PracticeQuestion, PracticeSet, Session, WorksheetDailyTarget } from '@/lib/types';
import { formatDate, formatRelativeDate, getYouTubeEmbedUrl, getMaterialTypeIcon, getMaterialTypeLabel } from '@/lib/utils';
import {
  getAvailabilityText,
  isMaterialAvailable,
  isSessionPracticeAvailable,
} from '@/lib/sessionAvailability';
import './session.css';

type SessionWithMaterials = Session & {
  materials?: Material[];
};

type PracticeSetWithQuestions = PracticeSet & {
  questions: PracticeQuestion[];
};

type PracticeSource = 'master' | 'legacy';
type TabId = 'pre_reads' | 'practice' | 'recording' | 'class_material';
type PracticeMode = 'today' | 'catchup' | 'all' | 'incorrect' | 'marked';

const TABS: { id: TabId; label: string }[] = [
  { id: 'pre_reads', label: 'Pre-reads' },
  { id: 'practice', label: 'Practice' },
  { id: 'recording', label: 'Recording' },
  { id: 'class_material', label: 'Class Material' },
];

function getIstDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

export default function SessionPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<SessionWithMaterials | null>(null);
  const [practiceSet, setPracticeSet] = useState<PracticeSetWithQuestions | null>(null);
  const [practiceSource, setPracticeSource] = useState<PracticeSource>('legacy');
  const [attemptsByQuestionId, setAttemptsByQuestionId] = useState<Record<string, PracticeAttempt>>({});
  const [practiceUnavailable, setPracticeUnavailable] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(searchParams.get('tab') === 'practice' ? 'practice' : 'pre_reads');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('today');
  const [worksheetTargets, setWorksheetTargets] = useState<WorksheetDailyTarget[]>([]);
  const [markedForReviewIds, setMarkedForReviewIds] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [savingAttempt, setSavingAttempt] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }

    async function fetchSession() {
      if (!user) return;

      setDataLoading(true);
      setWorksheetTargets([]);
      const { data, error } = await supabase
        .from('sessions')
        .select('*, materials(*)')
        .eq('id', sessionId)
        .single();

      if (!error && data) {
        setSession(data);
      }

      try {
        const loadedSession = data as SessionWithMaterials | null;
        if (!loadedSession) throw new Error('Session not found');

        const { data: targetRows, error: targetError } = await supabase
          .from('worksheet_daily_targets')
          .select('*')
          .eq('course_id', loadedSession.course_id)
          .eq('session_id', loadedSession.id)
          .eq('is_active', true)
          .order('target_date', { ascending: true })
          .order('question_start', { ascending: true });

        if (targetError) {
          console.info('Worksheet daily targets are not available yet.', targetError);
        } else {
          setWorksheetTargets((targetRows || []) as WorksheetDailyTarget[]);
        }

        const { data: masterSession, error: masterSessionError } = await supabase
          .from('master_sessions')
          .select('id, title, session_number')
          .eq('session_number', loadedSession.session_number)
          .maybeSingle();

        if (masterSessionError) throw masterSessionError;

        if (masterSession) {
          const { data: masterSets, error: masterSetError } = await supabase
            .from('master_practice_sets')
            .select('*')
            .eq('master_session_id', masterSession.id)
            .order('created_at', { ascending: true })
            .limit(1);

          if (masterSetError) {
            console.info('Master practice tables are not available yet; falling back to legacy practice.', masterSetError);
          }

          const firstMasterSet = !masterSetError ? masterSets?.[0] as PracticeSet | undefined : undefined;
          if (firstMasterSet) {
            const { data: masterQuestions, error: masterQuestionsError } = await supabase
              .from('master_practice_questions')
              .select('*')
              .eq('master_practice_set_id', firstMasterSet.id)
              .order('order_index', { ascending: true });

            if (masterQuestionsError) {
              console.info('Master practice questions are not available yet; falling back to legacy practice.', masterQuestionsError);
            } else {
              const normalizedMasterQuestions = (masterQuestions || []).map((question) => ({
                ...question,
                options: Array.isArray(question.options) ? question.options : [],
              })) as PracticeQuestion[];

              setPracticeSource('master');
              setPracticeSet({ ...firstMasterSet, questions: normalizedMasterQuestions });

              if (normalizedMasterQuestions.length > 0) {
                const { data: masterAttempts } = await supabase
                  .from('master_practice_attempts')
                  .select('*')
                  .eq('user_id', user.id)
                  .eq('session_id', sessionId)
                  .in('master_question_id', normalizedMasterQuestions.map((question) => question.id));

                const attemptsMap = (masterAttempts || []).reduce<Record<string, PracticeAttempt>>((acc, attempt) => {
                  acc[attempt.master_question_id] = attempt as PracticeAttempt;
                  return acc;
                }, {});
                setAttemptsByQuestionId(attemptsMap);
              }

              setPracticeUnavailable(false);
              setDataLoading(false);
              return;
            }
          }
        }

        const { data: sets, error: setError } = await supabase
          .from('practice_sets')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
          .limit(1);

        if (setError) throw setError;

        const firstSet = sets?.[0] as PracticeSet | undefined;
        if (firstSet) {
          const { data: questions, error: questionsError } = await supabase
            .from('practice_questions')
            .select('*')
            .eq('practice_set_id', firstSet.id)
            .order('order_index', { ascending: true });

          if (questionsError) throw questionsError;

          const normalizedQuestions = (questions || []).map((question) => ({
            ...question,
            options: Array.isArray(question.options) ? question.options : [],
          })) as PracticeQuestion[];

          setPracticeSet({ ...firstSet, questions: normalizedQuestions });
          setPracticeSource('legacy');

          if (normalizedQuestions.length > 0) {
            const { data: attempts } = await supabase
              .from('practice_attempts')
              .select('*')
              .eq('user_id', user.id)
              .in('question_id', normalizedQuestions.map((question) => question.id));

            const attemptsMap = (attempts || []).reduce<Record<string, PracticeAttempt>>((acc, attempt) => {
              acc[attempt.question_id] = attempt as PracticeAttempt;
              return acc;
            }, {});
            setAttemptsByQuestionId(attemptsMap);
          }
        }
      } catch (practiceError) {
        console.info('Practice tables are not available yet.', practiceError);
        setPracticeUnavailable(true);
      }

      setDataLoading(false);
    }

    if (user && sessionId) {
      void fetchSession();
    }
  }, [user, authLoading, router, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user || !sessionId) return;

    const storedMarks = window.localStorage.getItem(`practice-review:${user.id}:${sessionId}`);
    if (storedMarks) {
      try {
        setMarkedForReviewIds(JSON.parse(storedMarks));
      } catch {
        setMarkedForReviewIds([]);
      }
    }
  }, [user, sessionId]);

  useEffect(() => {
    if (searchParams.get('tab') === 'practice') {
      setActiveTab('practice');
    }
  }, [searchParams]);

  const isLoading = authLoading || dataLoading;

  if (isLoading || !user || !session) {
    return (
      <div className="session-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const materials = session.materials || [];
  const preReads = materials.filter((m) => m.type === 'pre_read');
  const classMaterial = materials.find((m) => m.type === 'class_material');
  const worksheet = materials.find((m) => m.type === 'worksheet');
  const video = materials.find((m) => m.type === 'video');
  const availableMaterialsCount = materials.filter((m) => isMaterialAvailable(m, session)).length;
  const practiceAvailable = isSessionPracticeAvailable(session);
  const questions = practiceSet?.questions || [];
  const activeQuestion = questions[activeQuestionIndex];
  const getOptionLetter = (option: string, question: PracticeQuestion) => {
    const index = question.options.findIndex((candidate) => candidate === option);
    return index >= 0 ? String.fromCharCode(65 + index) : '';
  };

  const answerMatchesQuestion = (answer: string, question: PracticeQuestion) => {
    const expected = question.correct_answer.trim();
    const selected = answer.trim();
    return selected === expected || getOptionLetter(selected, question) === expected.toUpperCase();
  };

  const isAttemptCorrect = (question: PracticeQuestion) => {
    const attempt = attemptsByQuestionId[question.id];
    return Boolean(attempt && answerMatchesQuestion(attempt.selected_answer, question));
  };

  const attemptedCount = questions.filter((question) => attemptsByQuestionId[question.id]).length;
  const incorrectCount = questions.filter((question) => attemptsByQuestionId[question.id] && !isAttemptCorrect(question)).length;
  const unattemptedCount = Math.max(questions.length - attemptedCount, 0);
  const markedCount = markedForReviewIds.filter((id) => questions.some((question) => question.id === id)).length;
  const todayKey = getIstDateKey(new Date());
  const uniqueWorksheetTargets = Array.from(
    worksheetTargets
      .reduce<Map<string, WorksheetDailyTarget>>((acc, target) => {
        const key = `${target.target_date}:${target.question_start}:${target.question_end}:${target.section}`;
        if (!acc.has(key)) acc.set(key, target);
        return acc;
      }, new Map())
      .values()
  );
  const todayTargets = uniqueWorksheetTargets.filter((target) => target.target_date === todayKey);
  const catchupTargets = uniqueWorksheetTargets.filter((target) => target.target_date < todayKey);
  const getQuestionNumber = (question: PracticeQuestion) => {
    const fallbackIndex = questions.findIndex((candidate) => candidate.id === question.id);
    return question.order_index || fallbackIndex + 1;
  };
  const isQuestionInTargets = (question: PracticeQuestion, targets: WorksheetDailyTarget[]) => {
    const questionNumber = getQuestionNumber(question);
    return targets.some((target) => questionNumber >= target.question_start && questionNumber <= target.question_end);
  };
  const todayTargetQuestions = questions.filter((question) => isQuestionInTargets(question, todayTargets));
  const catchupQuestions = questions.filter((question) => (
    isQuestionInTargets(question, catchupTargets) && !attemptsByQuestionId[question.id]
  ));
  const todayQuestionIds = new Set(todayTargetQuestions.map((question) => question.id));
  const catchupQuestionIds = new Set(catchupQuestions.map((question) => question.id));
  const todayCompletedCount = todayTargetQuestions.filter((question) => attemptsByQuestionId[question.id]).length;
  const todayRemainingCount = Math.max(todayTargetQuestions.length - todayCompletedCount, 0);
  const visibleQuestions = questions.filter((question) => {
    if (practiceMode === 'today') return todayQuestionIds.has(question.id);
    if (practiceMode === 'catchup') return catchupQuestionIds.has(question.id);
    if (practiceMode === 'incorrect') return Boolean(attemptsByQuestionId[question.id] && !isAttemptCorrect(question));
    if (practiceMode === 'marked') return markedForReviewIds.includes(question.id);
    return true;
  });
  const activeVisibleIndex = visibleQuestions.findIndex((question) => question.id === activeQuestion?.id);
  const displayedQuestion = activeVisibleIndex >= 0 ? activeQuestion : visibleQuestions[0] || activeQuestion;
  const displayedQuestionIndex = displayedQuestion ? questions.findIndex((question) => question.id === displayedQuestion.id) : activeQuestionIndex;
  const displayedAttempt = displayedQuestion ? attemptsByQuestionId[displayedQuestion.id] : undefined;
  const currentModeLabel = {
    today: "Today's target",
    all: 'All questions',
    catchup: 'Catch up',
    incorrect: 'Incorrect',
    marked: 'Marked',
  }[practiceMode];

  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const jumpToQuestion = (questionId: string) => {
    const nextIndex = questions.findIndex((question) => question.id === questionId);
    if (nextIndex >= 0) {
      setActiveQuestionIndex(nextIndex);
      setSelectedAnswer('');
    }
  };

  const setModeAndFocus = (mode: PracticeMode) => {
    setPracticeMode(mode);
    const nextVisible = questions.find((question) => {
      if (mode === 'today') return todayQuestionIds.has(question.id);
      if (mode === 'catchup') return catchupQuestionIds.has(question.id);
      if (mode === 'incorrect') return Boolean(attemptsByQuestionId[question.id] && !isAttemptCorrect(question));
      if (mode === 'marked') return markedForReviewIds.includes(question.id);
      return true;
    });
    if (nextVisible) jumpToQuestion(nextVisible.id);
  };

  const toggleMarkedForReview = () => {
    if (!displayedQuestion || !user) return;
    const nextMarks = markedForReviewIds.includes(displayedQuestion.id)
      ? markedForReviewIds.filter((id) => id !== displayedQuestion.id)
      : [...markedForReviewIds, displayedQuestion.id];
    setMarkedForReviewIds(nextMarks);
    window.localStorage.setItem(`practice-review:${user.id}:${sessionId}`, JSON.stringify(nextMarks));
  };

  const moveWithinVisibleQuestions = (direction: -1 | 1) => {
    if (visibleQuestions.length === 0) return;
    const safeIndex = activeVisibleIndex >= 0 ? activeVisibleIndex : 0;
    const nextVisibleIndex = Math.min(Math.max(safeIndex + direction, 0), visibleQuestions.length - 1);
    jumpToQuestion(visibleQuestions[nextVisibleIndex].id);
  };

  const submitAnswer = async () => {
    if (!displayedQuestion || !selectedAnswer || !user) return;

    const isCorrect = answerMatchesQuestion(selectedAnswer, displayedQuestion);
    setSavingAttempt(true);

    const { data, error } = practiceSource === 'master'
      ? await supabase
          .from('master_practice_attempts')
          .upsert({
            course_id: session.course_id,
            session_id: session.id,
            user_id: user.id,
            master_question_id: displayedQuestion.id,
            selected_answer: selectedAnswer,
            is_correct: isCorrect,
            answered_at: new Date().toISOString(),
          }, { onConflict: 'course_id,session_id,user_id,master_question_id' })
          .select()
          .single()
      : await supabase
          .from('practice_attempts')
          .upsert({
            user_id: user.id,
            question_id: displayedQuestion.id,
            selected_answer: selectedAnswer,
            is_correct: isCorrect,
            answered_at: new Date().toISOString(),
          }, { onConflict: 'user_id,question_id' })
          .select()
          .single();

    if (!error && data) {
      setAttemptsByQuestionId((current) => ({
        ...current,
        [displayedQuestion.id]: data as PracticeAttempt,
      }));
    }

    setSavingAttempt(false);
  };

  const renderLockedInline = (type: MaterialType) => (
    <div className="tab-empty">
      <strong>Available {getAvailabilityText(type, session.session_date)}</strong>
      <p>This material unlocks based on the class schedule.</p>
    </div>
  );

  const renderFileAction = (material: Material | undefined, label: string) => {
    if (!material) {
      return (
        <div className="tab-empty">
          <strong>{label} has not been added yet.</strong>
          <p>Check back closer to the class.</p>
        </div>
      );
    }

    if (!isMaterialAvailable(material, session)) return renderLockedInline(material.type);

    return (
      <div className="single-resource">
        <div>
          <span>{getMaterialTypeLabel(material.type)}</span>
          <strong>{material.title}</strong>
        </div>
        {material.file_url ? (
          <div className="resource-actions">
            <a href={material.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Open
            </a>
            <a href={material.file_url} download className="btn btn-secondary">
              Download
            </a>
          </div>
        ) : (
          <span className="resource-missing">File not linked</span>
        )}
      </div>
    );
  };

  return (
    <div className="session-page">
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
          <div className="session-header compact animate-fade-in-up">
            <div className="session-header-top">
              <span className="session-badge">Session {String(session.session_number).padStart(2, '0')}</span>
              <span className="session-date">{formatDate(session.session_date)}</span>
            </div>
            <h1 className="session-title">{session.title}</h1>
            <div className="session-meta">
              <span>{materials.length} material{materials.length !== 1 ? 's' : ''}</span>
              <span>{availableMaterialsCount} available</span>
            </div>
          </div>

          <section className="session-tabs-shell animate-fade-in-up stagger-1">
            <div className="session-tabs" role="tablist" aria-label="Session materials">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`session-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="session-tab-panel">
              {activeTab === 'pre_reads' && (
                <div className="resource-list">
                  {preReads.length > 0 ? preReads.map((preRead) => {
                    const available = isMaterialAvailable(preRead, session);

                    return (
                      <div key={preRead.id} className={`resource-row ${available ? '' : 'locked'}`}>
                        <div className="resource-icon">{getMaterialTypeIcon('pre_read')}</div>
                        <div className="resource-copy">
                          <strong>{preRead.title}</strong>
                          <span>{available ? 'Ready to read' : `Available ${getAvailabilityText('pre_read', session.session_date)}`}</span>
                        </div>
                        {available && preRead.notion_url ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => router.push(`/session/${sessionId}/material/${preRead.id}`)}
                          >
                            Read
                          </button>
                        ) : (
                          <span className="compact-lock">{available ? 'No link' : 'Locked'}</span>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="tab-empty">
                      <strong>No pre-reads yet.</strong>
                      <p>Any assigned readings will appear here by name.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'practice' && (
                <div className="practice-panel">
                  {!practiceAvailable ? (
                    renderLockedInline('worksheet')
                  ) : questions.length > 0 && displayedQuestion ? (
                    <>
                      <div className="practice-overview">
                        <div>
                          <strong>{attemptedCount}</strong>
                          <span>Attempted</span>
                        </div>
                        <div>
                          <strong>{unattemptedCount}</strong>
                          <span>Not attempted</span>
                        </div>
                        <div>
                          <strong>{incorrectCount}</strong>
                          <span>Wrong</span>
                        </div>
                        <div>
                          <strong>{markedCount}</strong>
                          <span>Marked</span>
                        </div>
                      </div>

                      <div className="practice-mode-bar" aria-label="Practice filters">
                        {([
                          ['today', "Today's target"],
                          ['catchup', 'Catch up'],
                          ['all', 'All'],
                          ['incorrect', 'Wrong'],
                          ['marked', 'Marked'],
                        ] as [PracticeMode, string][]).map(([mode, label]) => (
                          <button
                            key={mode}
                            type="button"
                            className={`practice-mode ${practiceMode === mode ? 'active' : ''}`}
                            onClick={() => setModeAndFocus(mode)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                          <div className="practice-map" aria-label="Question overview">
                        {questions.map((question, index) => {
                          const attempt = attemptsByQuestionId[question.id];
                          const attemptCorrect = isAttemptCorrect(question);
                          const isMarked = markedForReviewIds.includes(question.id);
                          const isToday = todayQuestionIds.has(question.id);
                          const isCatchup = catchupQuestionIds.has(question.id);

                          return (
                            <button
                              key={question.id}
                              type="button"
                              className={`practice-map-dot ${displayedQuestion.id === question.id ? 'active' : ''} ${attempt ? 'attempted' : 'unattempted'} ${attempt && !attemptCorrect ? 'wrong' : ''} ${isMarked ? 'marked' : ''} ${isToday ? 'today' : ''} ${isCatchup ? 'catchup' : ''}`}
                              onClick={() => jumpToQuestion(question.id)}
                              title={`Question ${index + 1}`}
                            >
                              {question.order_index || index + 1}
                            </button>
                          );
                        })}
                      </div>

                      {practiceMode === 'today' && (
                        <div className="practice-focus-note">
                          <strong>
                            {todayTargetQuestions.length > 0
                              ? "Today's target comes from the worksheet schedule."
                              : 'No questions from this session are due today.'}
                          </strong>
                          <span>
                            {todayTargetQuestions.length > 0
                              ? `${todayCompletedCount}/${todayTargetQuestions.length} done here. ${todayRemainingCount > 0
                                ? `Finish these ${todayRemainingCount} first.`
                                : 'You are done with today’s work for this session.'}`
                              : catchupQuestions.length > 0
                                ? `This session has ${catchupQuestions.length} overdue unanswered question${catchupQuestions.length === 1 ? '' : 's'} in Catch up.`
                                : 'Use All if you want to review this worksheet.'}
                          </span>
                        </div>
                      )}

                      {practiceMode === 'catchup' && (
                        <div className="practice-focus-note">
                          <strong>Catch up shows overdue unanswered questions for this session.</strong>
                          <span>
                            {catchupQuestions.length > 0
                              ? `${catchupQuestions.length} overdue question${catchupQuestions.length === 1 ? '' : 's'} left here.`
                              : 'Nothing overdue is left in this session.'}
                          </span>
                        </div>
                      )}

                      {visibleQuestions.length === 0 && (
                        <div className="tab-empty">
                          <strong>No questions in {currentModeLabel}.</strong>
                          <p>Switch filters or mark questions for review as you practice.</p>
                        </div>
                      )}

                      {visibleQuestions.length > 0 && (
                        <>
                          <div className="practice-header">
                            <span>{currentModeLabel} · Q{displayedQuestion.order_index || displayedQuestionIndex + 1} · {questions.length} loaded</span>
                            <strong>{practiceSet?.title || 'Practice'}</strong>
                          </div>
                          <div className="practice-question-tools">
                            <span className={`practice-difficulty ${displayedQuestion.difficulty || 'basic'}`}>
                              {displayedQuestion.difficulty === 'advanced' ? 'Advanced' : 'Basic'}
                            </span>
                            <button
                              type="button"
                              className={`review-toggle ${markedForReviewIds.includes(displayedQuestion.id) ? 'active' : ''}`}
                              onClick={toggleMarkedForReview}
                            >
                              {markedForReviewIds.includes(displayedQuestion.id) ? 'Marked for review' : 'Mark for review'}
                            </button>
                          </div>

                          {(displayedQuestion.stimulus_text || displayedQuestion.stimulus_title) && (
                            <div className="practice-stimulus">
                              <span>
                                {displayedQuestion.question_type === 'reading_comprehension'
                                  ? 'Reading passage'
                                  : displayedQuestion.question_type === 'data_insights'
                                    ? 'DI stimulus'
                                    : 'Shared stimulus'}
                              </span>
                              {displayedQuestion.stimulus_title && <strong>{displayedQuestion.stimulus_title}</strong>}
                              {displayedQuestion.stimulus_text && <p>{renderFormattedText(displayedQuestion.stimulus_text)}</p>}
                            </div>
                          )}

                          <div className="practice-question">{renderFormattedText(displayedQuestion.question_text)}</div>

                          {displayedQuestion.options.length > 0 ? (
                            <div className="answer-list">
                              {displayedQuestion.options.map((option) => {
                                const answered = Boolean(displayedAttempt);
                                const selectedValue = displayedAttempt?.selected_answer || selectedAnswer;
                                const isSelected = selectedValue === option || selectedValue.trim().toUpperCase() === getOptionLetter(option, displayedQuestion);
                                const isCorrect = answerMatchesQuestion(option, displayedQuestion);

                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    className={`answer-option ${isSelected ? 'selected' : ''} ${answered && isCorrect ? 'correct' : ''} ${answered && isSelected && !isCorrect ? 'incorrect' : ''}`}
                                    onClick={() => !answered && setSelectedAnswer(option)}
                                    disabled={answered}
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="form-group">
                              <label className="form-label" htmlFor="open-answer">Your answer</label>
                              <input
                                id="open-answer"
                                className="form-input"
                                value={displayedAttempt?.selected_answer || selectedAnswer}
                                onChange={(event) => setSelectedAnswer(event.target.value)}
                                disabled={Boolean(displayedAttempt)}
                                placeholder="Type your answer"
                              />
                            </div>
                          )}

                          {displayedAttempt ? (
                            <div className={`practice-result ${isAttemptCorrect(displayedQuestion) ? 'correct' : 'incorrect'}`}>
                              <strong>{isAttemptCorrect(displayedQuestion) ? 'Correct' : 'Not quite'}</strong>
                              <p>{displayedQuestion.explanation}</p>
                            </div>
                          ) : (
                            <button className="btn btn-primary" onClick={submitAnswer} disabled={!selectedAnswer || savingAttempt}>
                              {savingAttempt ? 'Saving...' : 'Submit Answer'}
                            </button>
                          )}

                          <div className="practice-nav">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                moveWithinVisibleQuestions(-1);
                              }}
                              disabled={activeVisibleIndex <= 0}
                            >
                              Previous
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                moveWithinVisibleQuestions(1);
                              }}
                              disabled={activeVisibleIndex === visibleQuestions.length - 1}
                            >
                              Next
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {practiceUnavailable && (
                        <div className="practice-note">
                          Native Q&A is planned, but the practice tables are not available in this database yet.
                        </div>
                      )}
                      {renderFileAction(worksheet, 'Practice')}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'recording' && (
                <div>
                  {video && isMaterialAvailable(video, session) && video.video_url ? (
                    <div className="video-embed-container">
                      <iframe
                        src={getYouTubeEmbedUrl(video.video_url) || video.video_url}
                        title={video.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="video-embed"
                      />
                    </div>
                  ) : video ? renderLockedInline('video') : (
                    <div className="tab-empty">
                      <strong>No recording yet.</strong>
                      <p>The class recording will appear here once it is uploaded.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'class_material' && renderFileAction(classMaterial, 'Class material')}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
