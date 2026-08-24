'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MockQuestionBody, MockStimulus, mockContentText, type MockMediaAsset } from './MockQuestionContent';
import { SECTION_LABELS, type MockSection } from '@/lib/mockAttempt';
import { formatDuration, type MockDiagnostic } from '@/lib/mockResults';
import type { MockResultItem } from '@/lib/server/mockResults';
import { MockNoteEditor } from './MockNoteEditor';

type Result = Awaited<ReturnType<typeof import('@/lib/server/mockResults').loadMockResult>>;
type ResultTab = 'overall' | MockSection;

const RESULT_TABS: Array<{ id: ResultTab; label: string; longLabel: string }> = [
  { id: 'overall', label: 'Overall', longLabel: 'Overall' },
  { id: 'data_insights', label: 'DI', longLabel: 'Data Insights' },
  { id: 'quant', label: 'QA', longLabel: 'Quantitative Reasoning' },
  { id: 'verbal', label: 'VA', longLabel: 'Verbal Reasoning' },
];

const QUESTION_TYPE_LABELS: Record<string, string> = {
  PS: 'Problem Solving', DS: 'Data Sufficiency', CR: 'Critical Reasoning', RC: 'Reading Comprehension',
  GI: 'Graphics Interpretation', TI: 'Table Analysis', MSR: 'Multi-Source Reasoning', TPA: 'Two-Part Analysis',
};

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

function averageTime(row: MockDiagnostic) { return row.total ? row.timeSpentMs / row.total : 0; }

function DiagnosticTable({ rows }: { rows: MockDiagnostic[] }) {
  return <div className="mock-result-table-wrap"><table className="mock-result-table"><thead><tr><th>Section</th><th>Correct</th><th>Incorrect</th><th>Unanswered</th><th>Accuracy</th><th>Average time/question</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><th scope="row">{SECTION_LABELS[row.label as MockSection] ?? row.label}</th><td>{row.correct}/{row.total}</td><td>{row.incorrect}</td><td>{row.unanswered}</td><td>{row.accuracy}%</td><td>{formatDuration(averageTime(row))}</td></tr>)}</tbody></table></div>;
}

function mediaFor(attemptId: string, admin: boolean, media: unknown[] | undefined): MockMediaAsset[] {
  return (media ?? []).filter((entry): entry is { id: string; alt_text: string; source_external_id: string; usage: string } => Boolean(entry && typeof entry === 'object' && 'id' in entry)).map((asset) => ({ ...asset, url: `${admin ? '/api/admin' : '/api/student'}/mock-attempts/${attemptId}/media/${asset.id}` }));
}

function minutes(milliseconds: number) { return (Math.max(0, milliseconds) / 60000).toFixed(2); }

