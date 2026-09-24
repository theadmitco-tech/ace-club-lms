'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MockQuestionType, MockResponseType } from '@/lib/mockQuestionBank/types';

type Namespace = { id: string; code: string; display_name: string };
type Topic = { id: string; label: string; section: string; parent_id: string | null };
type Stimulus = { id: string; sourceId: string; namespace: string; stimulusType: string; content: unknown };
type Media = { id: string; sourceId: string; namespace: string; altText: string };

const TYPE_SECTION: Record<MockQuestionType, string> = { PS: 'quant', DS: 'data_insights', CR: 'verbal', RC: 'verbal', GI: 'data_insights', TI: 'data_insights', MSR: 'data_insights', TPA: 'data_insights' };
const TYPE_RESPONSES: Record<MockQuestionType, MockResponseType[]> = {
  PS: ['single_choice'], DS: ['single_choice'], CR: ['single_choice'], RC: ['single_choice'],
  GI: ['dropdowns', 'single_choice'], TI: ['binary_matrix'], MSR: ['single_choice', 'dropdowns', 'binary_matrix'], TPA: ['two_part_matrix'],
};

function rich(text: string) { return { type: 'doc', version: 1, blocks: [{ type: 'paragraph', children: [{ type: 'text', text }] }] }; }

function defaultOptions(type: MockQuestionType) {
  if (type === 'GI') return [
    { slotId: 'value-1', optionId: 'option-a', displayOrder: 1, label: 'Option A', isCorrect: true },
    { slotId: 'value-1', optionId: 'option-b', displayOrder: 2, label: 'Option B', isCorrect: false },
    { slotId: 'value-2', optionId: 'option-a', displayOrder: 1, label: 'Option A', isCorrect: false },
    { slotId: 'value-2', optionId: 'option-b', displayOrder: 2, label: 'Option B', isCorrect: true },
  ];
  if (type === 'TI') return [
    { slotId: 'row-1', optionId: 'yes', displayOrder: 1, label: 'Yes', isCorrect: true },
    { slotId: 'row-1', optionId: 'no', displayOrder: 2, label: 'No', isCorrect: false },
    { slotId: 'row-2', optionId: 'yes', displayOrder: 1, label: 'Yes', isCorrect: false },
    { slotId: 'row-2', optionId: 'no', displayOrder: 2, label: 'No', isCorrect: true },
  ];
  if (type === 'TPA') return [
    { slotId: 'part-1', optionId: 'value-a', displayOrder: 1, label: 'Value A', isCorrect: true },
    { slotId: 'part-1', optionId: 'value-b', displayOrder: 2, label: 'Value B', isCorrect: false },
    { slotId: 'part-2', optionId: 'value-a', displayOrder: 1, label: 'Value A', isCorrect: false },
    { slotId: 'part-2', optionId: 'value-b', displayOrder: 2, label: 'Value B', isCorrect: true },
  ];
  return ['A', 'B', 'C', 'D', 'E'].map((label, index) => ({ slotId: 'answer', optionId: `opt-${label.toLowerCase()}`, displayOrder: index + 1, label: `Choice ${label}`, isCorrect: index === 0 }));
}

function defaultInteraction(type: MockQuestionType) {
  if (type === 'TI') return { rows: [{ id: 'row-1', label: 'Statement 1' }, { id: 'row-2', label: 'Statement 2' }], columns: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }] };
  if (type === 'TPA') return { columns: [{ id: 'part-1', label: 'Part 1' }, { id: 'part-2', label: 'Part 2' }], selection_rule: 'one_per_column' };
  if (type === 'GI') return { slots: [{ id: 'value-1', kind: 'dropdown' }, { id: 'value-2', kind: 'dropdown' }] };
  return { slots: [{ id: 'answer', kind: 'single_choice' }] };
}

