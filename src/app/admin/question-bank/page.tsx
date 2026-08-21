import Link from 'next/link';
import { MockBulkUpload } from '@/components/admin/MockBulkUpload';
import { MockNamespaceMembership } from '@/components/admin/MockNamespaceMembership';
import { MockQuestionEditor } from '@/components/admin/MockQuestionEditor';
import { MockQuestionLifecycle } from '@/components/admin/MockQuestionLifecycle';
import { MockDraftEditor } from '@/components/admin/MockDraftEditor';
import { MockRichContent } from '@/components/admin/MockRichContent';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { createMockAdminClient, listMockQuestions, loadMockQuestionBankReference } from '@/lib/server/mockQuestionBankAdmin';
import './question-bank.css';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) { return typeof value === 'string' ? value : undefined; }

export default async function QuestionBankPage({ searchParams }: { searchParams: SearchParams }) {
  const identity = await requirePortalRole('admin');
  const rawFilters = await searchParams;
  const filters = {
    query: one(rawFilters.query), section: one(rawFilters.section), questionType: one(rawFilters.questionType),
    difficulty: one(rawFilters.difficulty), status: one(rawFilters.status),
  };
  let questions = [] as Awaited<ReturnType<typeof listMockQuestions>>;
  let reference: Awaited<ReturnType<typeof loadMockQuestionBankReference>> = { authorizedNamespaces: [], topics: [], stimuli: [], media: [] };
  let allNamespaces: Array<{ code: string; display_name: string }> = [];
  let loadError = '';
  try {
    const admin = createMockAdminClient();
    const [questionData, referenceData, namespaceResult] = await Promise.all([
      listMockQuestions(filters), loadMockQuestionBankReference(identity.id),
      admin.from('mock_source_namespaces').select('code, display_name').eq('is_active', true).order('code'),
    ]);
    if (namespaceResult.error) throw namespaceResult.error;
    questions = questionData; reference = referenceData; allNamespaces = namespaceResult.data ?? [];
  } catch (error) {
    console.error('Question Bank page load failed:', error);
    loadError = 'Question Bank schema is not available in this environment yet. Apply the authorized Phase 1 migration to Staging, then retry.';
  }

  return <div className="animate-fade-in mock-question-bank">
    <div className="admin-page-header"><div><h1 className="admin-page-title">Question Bank</h1><p className="admin-page-subtitle">Draft, preview, publish, retire and import GMAT mock questions without exposing answer keys to Students.</p></div><Link className="btn btn-secondary" href="#bulk-upload-title">Bulk upload questions</Link></div>
    {loadError && <div className="admin-card mock-status" role="alert">{loadError}</div>}
    {!loadError && <>
      <section className="admin-card mock-workspace-card" aria-labelledby="question-list-title">
        <div className="admin-card-header"><div><h2 className="admin-card-title" id="question-list-title">Question inventory</h2><p className="admin-page-subtitle">Latest 200 ready revisions. Protected answer keys are intentionally absent from this list query.</p></div><span className="badge badge-available">{questions.length} shown</span></div>
        <form className="mock-filter-grid" method="get">
          <label className="mock-field"><span>Question ID</span><input name="query" defaultValue={filters.query} placeholder="Q-PS-…" /></label>
          <label className="mock-field"><span>Section</span><select name="section" defaultValue={filters.section ?? ''}><option value="">All</option><option value="quant">Quant</option><option value="verbal">Verbal</option><option value="data_insights">Data Insights</option></select></label>
          <label className="mock-field"><span>Type</span><select name="questionType" defaultValue={filters.questionType ?? ''}><option value="">All</option>{['PS', 'DS', 'CR', 'RC', 'GI', 'TI', 'MSR', 'TPA'].map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="mock-field"><span>Difficulty</span><select name="difficulty" defaultValue={filters.difficulty ?? ''}><option value="">All</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
          <label className="mock-field"><span>Status</span><select name="status" defaultValue={filters.status ?? ''}><option value="">All</option><option value="draft">Draft</option><option value="published">Published</option><option value="retired">Retired</option></select></label>
          <button className="btn btn-secondary" type="submit">Apply filters</button>
        </form>
        <div className="mock-question-list">{questions.map((question) => <details className="mock-question-row" key={question.revisionId}><summary><span><strong>{question.namespace} · {question.questionType}</strong><code>{question.sourceId}</code></span><span>{question.topic}{question.subtopic ? ` · ${question.subtopic}` : ''}</span><span className={`badge ${question.status === 'published' ? 'badge-available' : question.status === 'retired' ? 'badge-locked' : 'badge-upcoming'}`}>{question.status} r{question.revisionNumber}</span></summary><div className="mock-question-detail"><div><h3>Admin preview</h3><MockRichContent value={question.stem} /><h4>Interaction configuration</h4><pre className="mock-json-preview">{JSON.stringify(question.interaction, null, 2)}</pre>{question.status === 'draft' && <MockDraftEditor revisionId={question.revisionId} stem={question.stem} interaction={question.interaction} sourceReference={question.sourceReference} options={question.options} />}</div><dl><div><dt>Section</dt><dd>{question.section}</dd></div><div><dt>Response</dt><dd>{question.responseType}</dd></div><div><dt>Difficulty</dt><dd>{question.difficulty}</dd></div><div><dt>Source</dt><dd>{question.sourceReference}</dd></div></dl><MockQuestionLifecycle revisionId={question.revisionId} status={question.status} /></div></details>)}{questions.length === 0 && <p className="mock-empty-state">No questions match these filters.</p>}</div>
      </section>
      <MockQuestionEditor namespaces={reference.authorizedNamespaces} topics={reference.topics} stimuli={reference.stimuli} media={reference.media} />
      <MockBulkUpload />
      <MockNamespaceMembership namespaces={allNamespaces} />
    </>}
  </div>;
}
