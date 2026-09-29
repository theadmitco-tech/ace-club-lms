import 'server-only';

import type {
  CourseTemplate,
  CourseTemplateDraft,
  CourseTemplateEvent,
  CourseTemplateResource,
  CourseTemplateSection,
} from '@/lib/courseTemplates';
import { createClient } from '@/utils/supabase/server';

type TemplateRow = {
  id: string;
  template_key: string;
  name: string;
  course_mode: 'full' | 'crash';
  current_revision_id: string;
};

type RevisionRow = { id: string; template_id: string; revision_number: number; title: string; created_at: string };
type SectionRow = { id: string; revision_id: string; section_key: string; title: string; display_order: number };
type EventRow = {
  id: string;
  revision_id: string;
  section_id: string;
  event_key: string;
  title: string;
  event_type: CourseTemplateEvent['eventType'];
  relative_day: number;
  display_order: number;
  start_time: string;
  duration_minutes: number;
  instructor: string | null;
  venue: string | null;
  reporting_time: string | null;
  instructions: string | null;
  is_published_by_default: boolean;
  source_master_session_id: string | null;
};
type ResourceRow = {
  revision_id: string;
  section_id: string | null;
  event_id: string | null;
  resource_key: string;
  title: string;
  resource_type: CourseTemplateResource['resourceType'];
  resource_scope: CourseTemplateResource['scope'];
  master_material_id: string | null;
  resource_format: CourseTemplateResource['format'];
  notion_url: string | null;
  file_url: string | null;
  text_content: string | null;
  question_count: number | null;
  display_order: number;
};

export async function listCourseTemplates(): Promise<CourseTemplate[]> {
  const supabase = await createClient();
  const templatesResult = await supabase
    .from('course_templates')
    .select('id, template_key, name, course_mode, current_revision_id')
    .order('id');

  if (templatesResult.error) throw new Error(`Unable to load course templates: ${templatesResult.error.message}`);
  const templates = (templatesResult.data ?? []) as TemplateRow[];
  if (templates.length === 0) return [];

  const revisionIds = templates.map((template) => template.current_revision_id);
  const [revisionsResult, sectionsResult, eventsResult, resourcesResult] = await Promise.all([
    supabase.from('course_template_revisions').select('id, template_id, revision_number, title, created_at').in('template_id', templates.map((template) => template.id)).order('revision_number', { ascending: false }),
    supabase.from('course_template_sections').select('id, revision_id, section_key, title, display_order').in('revision_id', revisionIds).order('display_order'),
    supabase.from('course_template_events').select('id, revision_id, section_id, event_key, title, event_type, relative_day, display_order, start_time, duration_minutes, instructor, venue, reporting_time, instructions, is_published_by_default, source_master_session_id').in('revision_id', revisionIds).order('display_order'),
    supabase.from('course_template_resources').select('revision_id, section_id, event_id, resource_key, title, resource_type, resource_scope, master_material_id, resource_format, notion_url, file_url, text_content, question_count, display_order').in('revision_id', revisionIds).order('display_order'),
  ]);

  const loadError = revisionsResult.error ?? sectionsResult.error ?? eventsResult.error ?? resourcesResult.error;
  if (loadError) throw new Error(`Unable to load template revisions: ${loadError.message}`);

  const revisions = (revisionsResult.data ?? []) as RevisionRow[];
  const sections = (sectionsResult.data ?? []) as SectionRow[];
  const events = (eventsResult.data ?? []) as EventRow[];
  const resources = (resourcesResult.data ?? []) as ResourceRow[];
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const eventKeyByRevisionAndId = new Map<string, string>();
  for (const event of events) {
    eventKeyByRevisionAndId.set(`${event.revision_id}:${event.id}`, event.event_key);
  }

  return templates.map((template) => {
    const revision = revisions.find((candidate) => candidate.id === template.current_revision_id);
    if (!revision) throw new Error(`Current revision is missing for ${template.name}.`);
    const revisionSections = sections.filter((section) => section.revision_id === revision.id);
    const mappedSections: CourseTemplateSection[] = revisionSections.map((section) => ({
      key: section.section_key,
      title: section.title,
      displayOrder: section.display_order,
    }));
    return {
      id: template.id,
      key: template.template_key,
      name: template.name,
      mode: template.course_mode,
      revisionId: revision.id,
      revisionNumber: revision.revision_number,
      title: revision.title,
      sections: mappedSections,
      events: events.filter((event) => event.revision_id === revision.id).map((event) => ({
        key: event.event_key,
        title: event.title,
        eventType: event.event_type,
        sectionKey: sectionById.get(event.section_id)?.section_key ?? '',
        relativeDay: event.relative_day,
        displayOrder: event.display_order,
        startTime: event.start_time.slice(0, 5),
        durationMinutes: event.duration_minutes,
        instructor: event.instructor ?? '',
        venue: event.venue ?? '',
        reportingTime: event.reporting_time?.slice(0, 5) ?? '',
        instructions: event.instructions ?? '',
        publishedByDefault: event.is_published_by_default,
        sourceMasterSessionId: event.source_master_session_id,
      })),
      resources: resources.filter((resource) => resource.revision_id === revision.id).map((resource) => ({
        key: resource.resource_key,
        title: resource.title,
        resourceType: resource.resource_type,
        scope: resource.resource_scope,
        sectionKey: resource.section_id ? sectionById.get(resource.section_id)?.section_key ?? null : null,
        eventKey: resource.event_id
          ? eventKeyByRevisionAndId.get(`${revision.id}:${resource.event_id}`) ?? null
          : null,
        masterMaterialId: resource.master_material_id,
        format: resource.resource_format,
        notionUrl: resource.notion_url ?? '',
        fileUrl: resource.file_url ?? '',
        textContent: resource.text_content ?? '',
        questionCount: resource.question_count,
        displayOrder: resource.display_order,
      })),
      revisionHistory: revisions
        .filter((candidate) => candidate.template_id === template.id)
        .map((candidate) => ({
          id: candidate.id,
          revisionNumber: candidate.revision_number,
          title: candidate.title,
          createdAt: candidate.created_at,
        })),
    };
  });
}

export async function createCourseTemplateRevision(
  templateId: string,
  expectedRevisionId: string,
  draft: CourseTemplateDraft,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_course_template_revision_v2', {
    p_template_id: templateId,
    p_expected_revision_id: expectedRevisionId,
    p_title: draft.title,
    p_sections: draft.sections,
    p_events: draft.events,
    p_resources: draft.resources,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
