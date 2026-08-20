'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  removeFlexibleResourceAction,
  saveFlexibleResourceAction,
} from '@/app/admin/resources/actions';
import { useAuth } from '@/lib/AuthContext';
import {
  getResourceCategoryLabel,
  RESOURCE_CATEGORIES,
  RESOURCE_SCOPES,
  type FlexibleResourceDraft,
  type ResourceCategory,
  type ResourceFormat,
} from '@/lib/flexibleResources';
import {
  COURSE_MATERIALS_BUCKET,
  MAX_SESSION_MATERIAL_SIZE_BYTES,
} from '@/lib/materialFiles';
import type {
  FlexibleResource,
  ResourceCourse,
  ResourceSession,
} from '@/lib/server/flexibleResources';
import { formatProgrammeDateTime } from '@/lib/studentTimeline';
import { createClient } from '@/utils/supabase/client';

type Props = {
  generatedAt: string;
  courses: ResourceCourse[];
  sessions: ResourceSession[];
  resources: FlexibleResource[];
};

type UploadResponse = {
  error?: string;
  fileReference?: string;
  uploadPath?: string;
  uploadToken?: string;
};

const SCOPE_LABELS = {
  batch: 'Whole batch',
  section: 'One Section',
  event: 'One event',
  standalone: 'Standalone',
} as const;

function formatsForCategory(category: ResourceCategory): ResourceFormat[] {
  if (category === 'pre_read') return ['notion'];
  if (category === 'worksheet' || category === 'session_material') return ['pdf'];
  if (category === 'recording') return ['youtube'];
  return ['notion', 'text'];
}

function defaultDraft(courseId: string): FlexibleResourceDraft {
  return {
    courseId,
    title: '',
    category: 'starter_pack',
    scope: 'batch',
    format: 'notion',
    sectionKey: null,
    sessionId: null,
    notionUrl: '',
    videoUrl: '',
    fileUrl: '',
    textContent: '',
  };
}

function resourceDraft(resource: FlexibleResource): FlexibleResourceDraft {
  return {
    courseId: resource.courseId,
    materialId: resource.id,
    title: resource.title,
    category: resource.category,
    scope: resource.scope,
    format: resource.format,
    sectionKey: resource.sectionKey,
    sessionId: resource.sessionId,
    notionUrl: resource.notionUrl,
    videoUrl: resource.videoUrl,
    fileUrl: resource.fileUrl,
    textContent: resource.textContent,
  };
}