function PacingChart({ items, sectionLabel }: { items: MockResultItem[]; sectionLabel: string }) {
  const width = 920; const height = 350; const left = 62; const right = 44; const top = 28; const bottom = 62;
  const values = items.map((item) => item.time_spent_ms / 60000);
  const studentAverage = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const maxMinutes = Math.max(3, Math.ceil(Math.max(2, studentAverage, ...values) * 2) / 2);
  const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  const x = (index: number) => left + (items.length === 1 ? plotWidth / 2 : (index / (items.length - 1)) * plotWidth);
  const y = (value: number) => top + plotHeight - (Math.min(value, maxMinutes) / maxMinutes) * plotHeight;
  const ticks = Array.from({ length: Math.round(maxMinutes * 2) + 1 }, (_, index) => index / 2);
  return <figure className="mock-pacing-chart"><figcaption>This chart shows response time in minutes for each {sectionLabel} question. The solid line is the 2-minute pacing guide; the dotted line is your average of {studentAverage.toFixed(2)} minutes per question.</figcaption><div className="mock-chart-scroll"><svg aria-labelledby="pacing-title pacing-description" role="img" viewBox={`0 0 ${width} ${height}`}><title id="pacing-title">{sectionLabel} response time by question</title><desc id="pacing-description">Each question is plotted by response time and marked correct, incorrect, or unanswered.</desc>{ticks.map((tick) => <g key={tick}><line className="mock-chart-gridline" x1={left} x2={width-right} y1={y(tick)} y2={y(tick)}/><text className="mock-chart-y-label" x={left-12} y={y(tick)+4}>{tick.toFixed(tick % 1 ? 1 : 0)}</text></g>)}<line className="mock-chart-guide" x1={left} x2={width-right} y1={y(2)} y2={y(2)}/><line className="mock-chart-average" x1={left} x2={width-right} y1={y(studentAverage)} y2={y(studentAverage)}/><text className="mock-chart-average-label" x={width-right+4} y={y(studentAverage)+4}>Your average</text>{items.map((item, index) => <g className={`mock-chart-point outcome-${item.outcome}`} key={item.id} transform={`translate(${x(index)} ${y(values[index])})`}><circle r="12"/><text aria-hidden="true" textAnchor="middle" y="5">{item.outcome === 'correct' ? '✓' : item.outcome === 'incorrect' ? '×' : '–'}</text><text className="mock-chart-x-label" textAnchor="middle" y={32}>{item.display_order}</text></g>)}<text className="mock-chart-axis-title" textAnchor="middle" x={width/2} y={height-8}>Question number</text><text className="mock-chart-axis-title" textAnchor="middle" transform={`rotate(-90 16 ${height/2})`} x="16" y={height/2}>Response time (minutes)</text></svg></div><div className="mock-chart-legend"><span className="correct">✓ Correct</span><span className="incorrect">× Incorrect</span><span className="unanswered">– Unanswered</span></div></figure>;
}

function QuestionTable({ items, onOpen }: { items: MockResultItem[]; onOpen: (item: MockResultItem, sourceId: string) => void }) {
  return <div className="mock-result-table-wrap"><table className="mock-question-breakdown"><thead><tr><th>Question</th><th>Response time (minutes)</th><th>Performance</th><th>Content domain</th><th>Question type</th></tr></thead><tbody>{items.map((item) => { const sourceId = `question-row-${item.id}`; return <tr className={`outcome-${item.outcome}`} id={sourceId} key={item.id}><td><a href={`#question-${item.section}-${item.display_order}`} onClick={(event) => { event.preventDefault(); onOpen(item, sourceId); }}>{item.display_order}</a></td><td>{minutes(item.time_spent_ms)}</td><td className="mock-performance">{item.outcome}</td><td>{item.subtopic ? `${item.topic} · ${item.subtopic}` : item.topic}</td><td>{QUESTION_TYPE_LABELS[item.question_snapshot.question_type ?? ''] ?? item.question_snapshot.question_type}</td></tr>; })}</tbody></table></div>;
}

function QuestionDetail({ admin, attemptId, item, onBack }: { admin: boolean; attemptId: string; item: MockResultItem; onBack: () => void }) {
  return <section className="mock-result-section mock-question-detail"><button className="mock-question-back" onClick={onBack} type="button">← Back to {SECTION_LABELS[item.section]} questions</button><header><span className="student-eyebrow">{SECTION_LABELS[item.section]}</span><h2>Question {item.display_order}</h2><p>{item.topic}{item.subtopic ? ` · ${item.subtopic}` : ''} · {QUESTION_TYPE_LABELS[item.question_snapshot.question_type ?? ''] ?? item.question_snapshot.question_type} · {minutes(item.time_spent_ms)} minutes</p></header>{item.stimulus_snapshot && <MockStimulus config={item.stimulus_snapshot.config} content={item.stimulus_snapshot.content} kind={item.stimulus_snapshot.kind} media={mediaFor(attemptId, admin, item.stimulus_snapshot.media)} title={item.stimulus_snapshot.title}/>}<MockQuestionBody disabled interaction={item.response_config_snapshot.interaction} media={mediaFor(attemptId, admin, item.question_snapshot.media)} onChange={() => undefined} options={item.response_config_snapshot.options ?? []} response={item.selected_answer} responseType={item.response_config_snapshot.response_type} stem={item.question_snapshot.stem}/><div className="mock-result-answers"><Answer answer={item.selected_answer} item={item} label="Your answer"/><Answer answer={item.correct_answer} item={item} label="Correct answer"/></div>{admin ? <div className="mock-result-admin-note"><strong>Student note</strong><p>{item.note || 'No note added.'}</p></div> : <MockNoteEditor attemptId={attemptId} attemptItemId={item.id} initialNote={item.note}/>}</section>;
}

