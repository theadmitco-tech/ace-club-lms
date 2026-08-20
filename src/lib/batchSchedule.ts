import type { CourseTemplate, CourseTemplateEventType } from '@/lib/courseTemplates';

export const BATCH_TIME_ZONE = 'Asia/Kolkata' as const;

export type BatchPublicationState = 'draft' | 'published';

export type BatchProposalInput = {
  name: string;
  startDate: string;
  publicationState: BatchPublicationState;
  templateId: string;
  expectedRevisionId: string;
  idempotencyKey: string;
};

export type BatchProposalEvent = {
  sourceEventId: string;
  key: string;
  title: string;
  eventType: CourseTemplateEventType;
  sectionKey: string;
  sectionTitle: string;
  displayOrder: number;
  startsAt: string;
  endsAt: string;
  instructor: string;
  venue: string;
  instructions: string;
  isPublished: boolean;
  resources: Array<{ key: string; title: string; type: string }>;
};

export type BatchProposalResource = {
  key: string;
  title: string;
  type: string;
  scope: string;
  sectionKey: string | null;
  eventKey: string | null;
};

export type BatchProposal = {
  templateId: string;
  revisionId: string;
  revisionNumber: number;
  templateName: string;
  courseMode: CourseTemplate['mode'];
  timeZone: typeof BATCH_TIME_ZONE;
  name: string;
  startDate: string;
  publicationState: BatchPublicationState;
  events: BatchProposalEvent[];
  resources: BatchProposalResource[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(value: string) {
  if (!DATE_PATTERN.test(value)) throw new Error('Choose a valid batch start date.');
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('Choose a valid batch start date.');
  }
  return date;
}

function formatIstIso(startDate: Date, relativeDay: number, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const utc = new Date(startDate.valueOf() + relativeDay * 86_400_000);
  utc.setUTCHours(hours - 5, minutes - 30, 0, 0);
  return utc.toISOString();
}

export function validateBatchProposalInput(input: BatchProposalInput) {
  const name = input.name.trim();
  if (!name || name.length > 120) throw new Error('Batch name is required and must be 120 characters or fewer.');
  assertDate(input.startDate);
  if (!['draft', 'published'].includes(input.publicationState)) throw new Error('Choose Draft or Published.');
  if (!input.templateId || !input.expectedRevisionId) throw new Error('Choose a course template.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.idempotencyKey)) {
    throw new Error('The creation token is invalid. Start a new proposal.');
  }
  return { ...input, name };
}

export function buildBatchProposal(template: CourseTemplate, raw: BatchProposalInput): BatchProposal {
  const input = validateBatchProposalInput(raw);
  if (template.id !== input.templateId || template.revisionId !== input.expectedRevisionId) {
    throw new Error('The selected template changed. Reload it before reviewing the schedule.');
  }
  const startDate = assertDate(input.startDate);
  const sections = new Map(template.sections.map((section) => [section.key, section.title]));
  return {
    templateId: template.id,
    revisionId: template.revisionId,
    revisionNumber: template.revisionNumber,
    templateName: template.name,
    courseMode: template.mode,
    timeZone: BATCH_TIME_ZONE,
    name: input.name,
    startDate: input.startDate,
    publicationState: input.publicationState,
    resources: [...template.resources].sort((left, right) => left.displayOrder - right.displayOrder).map((resource) => ({
      key: resource.key,
      title: resource.title,
      type: resource.resourceType,
      scope: resource.scope,
      sectionKey: resource.sectionKey,
      eventKey: resource.eventKey,
    })),
    events: [...template.events].sort((a, b) => a.displayOrder - b.displayOrder).map((event) => {
      const startsAt = formatIstIso(startDate, event.relativeDay, event.startTime);
      return {
        sourceEventId: event.key,
        key: event.key,
        title: event.title,
        eventType: event.eventType,
        sectionKey: event.sectionKey,
        sectionTitle: sections.get(event.sectionKey) ?? event.sectionKey,
        displayOrder: event.displayOrder,
        startsAt,
        endsAt: new Date(new Date(startsAt).valueOf() + event.durationMinutes * 60_000).toISOString(),
        instructor: event.instructor,
        venue: event.venue,
        instructions: event.instructions,
        isPublished: input.publicationState === 'published' && event.publishedByDefault,
        resources: template.resources
          .filter((resource) => (resource.scope === 'section' && resource.sectionKey === event.sectionKey)
            || (resource.scope === 'event' && resource.eventKey === event.key))
          .map((resource) => ({ key: resource.key, title: resource.title, type: resource.resourceType })),
      };
    }),
  };
}

export type ScheduleSnapshot = {
  id: string;
  title: string;
  displayOrder: number;
  startsAt: string;
  endsAt: string;
  cancelledAt: string | null;
};

export type ScheduleConsequence = { id: string; title: string; before: string; after: string };

export function previewShiftSubsequent(events: ScheduleSnapshot[], selectedId: string, days: number, now = new Date()) {
  if (!Number.isInteger(days) || days === 0 || Math.abs(days) > 365) throw new Error('Shift must be a non-zero whole number between -365 and 365 days.');
  const selected = events.find((event) => event.id === selectedId);
  if (!selected) throw new Error('Selected event was not found.');
  if (new Date(selected.startsAt) <= now || selected.cancelledAt) throw new Error('Completed, current or cancelled events cannot be shifted.');
  return events
    .filter((event) => event.displayOrder >= selected.displayOrder && !event.cancelledAt && new Date(event.startsAt) > now)
    .map((event): ScheduleConsequence => ({
      id: event.id,
      title: event.title,
      before: event.startsAt,
      after: new Date(new Date(event.startsAt).valueOf() + days * 86_400_000).toISOString(),
    }));
}
