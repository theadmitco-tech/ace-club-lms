import Link from 'next/link';
import { MockBulkUpload } from '@/components/admin/MockBulkUpload';
import { MockQuestionLifecycle } from '@/components/admin/MockQuestionLifecycle';
import { MockAnswerKeyEditor } from '@/components/admin/MockAnswerKeyEditor';
import { MockInlinePublish, MockPublishAll } from '@/components/admin/MockPublishActions';
import { MockRichContent } from '@/components/admin/MockRichContent';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { listMockQuestions } from '@/lib/server/mockQuestionBankAdmin';
import './question-bank.css';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) { return typeof value === 'string' ? value : undefined; }
function questionExcerpt(value: unknown, max = 150): string {
  const collect = (input: unknown): string => {
    if (typeof input === 'string' || typeof input === 'number') return String(input);
    if (Array.isArray(input)) return input.map(collect).join(' ');
    if (!input || typeof input !== 'object') return '';
    const node = input as Record<string, unknown>;
    return collect(node.blocks ?? node.children ?? node.content ?? node.text ?? node.value ?? '');
  };
  const text = collect(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default async function QuestionBankPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePortalRole('admin');
  const rawFilters = await searchParams;
  const filters = {
    query: one(rawFilters.query), section: one(rawFilters.section), questionType: one(rawFilters.questionType),
    difficulty: one(rawFilters.difficulty), status: one(rawFilters.status),
  };
  let questions = [] as Awaited<ReturnType<typeof listMockQuestions>>;
  let loadError = '';
  try {
    questions = await listMockQuestions(filters);
  } catch (error) {
    console.error('Question Bank page load failed:', error);
    loadError = 'Question Bank could not be loaded. Retry the page; if the problem continues, check the Preview runtime logs.';
  }

  return <div className="animate-fade-in mock-question-bank">
    <div className="admin-page-header"><div><h1 className="admin-page-title">Question Bank</h1><p className="admin-page-subtitle">Draft, preview, publish, retire and import GMAT mock questions without exposing answer keys to Students.</p></div>{loadError ? <button className="btn btn-secondary" type="button" disabled title="Question Bank must load before bulk upload is available.">Bulk upload questions</button> : <Link className="btn btn-secondary" href="#bulk-upload-title">Bulk upload questions</Link>}</div>
    {loadError && <div className="admin-card mock-status" role="alert">{loadError}</div>}
    {!loadError && <>
      <section className="admin-card mock-workspace-card" aria-labelledby="question-list-title">
        <div className="admin-card-header"><div><h2 className="admin-card-title" id="question-list-title">Question inventory</h2><p className="admin-page-subtitle">Latest 200 ready revisions. Protected answer keys are intentionally absent from this list query.</p></div><div className="mock-action-row"><span className="badge badge-available">{questions.length} shown</span><MockPublishAll revisionIds={questions.filter((question) => question.status === 'draft').map((question) => question.revisionId)} /></div></div>
        <form className="mock-filter-grid" method="get">
          <label className="mock-field"><span>Question ID</span><input name="query" defaultValue={filters.query} placeholder="Q-PS-…" /></label>
          <label className="mock-field"><span>Section</span><select name="section" defaultValue={filters.section ?? ''}><option value="">All</option><option value="quant">Quant</option><option value="verbal">Verbal</option><option value="data_insights">Data Insights</option></select></label>
          <label className="mock-field"><span>Type</span><select name="questionType" defaultValue={filters.questionType ?? ''}><option value="">All</option>{['PS', 'DS', 'CR', 'RC', 'GI', 'TI', 'MSR', 'TPA'].map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="mock-field"><span>Difficulty</span><select name="difficulty" defaultValue={filters.difficulty ?? ''}><option value="">All</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
          <label className="mock-field"><span>Status</span><select name="status" defaultValue={filters.status ?? ''}><option value="">All</option><option value="draft">Draft</option><option value="published">Published</option><option value="retired">Retired</option></select></label>
          <button className="btn btn-secondary" type="submit">Apply filters</button>
        </form>
        <div className="mock-question-list">{questions.map((question) => <details className="mock-question-row" key={question.revisionId}><summary><span><strong>{questionExcerpt(question.stem)}</strong><code>{question.questionType}</code></span><span>{question.topic}{question.subtopic ? ` · ${question.subtopic}` : ''}</span><span className={`badge ${question.status === 'published' ? 'badge-available' : question.status === 'retired' ? 'badge-locked' : 'badge-upcoming'}`}>{question.status} r{question.revisionNumber}</span><MockInlinePublish revisionId={question.revisionId} status={question.status} /></summary><div className="mock-question-detail"><div><h3>Question preview</h3><MockRichContent value={question.stem} /><MockAnswerKeyEditor revisionId={question.revisionId} options={question.options} editable={question.status === 'draft'} /></div><dl><div><dt>Section</dt><dd>{question.section}</dd></div><div><dt>Response</dt><dd>{question.responseType}</dd></div><div><dt>Difficulty</dt><dd>{question.difficulty}</dd></div><div><dt>Source</dt><dd>{question.sourceReference}</dd></div></dl><MockQuestionLifecycle revisionId={question.revisionId} status={question.status} /></div></details>)}{questions.length === 0 && <p className="mock-empty-state">No questions match these filters.</p>}</div>
      </section>
      <MockBulkUpload />
    </>}
  </div>;
}