export function MockResultView({ result, admin = false }: { result: Result; admin?: boolean }) {
  const { overall } = result.summary;
  const [activeTab, setActiveTab] = useState<ResultTab>('overall');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const returnSourceId = useRef<string | null>(null);
  const selectedItem = useMemo(() => result.items.find((item) => item.id === selectedItemId) ?? null, [result.items, selectedItemId]);
  const sectionItems = activeTab === 'overall' ? [] : result.items.filter((item) => item.section === activeTab);

  useEffect(() => {
    const onPopState = () => {
      const state = window.history.state as { mockResultQuestion?: string; resultTab?: ResultTab } | null;
      if (state?.mockResultQuestion) { setActiveTab(state.resultTab ?? 'overall'); setSelectedItemId(state.mockResultQuestion); return; }
      setSelectedItemId(null);
      window.requestAnimationFrame(() => { const sourceId = returnSourceId.current; const source = sourceId ? document.getElementById(sourceId) : null; source?.scrollIntoView({ block: 'center' }); source?.querySelector('a')?.focus(); });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function openQuestion(item: MockResultItem, sourceId: string) {
    returnSourceId.current = sourceId;
    window.history.pushState({ ...window.history.state, mockResultQuestion: item.id, resultTab: activeTab }, '', `#question-${item.section}-${item.display_order}`);
    setSelectedItemId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectTab(tab: ResultTab) { setSelectedItemId(null); setActiveTab(tab); }

  return <div className={`mock-results ${admin ? 'mock-results-admin' : ''}`}>
    <section className="mock-result-hero"><div><span className="student-eyebrow">Completed mock</span><h1>{result.attempt.mock_name}</h1><p>Raw performance from this attempt. This is not an official GMAT score, rank, or prediction.</p></div><div className="mock-result-score"><strong>{overall.correct}/{overall.total}</strong><span>correct · {overall.accuracy}% accuracy</span></div></section>
    <nav aria-label="Result sections" className="mock-result-tabs" role="tablist">{RESULT_TABS.map((tab) => <button aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'active' : ''} key={tab.id} onClick={() => selectTab(tab.id)} role="tab" type="button"><strong>{tab.label}</strong><span>{tab.longLabel}</span></button>)}</nav>
    {selectedItem ? <QuestionDetail admin={admin} attemptId={result.attempt.id} item={selectedItem} onBack={() => window.history.back()}/> : activeTab === 'overall' ? <>
      <section className="mock-result-metrics" aria-label="Attempt summary"><article><span>Average time/question</span><strong>{formatDuration(averageTime(overall))}</strong></article><article><span>Total time</span><strong>{formatDuration(overall.timeSpentMs)}</strong></article><article><span>Incorrect</span><strong>{overall.incorrect}</strong></article><article><span>Unanswered</span><strong>{overall.unanswered}</strong></article></section>
      <section className="mock-result-section"><h2>Section diagnostics</h2><p>Time is shown as the average time spent per question in each section.</p><DiagnosticTable rows={result.summary.sections}/></section>
    </> : <section className="mock-result-section mock-sectional-results"><header><span className="student-eyebrow">Section analysis</span><h2>{SECTION_LABELS[activeTab]}</h2></header><PacingChart items={sectionItems} sectionLabel={SECTION_LABELS[activeTab]}/><h3>Question-wise breakdown</h3><p>Select a question number to review the exact question, your answer, the correct answer, and your note.</p><QuestionTable items={sectionItems} onOpen={openQuestion}/></section>}
  </div>;
}
