'use client';

import { MockQuestionBody, MockStimulus, mockContentText, type MockMediaAsset } from './MockQuestionContent';
import { SECTION_LABELS } from '@/lib/mockAttempt';
import { formatDuration, type MockDiagnostic } from '@/lib/mockResults';
import type { MockResultItem } from '@/lib/server/mockResults';
import { MockNoteEditor } from './MockNoteEditor';

type Result = Awaited<ReturnType<typeof import('@/lib/server/mockResults').loadMockResult>>;

function answerLines(answer: Record<string, string>, options: NonNullable<MockResultItem['response_config_snapshot']['options']>) {
  return Object.entries(answer).map(([slot, optionId]) => {
    const option = options.find((candidate) => candidate.response_slot_id === slot && candidate.option_id === optionId);
    return { slot, text: option ? mockContentText(option.content) : optionId };
  });
}

function Answer({ label, answer, item }: { label: string; answer: Record<string, string>; item: MockResultItem }) {
  const lines = answerLines(answer, item.response_config_snapshot.options ?? []);
  return <div className="mock-result-answer"><strong>{label}</strong>{lines.length ? lines.map((line) => <span key={line.slot}>{line.text}</span>) : <span>Unanswered</span>}</div>;
}

function DiagnosticTable({ rows }: { rows: MockDiagnostic[] }) {
  return <div className="mock-result-table-wrap"><table className="mock-result-table"><thead><tr><th>Area</th><th>Correct</th><th>Incorrect</th><th>Unanswered</th><th>Accuracy</th><th>Time</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><th scope="row">{SECTION_LABELS[row.label as keyof typeof SECTION_LABELS] ?? row.label}</th><td>{row.correct}/{row.total}</td><td>{row.incorrect}</td><td>{row.unanswered}</td><td>{row.accuracy}%</td><td>{formatDuration(row.timeSpentMs)}</td></tr>)}</tbody></table></div>;
}

function mediaFor(attemptId: string, admin: boolean, media: unknown[] | undefined): MockMediaAsset[] {
  return (media ?? []).filter((entry): entry is { id: string; alt_text: string; source_external_id: string; usage: string } => Boolean(entry && typeof entry === 'object' && 'id' in entry)).map((asset) => ({ ...asset, url: `${admin ? '/api/admin' : '/api/student'}/mock-attempts/${attemptId}/media/${asset.id}` }));
}

export function MockResultView({ result, admin = false }: { result: Result; admin?: boolean }) {
  const { overall } = result.summary;
  return <div className={`mock-results ${admin ? 'mock-results-admin' : ''}`}>
    <section className="mock-result-hero"><div><span className="student-eyebrow">Completed mock</span><h1>{result.attempt.mock_name}</h1><p>Raw performance from this attempt. This is not an official GMAT score, rank, or prediction.</p></div><div className="mock-result-score"><strong>{overall.correct}/{overall.total}</strong><span>correct · {overall.accuracy}% accuracy</span></div></section>
    <section className="mock-result-metrics" aria-label="Attempt summary"><article><span>Total time</span><strong>{formatDuration(overall.timeSpentMs)}</strong></article><article><span>Incorrect</span><strong>{overall.incorrect}</strong></article><article><span>Unanswered</span><strong>{overall.unanswered}</strong></article></section>
    <section className="mock-result-section"><h2>Section diagnostics</h2><DiagnosticTable rows={result.summary.sections}/></section>
    <section className="mock-result-section"><h2>Topic diagnostics</h2><DiagnosticTable rows={result.summary.topics}/>{result.summary.subtopics.some((row) => row.label !== 'No subtopic') && <><h3>Subtopics</h3><DiagnosticTable rows={result.summary.subtopics.filter((row) => row.label !== 'No subtopic')}/></>}</section>
    <section className="mock-result-section"><h2>Question review</h2><p>Review the exact question version shown in your attempt, your selected answer, the correct answer, and time spent. Explanations are not included.</p><div className="mock-result-questions">{result.items.map((item) => <details className={`mock-result-question outcome-${item.outcome}`} key={item.id}><summary><span>Question {item.display_order} · {SECTION_LABELS[item.section]}</span><span>{item.outcome} · {formatDuration(item.time_spent_ms)}</span></summary><div className="mock-result-question-body"><div className="mock-result-taxonomy">{item.topic}{item.subtopic ? ` · ${item.subtopic}` : ''} · {item.question_snapshot.question_type}</div>{item.stimulus_snapshot && <MockStimulus config={item.stimulus_snapshot.config} content={item.stimulus_snapshot.content} kind={item.stimulus_snapshot.kind} media={mediaFor(result.attempt.id, admin, item.stimulus_snapshot.media)} title={item.stimulus_snapshot.title}/>}<MockQuestionBody disabled interaction={item.response_config_snapshot.interaction} media={mediaFor(result.attempt.id, admin, item.question_snapshot.media)} onChange={() => undefined} options={item.response_config_snapshot.options ?? []} response={item.selected_answer} responseType={item.response_config_snapshot.response_type} stem={item.question_snapshot.stem}/><div className="mock-result-answers"><Answer answer={item.selected_answer} item={item} label="Your answer"/><Answer answer={item.correct_answer} item={item} label="Correct answer"/></div>{admin ? <div className="mock-result-admin-note"><strong>Student note</strong><p>{item.note || 'No note added.'}</p></div> : <MockNoteEditor attemptId={result.attempt.id} attemptItemId={item.id} initialNote={item.note}/>}</div></details>)}</div></section>
  </div>;
}
