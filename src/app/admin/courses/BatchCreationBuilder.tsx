'use client';

import { useMemo, useState, useTransition } from 'react';
import { buildBatchProposal, type BatchProposal, type BatchPublicationState } from '@/lib/batchSchedule';
import type { CourseTemplate } from '@/lib/courseTemplates';
import { confirmBatchAction } from './actions';

type Props = {
  templates: CourseTemplate[];
  onCreated: (message: string) => void;
  onError: (message: string) => void;
  onCancel: () => void;
};

function localDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

export default function BatchCreationBuilder({ templates, onCreated, onError, onCancel }: Props) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [publicationState, setPublicationState] = useState<BatchPublicationState>('draft');
  const [proposal, setProposal] = useState<BatchProposal | null>(null);
  const [token, setToken] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const template = useMemo(() => templates.find((item) => item.id === templateId), [templateId, templates]);

  const input = template ? {
    name,
    startDate,
    publicationState,
    templateId: template.id,
    expectedRevisionId: template.revisionId,
    idempotencyKey: token,
  } : null;

  function review() {
    if (!template || !input) return;
    try {
      setProposal(buildBatchProposal(template, input));
      setError('');
    } catch (reason) {
      setProposal(null);
      setError(reason instanceof Error ? reason.message : 'Unable to build the proposal.');
    }
  }

  function confirm() {
    if (!proposal || !input) return;
    startTransition(async () => {
      const result = await confirmBatchAction(input);
      if (result.status === 'error') {
        setError(result.message);
        onError(result.message);
        return;
      }
      onCreated(result.message);
      setProposal(null);
      setToken(crypto.randomUUID());
      onCancel();
    });
  }

  return (
    <div className="admin-card animate-fade-in-up" style={{ marginBottom: 'var(--space-xl)' }}>
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Create batch from template</h2>
          <p className="admin-page-subtitle">Review writes nothing. Confirmation uses the selected immutable revision and Asia/Kolkata.</p>
        </div>
      </div>
      <div className="admin-form">
        <div className="form-group">
          <label className="form-label" htmlFor="batch-template">Course template</label>
          <select id="batch-template" className="form-input" value={templateId} onChange={(event) => { setTemplateId(event.target.value); setProposal(null); }}>
            {templates.map((item) => <option key={item.id} value={item.id}>{item.name} · revision {item.revisionNumber}</option>)}
          </select>
        </div>
        <div className="admin-form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="new-batch-name">Batch name</label>
            <input id="new-batch-name" className="form-input" value={name} maxLength={120} onChange={(event) => { setName(event.target.value); setProposal(null); }} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-batch-start">Start date</label>
            <input id="new-batch-start" className="form-input" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setProposal(null); }} />
          </div>
        </div>
        <fieldset className="form-group" style={{ border: 0, padding: 0 }}>
          <legend className="form-label">Initial publication</legend>
          <label style={{ marginRight: 20 }}><input type="radio" checked={publicationState === 'draft'} onChange={() => { setPublicationState('draft'); setProposal(null); }} /> Draft</label>
          <label><input type="radio" checked={publicationState === 'published'} onChange={() => { setPublicationState('published'); setProposal(null); }} /> Published</label>
        </fieldset>
        {error && <p role="alert" style={{ color: 'var(--error)' }}>{error}</p>}
        <div className="admin-form-actions">
          <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" type="button" onClick={review}>Review complete schedule</button>
        </div>
      </div>
      {proposal && (
        <div className="admin-form" aria-label="Batch schedule proposal">
          <h3>{proposal.events.length} events · {proposal.templateName} revision {proposal.revisionNumber}</h3>
          <p className="admin-page-subtitle">{proposal.startDate} · Asia/Kolkata · {proposal.publicationState}</p>
          <div className="admin-card" aria-label="Inherited reusable resources">
            <strong>{proposal.resources.length} reusable resource{proposal.resources.length === 1 ? '' : 's'}</strong>
            {proposal.resources.length === 0 ? <p className="master-content-empty">None configured.</p> : (
              <ul>{proposal.resources.map((resource) => <li key={resource.key}>{resource.title} · {resource.type.replace('_', ' ')} · {resource.scope}{resource.sectionKey ? ` · ${resource.sectionKey}` : ''}{resource.eventKey ? ` · ${resource.eventKey}` : ''}</li>)}</ul>
            )}
          </div>
          <div className="admin-table-container" style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table className="admin-table">
              <thead><tr><th>#</th><th>Event</th><th>Type / Section</th><th>Date and time (IST)</th><th>Instructor</th><th>Resources</th><th>State</th></tr></thead>
              <tbody>{proposal.events.map((event) => (
                <tr key={event.key}>
                  <td>{event.displayOrder}</td><td><strong>{event.title}</strong>{event.venue && <div>{event.venue}</div>}</td>
                  <td>{event.eventType.replace('_', ' ')}<div>{event.sectionTitle}</div></td>
                  <td>{localDateTime(event.startsAt)}<div>{Math.round((new Date(event.endsAt).valueOf() - new Date(event.startsAt).valueOf()) / 60000)} minutes</div></td>
                  <td>{event.instructor || '—'}</td><td>{event.resources.length ? event.resources.map((resource) => resource.title).join(', ') : 'None'}</td>
                  <td>{event.isPublished ? 'Published' : 'Draft'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="admin-form-actions">
            <button className="btn btn-secondary" type="button" disabled={pending} onClick={() => setProposal(null)}>Back to edit</button>
            <button className="btn btn-primary" type="button" disabled={pending} onClick={confirm}>{pending ? 'Creating…' : 'Confirm batch creation'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
