'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { createClient } from '@/utils/supabase/client';
import type { Material, MaterialType, PracticeAttempt, PracticeQuestion, PracticeSet, Session } from '@/lib/types';
import { formatDate, formatRelativeDate, getYouTubeEmbedUrl, getMaterialTypeIcon, getMaterialTypeLabel } from '@/lib/utils';
import './session.css';

type SessionWithMaterials = Session & {
  materials?: Material[];
};

type PracticeSetWithQuestions = PracticeSet & {
  questions: PracticeQuestion[];
};

type TabId = 'pre_reads' | 'practice' | 'recording' | 'class_material';

const TABS: { id: TabId; label: string }[] = [
  { id: 'pre_reads', label: 'Pre-reads' },
  { id: 'practice', label: 'Practice' },
  { id: 'recording', label: 'Recording' },
  { id: 'class_material', label: 'Class Material' },
];

function isMaterialAvailable(material: Material, session: Session) {
  const sessionDate = new Date(session.session_date);
  const now = new Date();

  if (material.type === 'pre_read') {
    const availableDate = new Date(sessionDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    return now >= availableDate;
  }

  const availableDate = new Date(sessionDate.getTime() + 2 * 60 * 60 * 1000);
  return now >= availableDate;
}

function getAvailabilityText(type: MaterialType, sessionDate: string) {
  if (type === 'pre_read') {
    const availableDate = new Date(new Date(sessionDate).getTime() - 7 * 24 * 60 * 60 * 1000);
    return formatRelativeDate(availableDate.toISOString());
  }

  return 'after class';
}

export default function SessionPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<SessionWithMaterials | null>(null);
  const [practiceSet, setPracticeSet] = useState<PracticeSetWithQuestions | null>(null);
  const [attemptsByQuestionId, setAttemptsByQuestionId] = useState<Record<string, PracticeAttempt>>({});
  const [practiceUnavailable, setPracticeUnavailable] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('pre_reads');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
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
      const { data, error } = await supabase
        .from('sessions')
        .select('*, materials(*)')
        .eq('id', sessionId)
        .single();

      if (!error && data) {
        setSession(data);
      }

      try {
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
  const questions = practiceSet?.questions || [];
  const activeQuestion = questions[activeQuestionIndex];
  const activeAttempt = activeQuestion ? attemptsByQuestionId[activeQuestion.id] : undefined;

  const submitAnswer = async () => {
    if (!activeQuestion || !selectedAnswer || !user) return;

    const isCorrect = selectedAnswer === activeQuestion.correct_answer;
    setSavingAttempt(true);

    const { data, error } = await supabase
      .from('practice_attempts')
      .upsert({
        user_id: user.id,
        question_id: activeQuestion.id,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
      }, { onConflict: 'user_id,question_id' })
      .select()
      .single();

    if (!error && data) {
      setAttemptsByQuestionId((current) => ({
        ...current,
        [activeQuestion.id]: data as PracticeAttempt,
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
                  {questions.length > 0 && activeQuestion ? (
                    <>
                      <div className="practice-header">
                        <span>Question {activeQuestionIndex + 1} of {questions.length}</span>
                        <strong>{practiceSet?.title || 'Practice'}</strong>
                      </div>

                      <div className="practice-question">{activeQuestion.question_text}</div>

                      <div className="answer-list">
                        {activeQuestion.options.map((option) => {
                          const answered = Boolean(activeAttempt);
                          const isSelected = (activeAttempt?.selected_answer || selectedAnswer) === option;
                          const isCorrect = activeQuestion.correct_answer === option;

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

                      {activeAttempt ? (
                        <div className={`practice-result ${activeAttempt.is_correct ? 'correct' : 'incorrect'}`}>
                          <strong>{activeAttempt.is_correct ? 'Correct' : 'Not quite'}</strong>
                          <p>{activeQuestion.explanation}</p>
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
                            setActiveQuestionIndex(Math.max(activeQuestionIndex - 1, 0));
                            setSelectedAnswer('');
                          }}
                          disabled={activeQuestionIndex === 0}
                        >
                          Previous
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setActiveQuestionIndex(Math.min(activeQuestionIndex + 1, questions.length - 1));
                            setSelectedAnswer('');
                          }}
                          disabled={activeQuestionIndex === questions.length - 1}
                        >
                          Next
                        </button>
                      </div>
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