export function MockQuestionEditor({ namespaces, topics, stimuli, media }: { namespaces: Namespace[]; topics: Topic[]; stimuli: Stimulus[]; media: Media[] }) {
  const router = useRouter();
  const [type, setType] = useState<MockQuestionType>('PS');
  const [responseType, setResponseType] = useState<MockResponseType>('single_choice');
  const [namespace, setNamespace] = useState(namespaces[0]?.code ?? '');
  const roots = useMemo(() => topics.filter((topic) => !topic.parent_id && topic.section === TYPE_SECTION[type]), [topics, type]);
  const [topicId, setTopicId] = useState('');
  const activeTopic = roots.find((topic) => topic.id === topicId) ?? roots[0];
  const subtopics = topics.filter((topic) => topic.parent_id === activeTopic?.id);
  const [subtopicId, setSubtopicId] = useState('');
  const [stem, setStem] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [interaction, setInteraction] = useState(JSON.stringify(defaultInteraction('PS'), null, 2));
  const [options, setOptions] = useState(JSON.stringify(defaultOptions('PS'), null, 2));
  const [stimulusMode, setStimulusMode] = useState<'none' | 'existing' | 'new'>('none');
  const [existingStimulusId, setExistingStimulusId] = useState('');
  const [stimulusType, setStimulusType] = useState('passage');
  const [stimulusContent, setStimulusContent] = useState(JSON.stringify(rich('Shared stimulus content'), null, 2));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function changeType(next: MockQuestionType) {
    setType(next); setResponseType(TYPE_RESPONSES[next][0]); setTopicId(''); setSubtopicId('');
    setInteraction(JSON.stringify(defaultInteraction(next), null, 2));
    setOptions(JSON.stringify(defaultOptions(next), null, 2));
    const requiredStimulus: Partial<Record<MockQuestionType, string>> = { RC: 'passage', GI: 'graphic', TI: 'sortable_table', MSR: 'tabbed_content', TPA: 'two_part_context' };
    if (requiredStimulus[next]) {
      setStimulusMode('new'); setStimulusType(requiredStimulus[next]!);
      if (next === 'GI') {
        const asset = media.find((item) => item.namespace === namespace);
        setStimulusContent(JSON.stringify({ asset_id: asset?.sourceId ?? 'ASSET-add-a-ready-protected-asset-first' }, null, 2));
      }
    } else { setStimulusMode('none'); }
  }

  async function save() {
    setBusy(true); setMessage('');
    try {
      const optionRows = JSON.parse(options) as Array<Record<string, unknown>>;
      const payload = {
        namespace, questionType: type, responseType, topic: activeTopic?.label, subtopic: subtopics.find((topic) => topic.id === subtopicId)?.label ?? null,
        difficulty, sourceReference, stem: rich(stem), interaction: JSON.parse(interaction),
        options: optionRows.map((option) => ({ ...option, content: rich(String(option.label ?? '')) })),
        answerConfirmation: 'FOUNDER_CONFIRMED', answerCheck: 'PASS', validationStatus: 'READY',
        existingStimulusId: stimulusMode === 'existing' ? existingStimulusId : null,
        stimulus: stimulusMode === 'new' ? { stimulusType, content: JSON.parse(stimulusContent), config: {} } : null,
      };
      const response = await fetch('/api/admin/mock-questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string; sourceQuestionId?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to create Draft question.');
      setMessage(`Draft ${result.sourceQuestionId} created.`); setStem(''); setSourceReference(''); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create Draft question.'); }
    finally { setBusy(false); }
  }

  return <section className="admin-card mock-workspace-card" aria-labelledby="question-editor-title">
    <div className="admin-card-header"><div><h2 className="admin-card-title" id="question-editor-title">Create question</h2><p className="admin-page-subtitle">Type-aware Draft editor. Stable IDs are generated server-side; publication is a separate lifecycle action.</p></div></div>
    {namespaces.length === 0 ? <p className="mock-status" role="alert">Your Admin account has no active contributor namespace membership.</p> : <div className="mock-form-grid">
      <label className="mock-field"><span>Contributor namespace</span><select value={namespace} onChange={(event) => setNamespace(event.target.value)}>{namespaces.map((item) => <option key={item.id} value={item.code}>{item.code} · {item.display_name}</option>)}</select></label>
      <label className="mock-field"><span>Question type</span><select value={type} onChange={(event) => changeType(event.target.value as MockQuestionType)}>{Object.keys(TYPE_SECTION).map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="mock-field"><span>Response type</span><select value={responseType} onChange={(event) => setResponseType(event.target.value as MockResponseType)}>{TYPE_RESPONSES[type].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="mock-field"><span>Difficulty</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
      <label className="mock-field"><span>Topic</span><select value={activeTopic?.id ?? ''} onChange={(event) => { setTopicId(event.target.value); setSubtopicId(''); }}>{roots.map((topic) => <option key={topic.id} value={topic.id}>{topic.label}</option>)}</select></label>
      <label className="mock-field"><span>Subtopic (optional)</span><select value={subtopicId} onChange={(event) => setSubtopicId(event.target.value)}><option value="">None</option>{subtopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.label}</option>)}</select></label>
      <label className="mock-field mock-field-wide"><span>Question text</span><textarea rows={5} value={stem} onChange={(event) => setStem(event.target.value)} required /></label>
      <label className="mock-field mock-field-wide"><span>Source filename or URL</span><input value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} required /></label>
      <label className="mock-field mock-field-wide"><span>Interaction configuration JSON</span><textarea className="mock-code-input" rows={8} value={interaction} onChange={(event) => setInteraction(event.target.value)} spellCheck={false} /></label>
      <label className="mock-field mock-field-wide"><span>Response options JSON <small>Each row needs slotId, optionId, displayOrder, label and isCorrect.</small></span><textarea className="mock-code-input" rows={14} value={options} onChange={(event) => setOptions(event.target.value)} spellCheck={false} /></label>
      <fieldset className="mock-field mock-field-wide"><legend>Shared stimulus</legend><div className="mock-radio-row">{(['none', 'existing', 'new'] as const).map((mode) => <label key={mode}><input type="radio" name="stimulus-mode" checked={stimulusMode === mode} onChange={() => setStimulusMode(mode)} /> {mode === 'none' ? 'None' : mode === 'existing' ? 'Select existing' : 'Create shared stimulus'}</label>)}</div></fieldset>
      {stimulusMode === 'existing' && <label className="mock-field mock-field-wide"><span>Existing stimulus</span><select value={existingStimulusId} onChange={(event) => setExistingStimulusId(event.target.value)}><option value="">Choose stimulus</option>{stimuli.filter((item) => item.namespace === namespace).map((item) => <option key={item.id} value={item.sourceId}>{item.sourceId} · {item.stimulusType}</option>)}</select></label>}
      {stimulusMode === 'new' && <><label className="mock-field"><span>Stimulus type</span><select value={stimulusType} onChange={(event) => setStimulusType(event.target.value)}><option value="rich_text">Rich text</option><option value="passage">Passage</option><option value="graphic">Graphic</option><option value="sortable_table">Sortable table</option><option value="tabbed_content">Tabbed content</option><option value="two_part_context">Two-part context</option></select></label><label className="mock-field mock-field-wide"><span>Stimulus content JSON</span><textarea className="mock-code-input" rows={10} value={stimulusContent} onChange={(event) => setStimulusContent(event.target.value)} spellCheck={false} /></label></>}
    </div>}
    <div className="mock-action-row"><button className="btn btn-primary" disabled={busy || !namespace || !stem.trim() || !sourceReference.trim() || !activeTopic} onClick={() => void save()}>{busy ? 'Saving…' : 'Save Draft question'}</button></div>
    {message && <p className="mock-status" role="status" aria-live="polite">{message}</p>}
  </section>;
}