function ResourceForm({
  course,
  initialDraft,
  isReleased = false,
  onSaved,
  resource,
  sessions,
}: {
  course: ResourceCourse;
  initialDraft: FlexibleResourceDraft;
  isReleased?: boolean;
  onSaved: () => void;
  resource?: FlexibleResource;
  sessions: ResourceSession[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const { addToast } = useAuth();
  const [draft, setDraft] = useState(initialDraft);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const sections = useMemo(() => Array.from(new Set(
    sessions.map((session) => session.sectionKey).filter((value): value is string => Boolean(value)),
  )), [sessions]);
  const formats = formatsForCategory(draft.category);
  const isPdf = draft.format === 'pdf';

  const updateCategory = (category: ResourceCategory) => {
    const format = formatsForCategory(category)[0];
    const eventOwned = category === 'recording' || category === 'session_material';
    setDraft((current) => ({
      ...current,
      category,
      format,
      scope: eventOwned ? 'event' : current.scope,
      sectionKey: eventOwned ? null : current.sectionKey,
    }));
    setFile(null);
  };

  const uploadPdf = async () => {
    if (!file) return draft.fileUrl ?? null;
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Choose a PDF file.');
    }
    if (file.size <= 0 || file.size > MAX_SESSION_MATERIAL_SIZE_BYTES) {
      throw new Error('PDFs must be 50 MB or smaller.');
    }
    const authorizationResponse = await fetch('/api/admin/resource-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: draft.category,
        courseId: course.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        sessionId: draft.sessionId,
      }),
    });
    const authorization = await authorizationResponse.json() as UploadResponse;
    if (!authorizationResponse.ok || !authorization.fileReference || !authorization.uploadPath || !authorization.uploadToken) {
      throw new Error(authorization.error || 'Unable to authorize the PDF upload.');
    }
    const { error } = await supabase.storage
      .from(COURSE_MATERIALS_BUCKET)
      .uploadToSignedUrl(authorization.uploadPath, authorization.uploadToken, file, {
        contentType: 'application/pdf',
        upsert: false,
      });
    if (error) throw new Error('The PDF upload failed. Keep your selection and retry.');
    return authorization.fileReference;
  };

  const save = async () => {
    setIsSaving(true);
    setErrors([]);
    try {
      const fileUrl = isPdf ? await uploadPdf() : null;
      const result = await saveFlexibleResourceAction({ ...draft, fileUrl, uploadedFile: Boolean(file) });
      if (result.status === 'error') {
        setErrors(result.errors ?? [result.message]);
        addToast('error', result.message);
        return;
      }
      addToast('success', result.message);
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save this resource.';
      setErrors([message]);
      addToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!resource) return;
    setIsSaving(true);
    const result = await removeFlexibleResourceAction(resource.courseId, resource.id);
    addToast(result.status === 'success' ? 'success' : 'error', result.message);
    if (result.status === 'success') onSaved();
    else setErrors([result.message]);
    setIsSaving(false);
    setIsConfirmingRemove(false);
  };

  return (
    <div className={`admin-card resource-editor${resource ? '' : ' resource-editor-new'}`}>
      <div className="resource-editor-heading">
        <div>
          <strong>{resource ? resource.title : 'Add a resource'}</strong>
          {resource && (
            <p className="master-content-empty">
              {getResourceCategoryLabel(resource.category)} · {SCOPE_LABELS[resource.scope]}
              {resource.reusable ? ' · reusable origin' : ' · batch-specific'}
            </p>
          )}
        </div>
        {resource && (
          <span className={`badge ${isReleased ? 'badge-available' : 'badge-upcoming'}`}>
            {isReleased ? 'Released · locked' : `Releases ${formatProgrammeDateTime(resource.availableFrom, 'Asia/Kolkata')}`}
          </span>
        )}
      </div>

      <div className="resource-form-grid">
        <label>
          Title
          <input className="form-input" disabled={isReleased} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        </label>
        <label>
          Category
          <select className="form-select" disabled={isReleased} value={draft.category} onChange={(event) => updateCategory(event.target.value as ResourceCategory)}>
            {RESOURCE_CATEGORIES.map((category) => <option key={category} value={category}>{getResourceCategoryLabel(category)}</option>)}
          </select>
        </label>
        <label>
          Association
          <select
            className="form-select"
            disabled={isReleased || draft.category === 'recording' || draft.category === 'session_material'}
            value={draft.scope}
            onChange={(event) => {
              const scope = event.target.value as FlexibleResourceDraft['scope'];
              setDraft({ ...draft, scope, sectionKey: null, sessionId: null });
            }}
          >
            {RESOURCE_SCOPES.map((scope) => <option key={scope} value={scope}>{SCOPE_LABELS[scope]}</option>)}
          </select>
        </label>
        <label>
          Format
          <select className="form-select" disabled={isReleased || formats.length === 1} value={draft.format} onChange={(event) => setDraft({ ...draft, format: event.target.value as ResourceFormat })}>
            {formats.map((format) => <option key={format} value={format}>{format === 'pdf' ? 'Protected PDF' : format === 'youtube' ? 'YouTube' : format === 'notion' ? 'Notion link' : 'Text instructions'}</option>)}
          </select>
        </label>
      </div>

      {draft.scope === 'section' && (
        <label>
          Section
          <select className="form-select" disabled={isReleased} value={draft.sectionKey ?? ''} onChange={(event) => setDraft({ ...draft, sectionKey: event.target.value || null })}>
            <option value="">Choose a Section</option>
            {sections.map((section) => <option key={section} value={section}>{section}</option>)}
          </select>
        </label>
      )}
      {draft.scope === 'event' && (
        <label>
          Batch event
          <select className="form-select" disabled={isReleased} value={draft.sessionId ?? ''} onChange={(event) => setDraft({ ...draft, sessionId: event.target.value || null })}>
            <option value="">Choose an event</option>
            {sessions.map((session) => <option key={session.id} value={session.id}>{session.displayOrder}. {session.title}</option>)}
          </select>
        </label>
      )}

      {draft.format === 'notion' && (
        <label>
          Notion link
          <input className="form-input" disabled={isReleased} type="url" placeholder="https://…notion.site/…" value={draft.notionUrl ?? ''} onChange={(event) => setDraft({ ...draft, notionUrl: event.target.value })} />
        </label>
      )}
      {draft.format === 'youtube' && (
        <label>
          YouTube link
          <input className="form-input" disabled={isReleased} type="url" placeholder="https://youtu.be/…" value={draft.videoUrl ?? ''} onChange={(event) => setDraft({ ...draft, videoUrl: event.target.value })} />
        </label>
      )}
      {draft.format === 'text' && (
        <label>
          Instructions
          <textarea className="form-input" disabled={isReleased} maxLength={2000} rows={4} value={draft.textContent ?? ''} onChange={(event) => setDraft({ ...draft, textContent: event.target.value })} />
        </label>
      )}
      {draft.format === 'pdf' && (
        <label>
          {draft.fileUrl ? 'Replace protected PDF (optional)' : 'Protected PDF'}
          <input accept="application/pdf,.pdf" className="form-input" disabled={isReleased} type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <span className="master-content-empty">{file ? `${file.name} selected.` : draft.fileUrl ? 'Current private PDF retained.' : 'PDF only, up to 50 MB.'}</span>
        </label>
      )}

      {errors.length > 0 && <div className="master-content-error" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
      {isReleased ? (
        <p className="resource-release-note">Released material remains available and cannot be edited or withdrawn.</p>
      ) : isConfirmingRemove ? (
        <div className="session-resource-confirmation" role="alert">
          <p>Remove this unreleased resource from the batch?</p>
          <div>
            <button className="btn btn-danger btn-sm" disabled={isSaving} type="button" onClick={() => void remove()}>Confirm remove</button>
            <button className="btn btn-ghost btn-sm" disabled={isSaving} type="button" onClick={() => setIsConfirmingRemove(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="resource-editor-actions">
          <button className="btn btn-primary btn-sm" disabled={isSaving} type="button" onClick={() => void save()}>{isSaving ? 'Saving…' : resource ? 'Save resource' : '+ Add resource'}</button>
          {resource && <button className="btn btn-ghost btn-sm" disabled={isSaving} type="button" onClick={() => setIsConfirmingRemove(true)}>Remove</button>}
        </div>
      )}
    </div>
  );
}

export function ResourceManager({ courses, generatedAt, resources, sessions }: Props) {
  const router = useRouter();
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? '');
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const courseSessions = sessions.filter((session) => session.courseId === selectedCourseId).sort((left, right) => left.displayOrder - right.displayOrder);
  const courseResources = resources.filter((resource) => resource.courseId === selectedCourseId);
  const refresh = () => router.refresh();

  if (!selectedCourse) {
    return <div className="admin-card empty-state"><p className="empty-state-text">Create a batch before adding resources.</p></div>;
  }

  return (
    <div className="resource-manager">
      <div className="admin-card resource-batch-picker">
        <label className="form-label" htmlFor="resource-batch">Batch</label>
        <select className="form-select" id="resource-batch" value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
          {courses.map((course) => <option key={course.id} value={course.id}>{course.name}{course.cohortStartDate ? ` — starts ${course.cohortStartDate}` : ''}</option>)}
        </select>
        <p className="master-content-empty">{selectedCourse.isPublished ? 'Published batch' : 'Draft batch'} · Asia/Kolkata</p>
      </div>

      <ResourceForm course={selectedCourse} initialDraft={defaultDraft(selectedCourse.id)} key={`new-${selectedCourse.id}-${courseResources.length}`} onSaved={refresh} sessions={courseSessions} />

      <section aria-labelledby="saved-resources-title">
        <div className="master-content-heading">
          <div>
            <h2 id="saved-resources-title">Saved resources</h2>
            <p className="master-content-empty">{courseResources.length} resource{courseResources.length === 1 ? '' : 's'} in this batch.</p>
          </div>
        </div>
        {courseResources.length === 0 ? (
          <div className="admin-card empty-state"><p className="empty-state-text">No resources yet. Add a starter pack or another approved resource above.</p></div>
        ) : (
          <div className="resource-list">
            {courseResources.map((resource) => (
              <ResourceForm
                course={selectedCourse}
                initialDraft={resourceDraft(resource)}
                isReleased={new Date(resource.availableFrom).getTime() <= new Date(generatedAt).getTime()}
                key={resource.id}
                onSaved={refresh}
                resource={resource}
                sessions={courseSessions}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
