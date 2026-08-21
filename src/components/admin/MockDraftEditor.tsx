'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Option = { slotId: string; optionId: string; displayOrder: number; content: unknown; isCorrect: boolean };

export function MockDraftEditor({ revisionId, stem, interaction, sourceReference, options }: { revisionId: string; stem: unknown; interaction: unknown; sourceReference: string; options: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stemJson, setStemJson] = useState(JSON.stringify(stem, null, 2));
  const [interactionJson, setInteractionJson] = useState(JSON.stringify(interaction, null, 2));
  const [optionsJson, setOptionsJson] = useState(JSON.stringify(options, null, 2));
  const [source, setSource] = useState(sourceReference);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/mock-questions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revisionId, stem: JSON.parse(stemJson), interaction: JSON.parse(interactionJson), options: JSON.parse(optionsJson), sourceReference: source, validationNotes: 'Edited in Admin Question Editor' }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to save Draft.');
      setMessage('Draft saved.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save Draft.'); }
    finally { setBusy(false); }
  }
  return <div className="mock-draft-editor"><button className="btn btn-secondary btn-sm" onClick={() => setOpen((value) => !value)}>{open ? 'Close editor' : 'Edit Draft'}</button>{open && <div className="mock-draft-editor-fields"><label className="mock-field"><span>Question RichContentV1 JSON</span><textarea className="mock-code-input" rows={10} value={stemJson} onChange={(event) => setStemJson(event.target.value)} spellCheck={false} /></label><label className="mock-field"><span>Interaction JSON</span><textarea className="mock-code-input" rows={8} value={interactionJson} onChange={(event) => setInteractionJson(event.target.value)} spellCheck={false} /></label><label className="mock-field"><span>Options and protected correct flags</span><textarea className="mock-code-input" rows={14} value={optionsJson} onChange={(event) => setOptionsJson(event.target.value)} spellCheck={false} /></label><label className="mock-field"><span>Source filename or URL</span><input value={source} onChange={(event) => setSource(event.target.value)} /></label><div className="mock-action-row"><button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save Draft changes'}</button></div>{message && <p className="mock-status" role="status">{message}</p>}</div>}</div>;
}
