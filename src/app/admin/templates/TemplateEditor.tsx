'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import {
  COURSE_TEMPLATE_EVENT_TYPES,
  formatTemplateEventType,
  normalizeNotionInput,
  validateCourseTemplateDraft,
  type CourseTemplate,
  type CourseTemplateDraft,
  type CourseTemplateEvent,
  type CourseTemplateResource,
} from '@/lib/courseTemplates';
import {
  saveCourseTemplateAction,
  type SaveTemplateState,
} from './actions';
import { useAuth } from '@/lib/AuthContext';
import { COURSE_MATERIALS_BUCKET, MAX_WORKSHEET_SIZE_BYTES } from '@/lib/materialFiles';
import { createClient } from '@/utils/supabase/client';

const INITIAL_SAVE_TEMPLATE_STATE: SaveTemplateState = { status: 'idle', message: '' };
const DRAFT_STORAGE_PREFIX = 'ace-course-template-draft';

function cloneDraft(template: CourseTemplate): CourseTemplateDraft {
  return {
    title: template.title,
    sections: template.sections.map((section) => ({ ...section })),
    events: template.events.map((event) => ({ ...event })),
    resources: template.resources.map((resource) => ({ ...resource })),
  };
}

function newEvent(template: CourseTemplateDraft): CourseTemplateEvent {
  const nextOrder = template.events.length + 1;
  return {
    key: `event-${Date.now().toString(36)}`,
    title: 'New class',
    eventType: 'live_class',
    sectionKey: template.sections[0]?.key ?? '',
    relativeDay: template.events.length === 0
      ? 0
      : Math.max(...template.events.map((event) => event.relativeDay)) + 1,
    displayOrder: nextOrder,
    startTime: '20:00',
    durationMinutes: 60,
    instructor: '',
    venue: '',
    reportingTime: '',
    instructions: '',
    publishedByDefault: true,
    sourceMasterSessionId: null,
  };
}

function newResource(): CourseTemplateResource {
  return {
    key: `resource-${Date.now().toString(36)}`,
    title: 'New starter resource',
    resourceType: 'starter',
    scope: 'template',
    sectionKey: null,
    eventKey: null,
    masterMaterialId: null,
    format: 'notion',
    notionUrl: '',
    fileUrl: '',
    textContent: '',
    displayOrder: 1,
  };
}

