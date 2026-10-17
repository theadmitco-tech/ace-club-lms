'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MockRichContent } from './MockRichContent';

type Option = { slotId: string; optionId: string; displayOrder: number; content: unknown };

export function MockAnswerKeyEditor({ revisionId, options, editable }: { revisionId: string; options: Option[]; editable: boolean }) {
  const router = useRouter();
  const slots = [...new Set(options.map((option) => option.slotId))];
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [revealed, setRevealed] = useState<Record<string, string> | null>(null);
  if (!options.length) return null;
  async function save() {
    if (slots.some((slot) => !choices[slot])) { setMessage('Choose one correct option for every response slot.'); return; }
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/mock-questions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revisionId, answerOnly: true, answerChoices: choices }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to save the correct option.');
      setMessage('Correct option saved.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save the correct option.'); }
    finally { setBusy(false); }
  }
  async function reveal() {
    setBusy(true); setMessage('');
    try { const response = await fetch('/api/admin/mock-questions/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revisionId }) }); const result = await response.json() as { answer?: Record<string, string>; error?: string }; if (!response.ok || !result.answer) throw new Error(result.error || 'Unable to reveal the protected answer.'); setRevealed(result.answer); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to reveal the protected answer.'); } finally { setBusy(false); }
  }
  return <div className="mock-answer-editor"><h4>Response options</h4>{slots.map((slot) => <fieldset className="mock-option-group" key={slot}><legend>{slot}</legend>{options.filter((option) => option.slotId === slot).sort((a, b) => a.displayOrder - b.displayOrder).map((option) => <label className="mock-option-choice" key={option.optionId}><input type="radio" name={`${revisionId}-${slot}`} disabled={!editable || busy} checked={choices[slot] === option.optionId} onChange={() => setChoices((current) => ({ ...current, [slot]: option.optionId }))} /><span><MockRichContent value={option.content} />{revealed?.[slot] === option.optionId && <strong className="mock-revealed-answer">Correct answer</strong>}</span></label>)}</fieldset>)}<div className="mock-action-row"><button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void reveal()}>{busy ? 'Working…' : revealed ? 'Refresh answer' : 'Reveal answer'}</button>{editable && <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save selected answer'}</button>}</div>{message && <p className="mock-status" role="status">{message}</p>}</div>;
}
