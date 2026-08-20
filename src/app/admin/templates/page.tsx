import TemplateEditor from './TemplateEditor';
import type { CourseTemplate } from '@/lib/courseTemplates';
import { listCourseTemplates } from '@/lib/server/courseTemplates';

export default async function AdminTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; template?: string }>;
}) {
  const { saved, template: requestedTemplateId } = await searchParams;
  let templates: CourseTemplate[] = [];
  let loadError = '';
  try {
    templates = await listCourseTemplates();
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Unable to load course templates.';
  }

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Course templates</h1>
          <p className="admin-page-subtitle">
            Edit one of the four approved structures and its reusable Starter Packs, pre-reads and worksheets. Saving creates a new revision and never changes an existing batch automatically.
          </p>
        </div>
      </div>
      {loadError ? (
        <div className="admin-card admin-progress-message" role="alert">
          <h2 className="admin-card-title">Templates are unavailable</h2>
          <p>{loadError}</p>
          <p>Apply the reviewed Pilot V2 Phase 1 migration locally, then retry this page.</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="admin-card empty-state">
          <h2 className="empty-state-title">No templates found</h2>
          <p className="empty-state-text">Apply the reviewed Pilot V2 Phase 1 migration locally.</p>
        </div>
      ) : (() => {
        const selectedTemplate = templates.find((template) => template.id === requestedTemplateId) ?? templates[0];
        return (
          <TemplateEditor
            key={`${selectedTemplate.id}:${selectedTemplate.revisionId}`}
            initialTemplates={templates}
            initialSelectedId={selectedTemplate.id}
            savedMessage={saved === '1'
              ? `${selectedTemplate.name} saved as Revision ${selectedTemplate.revisionNumber}. Other templates and existing batches were not changed.`
              : ''}
          />
        );
      })()}
    </div>
  );
}