export default function TemplateEditor({
  initialTemplates,
  initialSelectedId,
  savedMessage,
}: {
  initialTemplates: CourseTemplate[];
  initialSelectedId: string;
  savedMessage: string;
}) {
  const templates = initialTemplates;
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const selectedTemplate = templates.find((template) => template.id === selectedId) ?? templates[0];
  const [draft, setDraft] = useState<CourseTemplateDraft>(() => cloneDraft(selectedTemplate));
  const [readyStorageKey, setReadyStorageKey] = useState<string | null>(null);
  const [reviewReady, setReviewReady] = useState(false);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [newEventKey, setNewEventKey] = useState<string | null>(null);
  const [expandedEventKey, setExpandedEventKey] = useState<string | null>(null);
  const [expandedResourceKey, setExpandedResourceKey] = useState<string | null>(null);
  const savedToastShown = useRef(false);
  const { addToast } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [uploadingResourceKey, setUploadingResourceKey] = useState<string | null>(null);
  const [saveState, formAction, isSaving] = useActionState(
    saveCourseTemplateAction,
    INITIAL_SAVE_TEMPLATE_STATE,
  );
  const draftStorageKey = `${DRAFT_STORAGE_PREFIX}:${selectedTemplate.id}:${selectedTemplate.revisionId}`;

  const resourcesByEvent = useMemo(() => {
    const grouped = new Map<string, CourseTemplateDraft['resources']>();
    for (const resource of draft.resources) {
      if (!resource.eventKey) continue;
      grouped.set(resource.eventKey, [...(grouped.get(resource.eventKey) ?? []), resource]);
    }
    return grouped;
  }, [draft.resources]);
  const savedResourceKeys = useMemo(() => new Set(selectedTemplate.resources.map((resource) => resource.key)), [selectedTemplate.resources]);
  const savedEventKeys = useMemo(() => new Set(selectedTemplate.events.map((event) => event.key)), [selectedTemplate.events]);

  const changeSummary = useMemo(() => {
    const originalEvents = new Map(selectedTemplate.events.map((event) => [event.key, event]));
    const added = draft.events.filter((event) => !originalEvents.has(event.key)).length;
    const changed = draft.events.filter((event) => {
      const original = originalEvents.get(event.key);
      return original && JSON.stringify(original) !== JSON.stringify(event);
    }).length;
    const removed = selectedTemplate.events.filter((event) => !draft.events.some((candidate) => candidate.key === event.key)).length;
    const titleChanged = draft.title !== selectedTemplate.title;
    const resourcesChanged = JSON.stringify(draft.resources) !== JSON.stringify(selectedTemplate.resources);
    return {
      added,
      changed,
      removed,
      titleChanged,
      resourcesChanged,
      hasChanges: titleChanged || added > 0 || changed > 0 || removed > 0 || resourcesChanged,
    };
  }, [draft, selectedTemplate]);

  useEffect(() => {
    if (!savedMessage || savedToastShown.current) return;
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(`${DRAFT_STORAGE_PREFIX}:${selectedTemplate.id}:`)) {
        window.localStorage.removeItem(key);
      }
    }
    savedToastShown.current = true;
    addToast('success', savedMessage);
  }, [addToast, savedMessage, selectedTemplate.id]);

  useEffect(() => {
    let nextDraft = cloneDraft(selectedTemplate);
    try {
      const stored = window.localStorage.getItem(draftStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<CourseTemplateDraft>;
        if (typeof parsed.title === 'string' && Array.isArray(parsed.sections)
          && Array.isArray(parsed.events) && Array.isArray(parsed.resources)) {
          nextDraft = parsed as CourseTemplateDraft;
        }
      }
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setDraft(nextDraft);
      setReadyStorageKey(draftStorageKey);
    });
    return () => {
      cancelled = true;
    };
  }, [draftStorageKey, selectedTemplate]);

  useEffect(() => {
    if (readyStorageKey !== draftStorageKey) return;
    const original = cloneDraft(selectedTemplate);
    if (JSON.stringify(draft) === JSON.stringify(original)) {
      window.localStorage.removeItem(draftStorageKey);
    } else {
      try {
        window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      } catch {
        // The form remains usable when browser storage is unavailable or full.
      }
    }
  }, [draft, draftStorageKey, readyStorageKey, selectedTemplate]);

  useEffect(() => {
    if (!expandedResourceKey) return;
    const frame = window.requestAnimationFrame(() => {
      const editor = document.getElementById(`template-resource-${expandedResourceKey}`);
      editor?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      editor?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expandedResourceKey]);

  const selectTemplate = (template: CourseTemplate) => {
    setSelectedId(template.id);
    setDraft(cloneDraft(template));
    setReadyStorageKey(null);
    setReviewReady(false);
    setPreviewErrors([]);
    setNewEventKey(null);
    setExpandedEventKey(null);
    setExpandedResourceKey(null);
  };

  const updateEvent = (key: string, changes: Partial<CourseTemplateEvent>) => {
    setDraft((current) => ({
      ...current,
      events: current.events.map((event) => event.key === key ? { ...event, ...changes } : event),
    }));
    setReviewReady(false);
  };

  const reorderEvent = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.events.length) return;
    setDraft((current) => {
      const events = [...current.events];
      [events[index], events[target]] = [events[target], events[index]];
      return { ...current, events: events.map((event, eventIndex) => ({ ...event, displayOrder: eventIndex + 1 })) };
    });
    setReviewReady(false);
  };

  const removeEvent = (key: string) => {
    setDraft((current) => ({
      ...current,
      events: current.events
        .filter((event) => event.key !== key)
        .map((event, index) => ({ ...event, displayOrder: index + 1 })),
      resources: current.resources.filter((resource) => resource.eventKey !== key),
    }));
    setReviewReady(false);
    if (newEventKey === key) setNewEventKey(null);
    if (expandedEventKey === key) setExpandedEventKey(null);
  };

  const updateResource = (key: string, changes: Partial<CourseTemplateResource>) => {
    setDraft((current) => ({
      ...current,
      resources: current.resources.map((resource) => resource.key === key ? { ...resource, ...changes } : resource),
    }));
    setReviewReady(false);
    if (expandedResourceKey === key) setExpandedResourceKey(null);
  };

  const removeResource = (key: string) => {
    setDraft((current) => ({
      ...current,
      resources: current.resources.filter((resource) => resource.key !== key)
        .map((resource, index) => ({ ...resource, displayOrder: index + 1 })),
    }));
    setReviewReady(false);
  };

  const uploadWorksheet = async (resourceKey: string, file: File) => {
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      addToast('error', 'Choose a PDF worksheet.');
      return;
    }
    if (file.size <= 0 || file.size > MAX_WORKSHEET_SIZE_BYTES) {
      addToast('error', 'Worksheet PDFs must be 50 MB or smaller.');
      return;
    }
    setUploadingResourceKey(resourceKey);
    try {
      const response = await fetch('/api/admin/template-resource-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate.id, fileName: file.name, fileSize: file.size, fileType: file.type }),
      });
      const authorization = await response.json() as { error?: string; fileReference?: string; uploadPath?: string; uploadToken?: string };
      if (!response.ok || !authorization.fileReference || !authorization.uploadPath || !authorization.uploadToken) {
        throw new Error(authorization.error || 'Unable to authorize the worksheet upload.');
      }
      const { error } = await supabase.storage.from(COURSE_MATERIALS_BUCKET)
        .uploadToSignedUrl(authorization.uploadPath, authorization.uploadToken, file, { contentType: 'application/pdf', upsert: false });
      if (error) throw new Error('The worksheet upload failed. Retry with the selected file.');
      updateResource(resourceKey, { fileUrl: authorization.fileReference });
      addToast('success', 'Protected worksheet uploaded. Review and save the template revision.');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Unable to upload the worksheet.');
    } finally {
      setUploadingResourceKey(null);
    }
  };

  const preview = () => {
    const result = validateCourseTemplateDraft(draft);
    if (!result.valid) {
      setPreviewErrors(result.errors);
      setReviewReady(false);
      addToast('error', `Cannot review ${selectedTemplate.name}: ${result.errors[0]}`);
      return;
    }
    setDraft(result.draft);
    setPreviewErrors([]);
    if (!changeSummary.hasChanges) {
      setReviewReady(false);
      addToast('info', `${selectedTemplate.name}: no changes to save.`);
      return;
    }
    setReviewReady(true);
    addToast(
      'info',
      `${selectedTemplate.name}: ${changeSummary.added} events added, ${changeSummary.changed} edited, ${changeSummary.removed} removed; reusable resources ${changeSummary.resourcesChanged ? 'changed' : 'unchanged'}; ${result.draft.events.length} events and ${result.draft.resources.length} resources total. Ready to save Revision ${selectedTemplate.revisionNumber + 1}.`,
    );
  };

  return (
    <div className="template-workspace">
      <aside className="admin-card template-list" aria-label="Course templates">
        {templates.map((template) => (
          <button
            type="button"
            className={`template-list-item ${template.id === selectedTemplate.id ? 'active' : ''}`}
            key={template.id}
            onClick={() => selectTemplate(template)}
          >
            <strong>{template.name}</strong>
            <span>{template.events.length} events · Revision {template.revisionNumber}</span>
          </button>
        ))}
      </aside>

      <form
        action={formAction}
        className="template-editor"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
            event.preventDefault();
          }
        }}
        onSubmit={(event) => {
          if (!reviewReady || !changeSummary.hasChanges || isSaving) event.preventDefault();
        }}
      >
        <input type="hidden" name="templateId" value={selectedTemplate.id} />
        <input type="hidden" name="expectedRevisionId" value={selectedTemplate.revisionId} />
        <input type="hidden" name="payload" value={JSON.stringify(draft)} />

        <section className="admin-card template-editor-header">
          <div>
            <span className="badge badge-admin">{selectedTemplate.mode === 'full' ? 'Full Course' : 'Crash Course'}</span>
            <label className="template-title-field">
              Template title
              <input
                className="form-input"
                value={draft.title}
                maxLength={120}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, title: event.target.value }));
                  setReviewReady(false);
                }}
                required
              />
            </label>
          </div>
          <div className="template-editor-actions">
            <button className="btn btn-secondary" type="button" onClick={preview}>Review changes</button>
            <button className="btn btn-primary" type="submit" disabled={!reviewReady || !changeSummary.hasChanges || isSaving}>
              {isSaving ? `Saving ${selectedTemplate.name}…` : 'Save template'}
            </button>
          </div>
          <p className="template-snapshot-note">
            Review shows a top-right summary and enables saving when this template has valid changes. Existing batches do not change.
          </p>
          {(previewErrors.length > 0 || saveState.status === 'error') && (
            <div className="template-message template-message-error" role="alert">
              <strong>{saveState.status === 'error' ? saveState.message : 'Fix these fields before previewing:'}</strong>
              {(previewErrors.length > 0 || saveState.errors) && (
                <ul>{(previewErrors.length > 0 ? previewErrors : saveState.errors ?? []).map((error) => <li key={error}>{error}</li>)}</ul>
              )}
            </div>
          )}
        </section>

        <details className="admin-card template-history">
          <summary>Revision history ({selectedTemplate.revisionHistory.length})</summary>
          <p>Every confirmed save creates a separate read-only database revision. The current template points to one revision; earlier rows are not overwritten or deleted.</p>
          <ol>
            {selectedTemplate.revisionHistory.map((revision) => (
              <li key={revision.id}>
                <strong>Revision {revision.revisionNumber}</strong>
                <span>{revision.title}</span>
                <time dateTime={revision.createdAt}>{new Date(revision.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST</time>
                {revision.id === selectedTemplate.revisionId && <span className="badge badge-available">Current</span>}
              </li>
            ))}
          </ol>
          <p>Full revision comparison and one-click restore are not part of Phase 1.</p>
        </details>

        <section className="admin-card template-resource-library" aria-labelledby="template-resource-title">
          <div className="template-event-list-heading">
            <div>
              <h2 id="template-resource-title">Reusable resources</h2>
              <p>Notion Starter Packs, Notion pre-reads and protected PDF worksheets copied into future batches. Open only the item you are editing; unfinished edits are saved automatically.</p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => {
              const resource = newResource();
              setDraft((current) => ({
                ...current,
                resources: [resource, ...current.resources.map((item, index) => ({ ...item, displayOrder: index + 2 }))],
              }));
              setExpandedResourceKey(resource.key);
              setReviewReady(false);
            }}>+ Add reusable resource</button>
          </div>
          {draft.resources.length === 0 ? <p className="master-content-empty">No reusable resources configured for this template.</p> : (
            <div className="template-resource-editor-list">
              {draft.resources.map((resource) => {
                const isUnsavedResource = !savedResourceKeys.has(resource.key);
                const isResourceExpanded = isUnsavedResource || expandedResourceKey === resource.key;
                return (
                <article className="master-material-card template-resource-editor" id={`template-resource-${resource.key}`} key={resource.key}>
                  <div className="resource-editor-heading">
                    <div>
                      <strong>{resource.title}</strong>
                      <p className="master-content-empty">{resource.resourceType === 'starter' ? 'Starter Pack' : resource.resourceType === 'pre_read' ? 'Pre-read' : 'Worksheet'} · {resource.scope === 'template' ? 'Whole template' : resource.scope === 'event' ? 'One event' : resource.scope === 'section' ? 'One Section' : 'Standalone'}</p>
                    </div>
                    <div className="template-compact-actions">
                      {isUnsavedResource
                        ? <span className="badge badge-available">New · unsaved</span>
                        : <button className="btn btn-secondary btn-sm" type="button" aria-expanded={isResourceExpanded} onClick={() => setExpandedResourceKey((current) => current === resource.key ? null : resource.key)}>{isResourceExpanded ? 'Done' : 'Edit'}</button>}
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeResource(resource.key)}>Remove</button>
                    </div>
                  </div>
                  {isResourceExpanded && <>
                  <div className="resource-form-grid">
                    <label>Title<input className="form-input" maxLength={160} value={resource.title} onChange={(event) => updateResource(resource.key, { title: event.target.value })} /></label>
                    <label>Type<select className="form-select" value={resource.resourceType} onChange={(event) => {
                      const resourceType = event.target.value as CourseTemplateResource['resourceType'];
                      const format = resourceType === 'worksheet' ? 'pdf' : resourceType === 'pre_read' ? 'notion' : 'notion';
                      updateResource(resource.key, { resourceType, format, notionUrl: '', fileUrl: '', textContent: '' });
                    }}><option value="starter">Starter Pack</option><option value="pre_read">Pre-read</option><option value="worksheet">Worksheet</option></select></label>
                    <label>Association<select className="form-select" value={resource.scope} onChange={(event) => updateResource(resource.key, { scope: event.target.value as CourseTemplateResource['scope'], sectionKey: null, eventKey: null })}><option value="template">Whole template</option><option value="section">One Section</option><option value="event">One event</option><option value="standalone">Standalone</option></select></label>
                    <label>Format<select className="form-select" disabled value={resource.format}>{resource.resourceType === 'worksheet' ? <option value="pdf">Protected PDF</option> : <option value="notion">Notion link</option>}</select></label>
                  </div>
                  {resource.scope === 'section' && <label>Section<select className="form-select" value={resource.sectionKey ?? ''} onChange={(event) => updateResource(resource.key, { sectionKey: event.target.value || null })}><option value="">Choose a Section</option>{draft.sections.map((section) => <option key={section.key} value={section.key}>{section.title}</option>)}</select></label>}
                  {resource.scope === 'event' && <label>Event<select className="form-select" value={resource.eventKey ?? ''} onChange={(event) => updateResource(resource.key, { eventKey: event.target.value || null })}><option value="">Choose an event</option>{draft.events.map((event) => <option key={event.key} value={event.key}>{event.displayOrder}. {event.title}</option>)}</select></label>}
                  {resource.format === 'notion' && !resource.masterMaterialId && <label>Notion link or embed code<textarea className="form-input" rows={3} placeholder="Paste a Notion HTTPS link or the complete iframe embed code" value={resource.notionUrl} onChange={(event) => updateResource(resource.key, { notionUrl: normalizeNotionInput(event.target.value) })} /></label>}
                  {resource.format === 'text' && <label>Instructions<textarea className="form-input" maxLength={2000} rows={4} value={resource.textContent} onChange={(event) => updateResource(resource.key, { textContent: event.target.value })} /></label>}
                  {resource.format === 'pdf' && !resource.masterMaterialId && <label>Protected worksheet PDF<input accept="application/pdf,.pdf" className="form-input" disabled={uploadingResourceKey === resource.key} type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadWorksheet(resource.key, file); }} /><span className="master-content-empty">{uploadingResourceKey === resource.key ? 'Uploading…' : resource.fileUrl ? 'Protected PDF uploaded.' : 'PDF only, up to 50 MB.'}</span></label>}
                  {resource.masterMaterialId && <p className="master-content-empty">Content is linked from Master Base. Title and association can be revised here; edit the underlying file/link in Master Base.</p>}
                  </>}
                </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="template-event-list">
          <div className="template-event-list-heading">
            <div>
              <h2>Template events</h2>
              <p>{draft.events.length} events · relative to the future batch start date · times shown in IST</p>
            </div>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                const addedEvent = newEvent(draft);
                setDraft((current) => ({ ...current, events: [...current.events, addedEvent] }));
                setReviewReady(false);
                setNewEventKey(addedEvent.key);
                setExpandedEventKey(addedEvent.key);
                addToast('success', `New class added as event ${addedEvent.displayOrder} in ${selectedTemplate.name}. It is not saved yet.`);
              }}
            >
              + Add event
            </button>
          </div>
          {draft.events.map((event, index) => {
            const eventResources = resourcesByEvent.get(event.key) ?? [];
            const isUnsavedEvent = !savedEventKeys.has(event.key);
            const isEventExpanded = isUnsavedEvent || expandedEventKey === event.key;
            return (
              <article
                id={`template-event-${event.key}`}
                className={`admin-card template-event-card ${event.key === newEventKey ? 'template-event-card-new' : ''}`}
                key={event.key}
              >
                <div className="template-event-heading">
                  <div className="template-event-identity">
                    <span className="template-event-number">{index + 1}</span>
                    <div>
                      <strong>{event.title}</strong>
                      <span>{draft.sections.find((section) => section.key === event.sectionKey)?.title ?? event.sectionKey} · Day {event.relativeDay} · {event.startTime} IST · {eventResources.length} resource{eventResources.length === 1 ? '' : 's'}</span>
                    </div>
                    {isUnsavedEvent && <span className="badge badge-available">New · unsaved</span>}
                  </div>
                  <div className="template-event-order-actions">
                    {!isUnsavedEvent && <button className="btn btn-secondary btn-sm" type="button" aria-expanded={isEventExpanded} onClick={() => setExpandedEventKey((current) => current === event.key ? null : event.key)}>{isEventExpanded ? 'Done' : 'Edit'}</button>}
                    <button className="btn btn-ghost btn-sm" type="button" disabled={index === 0} onClick={() => reorderEvent(index, -1)} aria-label={`Move ${event.title} earlier`}>↑</button>
                    <button className="btn btn-ghost btn-sm" type="button" disabled={index === draft.events.length - 1} onClick={() => reorderEvent(index, 1)} aria-label={`Move ${event.title} later`}>↓</button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeEvent(event.key)}>Remove</button>
                  </div>
                </div>
                {isEventExpanded && <>
                <div className="template-field-grid">
                  <label className="template-field-wide">Title
                    <input className="form-input" value={event.title} maxLength={160} onChange={(change) => updateEvent(event.key, { title: change.target.value })} required />
                  </label>
                  <label>Event type
                    <select className="form-select" value={event.eventType} onChange={(change) => updateEvent(event.key, { eventType: change.target.value as CourseTemplateEvent['eventType'] })}>
                      {COURSE_TEMPLATE_EVENT_TYPES.map((type) => <option key={type} value={type}>{formatTemplateEventType(type)}</option>)}
                    </select>
                  </label>
                  <label>Section
                    <select className="form-select" value={event.sectionKey} onChange={(change) => updateEvent(event.key, { sectionKey: change.target.value })}>
                      {draft.sections.map((section) => <option key={section.key} value={section.key}>{section.title}</option>)}
                    </select>
                  </label>
                  <label>Days after batch start (0 = start date)
                    <input className="form-input" type="number" min={0} value={event.relativeDay} onChange={(change) => updateEvent(event.key, { relativeDay: Number(change.target.value) })} required />
                  </label>
                  <label>Start time (IST)
                    <input className="form-input" type="time" value={event.startTime} onChange={(change) => updateEvent(event.key, { startTime: change.target.value })} required />
                  </label>
                  <label>Duration (minutes)
                    <input className="form-input" type="number" min={15} max={720} step={15} value={event.durationMinutes} onChange={(change) => updateEvent(event.key, { durationMinutes: Number(change.target.value) })} required />
                  </label>
                  <label>Instructor
                    <input className="form-input" value={event.instructor} maxLength={100} onChange={(change) => updateEvent(event.key, { instructor: change.target.value })} />
                  </label>
                  <label className="template-field-wide">Instructions (future Student display)
                    <textarea className="form-input" value={event.instructions} maxLength={2000} onChange={(change) => updateEvent(event.key, { instructions: change.target.value })} />
                  </label>
                  <label className="template-checkbox-field">
                    <input type="checkbox" checked={event.publishedByDefault} onChange={(change) => updateEvent(event.key, { publishedByDefault: change.target.checked })} />
                    Published by default
                  </label>
                </div>
                <div className="template-resource-summary">
                  <strong>Reusable resources</strong>
                  {eventResources.length === 0
                    ? <span>None</span>
                    : eventResources.map((resource) => <span className="badge badge-available" key={resource.key}>{resource.resourceType.replace('_', ' ')} · {resource.title}</span>)}
                </div>
                </>}
              </article>
            );
          })}
        </section>

      </form>
    </div>
  );
}
