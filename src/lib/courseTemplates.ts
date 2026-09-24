export const COURSE_TEMPLATE_EVENT_TYPES = [
  'live_class',
  'mock',
  'orientation',
  'break',
  'support',
] as const;

export type CourseTemplateEventType = (typeof COURSE_TEMPLATE_EVENT_TYPES)[number];
export type CourseTemplateMode = 'full' | 'crash';
export type CourseTemplateResourceType = 'starter' | 'pre_read' | 'worksheet';
export type CourseTemplateResourceScope = 'template' | 'section' | 'event' | 'standalone';
export type CourseTemplateResourceFormat = 'notion' | 'pdf' | 'text';

export type CourseTemplateSection = {
  key: string;
  title: string;
  displayOrder: number;
};

export type CourseTemplateEvent = {
  key: string;
  title: string;
  eventType: CourseTemplateEventType;
  sectionKey: string;
  relativeDay: number;
  displayOrder: number;
  startTime: string;
  durationMinutes: number;
  instructor: string;
  venue: string;
  reportingTime: string;
  instructions: string;
  publishedByDefault: boolean;
  sourceMasterSessionId: string | null;
};

export type CourseTemplateResource = {
  key: string;
  title: string;
  resourceType: CourseTemplateResourceType;
  scope: CourseTemplateResourceScope;
  sectionKey: string | null;
  eventKey: string | null;
  masterMaterialId: string | null;
  format: CourseTemplateResourceFormat;
  notionUrl: string;
  fileUrl: string;
  textContent: string;
  questionCount: number | null;
  displayOrder: number;
};

export type CourseTemplate = {
  id: string;
  key: string;
  name: string;
  mode: CourseTemplateMode;
  revisionId: string;
  revisionNumber: number;
  title: string;
  sections: CourseTemplateSection[];
  events: CourseTemplateEvent[];
  resources: CourseTemplateResource[];
  revisionHistory: CourseTemplateRevisionSummary[];
};

export type CourseTemplateRevisionSummary = {
  id: string;
  revisionNumber: number;
  title: string;
  createdAt: string;
};

export type CourseTemplateDraft = Pick<CourseTemplate, 'title' | 'sections' | 'events' | 'resources'>;

export type TemplateValidationResult =
  | { valid: true; draft: CourseTemplateDraft }
  | { valid: false; errors: string[] };

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function cleanOptional(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export function normalizeNotionInput(value: unknown) {
  const input = cleanOptional(value);
  const iframeSource = input.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/i)?.[1];
  return (iframeSource ?? input).replaceAll('&amp;', '&').trim();
}

export function reorderCourseTemplateEvents(
  events: CourseTemplateEvent[],
  index: number,
  direction: -1 | 1,
) {
  const target = index + direction;
  if (target < 0 || target >= events.length) return events;

  const scheduleSlots = events.map(({ relativeDay, startTime }) => ({ relativeDay, startTime }));
  const reorderedEvents = [...events];
  [reorderedEvents[index], reorderedEvents[target]] = [reorderedEvents[target], reorderedEvents[index]];

  return reorderedEvents.map((event, eventIndex) => ({
    ...event,
    ...scheduleSlots[eventIndex],
    displayOrder: eventIndex + 1,
  }));
}

export function validateCourseTemplateDraft(input: unknown): TemplateValidationResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Template data is missing.'] };
  }

  const raw = input as Partial<CourseTemplateDraft>;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const errors: string[] = [];

  if (!title || title.length > 120) {
    errors.push('Template title is required and must be 120 characters or fewer.');
  }
  if (!Array.isArray(raw.sections) || raw.sections.length === 0 || raw.sections.length > 20) {
    errors.push('Add between 1 and 20 Sections.');
  }
  if (!Array.isArray(raw.events) || raw.events.length === 0 || raw.events.length > 100) {
    errors.push('Add between 1 and 100 events.');
  }
  if (!Array.isArray(raw.resources) || raw.resources.length > 300) {
    errors.push('Reusable-resource associations must be a list of at most 300 items.');
  }
  if (errors.length > 0) return { valid: false, errors };

  const sectionKeys = new Set<string>();
  const sectionOrders = new Set<number>();
  const sections = raw.sections!.map((section, index) => {
    const key = typeof section?.key === 'string' ? section.key.trim() : '';
    const sectionTitle = typeof section?.title === 'string' ? section.title.trim() : '';
    const displayOrder = Number(section?.displayOrder);
    if (!KEY_PATTERN.test(key)) errors.push(`Section ${index + 1} needs a stable lowercase key.`);
    if (sectionKeys.has(key)) errors.push(`Section key “${key}” is duplicated.`);
    if (!sectionTitle || sectionTitle.length > 80) errors.push(`Section ${index + 1} needs a title of 80 characters or fewer.`);
    if (!Number.isInteger(displayOrder) || displayOrder < 1) errors.push(`Section ${index + 1} needs a positive display order.`);
    if (sectionOrders.has(displayOrder)) errors.push(`Section display order ${displayOrder} is duplicated.`);
    sectionKeys.add(key);
    sectionOrders.add(displayOrder);
    return { key, title: sectionTitle, displayOrder };
  });

  const eventKeys = new Set<string>();
  const eventOrders = new Set<number>();
  const events = raw.events!.map((event, index) => {
    const label = `Event ${index + 1}`;
    const key = typeof event?.key === 'string' ? event.key.trim() : '';
    const eventTitle = typeof event?.title === 'string' ? event.title.trim() : '';
    const eventType = event?.eventType as CourseTemplateEventType;
    const sectionKey = typeof event?.sectionKey === 'string' ? event.sectionKey.trim() : '';
    const relativeDay = Number(event?.relativeDay);
    const displayOrder = Number(event?.displayOrder);
    const startTime = typeof event?.startTime === 'string' ? event.startTime.slice(0, 5) : '';
    const durationMinutes = Number(event?.durationMinutes);
    const instructor = cleanOptional(event?.instructor);
    const venue = cleanOptional(event?.venue);
    const reportingTime = typeof event?.reportingTime === 'string' ? event.reportingTime.slice(0, 5) : '';
    const instructions = cleanOptional(event?.instructions);

    if (!KEY_PATTERN.test(key)) errors.push(`${label} needs a stable lowercase key.`);
    if (eventKeys.has(key)) errors.push(`Event key “${key}” is duplicated.`);
    if (!eventTitle || eventTitle.length > 160) errors.push(`${label} needs a title of 160 characters or fewer.`);
    if (!COURSE_TEMPLATE_EVENT_TYPES.includes(eventType)) errors.push(`${label} has an invalid event type.`);
    if (!sectionKeys.has(sectionKey)) errors.push(`${label} must use one of this template’s Sections.`);
    if (!Number.isInteger(relativeDay) || relativeDay < 0) errors.push(`${label} needs a number of days after the batch start (0 or later).`);
    if (!Number.isInteger(displayOrder) || displayOrder < 1) errors.push(`${label} needs a positive display order.`);
    if (eventOrders.has(displayOrder)) errors.push(`Event display order ${displayOrder} is duplicated.`);
    if (!TIME_PATTERN.test(startTime)) errors.push(`${label} needs a valid start time.`);
    if (reportingTime && !TIME_PATTERN.test(reportingTime)) errors.push(`${label} needs a valid reporting time.`);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 720) {
      errors.push(`${label} duration must be between 15 and 720 minutes.`);
    }
    if (instructor.length > 100) errors.push(`${label} instructor must be 100 characters or fewer.`);
    if (venue.length > 200) errors.push(`${label} venue must be 200 characters or fewer.`);
    if (instructions.length > 2000) errors.push(`${label} instructions must be 2,000 characters or fewer.`);

    eventKeys.add(key);
    eventOrders.add(displayOrder);
    return {
      key,
      title: eventTitle,
      eventType,
      sectionKey,
      relativeDay,
      displayOrder,
      startTime,
      durationMinutes,
      instructor,
      venue,
      reportingTime,
      instructions,
      publishedByDefault: event?.publishedByDefault !== false,
      sourceMasterSessionId: typeof event?.sourceMasterSessionId === 'string'
        ? event.sourceMasterSessionId
        : null,
    };
  });

  const resourceKeys = new Set<string>();
  const resources = raw.resources!.map((resource, index) => {
    const label = `Resource ${index + 1}`;
    const key = typeof resource?.key === 'string' ? resource.key.trim() : '';
    const resourceTitle = typeof resource?.title === 'string' ? resource.title.trim() : '';
    const resourceType = resource?.resourceType as CourseTemplateResourceType;
    const scope = resource?.scope as CourseTemplateResourceScope;
    const sectionKey = typeof resource?.sectionKey === 'string' ? resource.sectionKey : null;
    const eventKey = typeof resource?.eventKey === 'string' ? resource.eventKey : null;
    const displayOrder = Number(resource?.displayOrder);
    const format = resource?.format as CourseTemplateResourceFormat;
    const notionUrl = normalizeNotionInput(resource?.notionUrl);
    const fileUrl = cleanOptional(resource?.fileUrl);
    const textContent = cleanOptional(resource?.textContent);
    const masterMaterialId = typeof resource?.masterMaterialId === 'string' ? resource.masterMaterialId : null;
    const questionCount = resourceType === 'worksheet' ? Number(resource?.questionCount) : null;
    if (!KEY_PATTERN.test(key)) errors.push(`${label} needs a stable lowercase key.`);
    if (resourceKeys.has(key)) errors.push(`Resource key “${key}” is duplicated.`);
    if (!resourceTitle || resourceTitle.length > 160) errors.push(`${label} needs a title of 160 characters or fewer.`);
    if (!['starter', 'pre_read', 'worksheet'].includes(resourceType)) errors.push(`${label} has an invalid reusable type.`);
    if (!['template', 'section', 'event', 'standalone'].includes(scope)) errors.push(`${label} has an invalid scope.`);
    if (!['notion', 'pdf', 'text'].includes(format)) errors.push(`${label} has an invalid format.`);
    if (resourceType === 'starter' && format !== 'notion') errors.push(`${label} Starter Pack must use Notion.`);
    if (resourceType === 'pre_read' && format !== 'notion') errors.push(`${label} Pre-read must use Notion.`);
    if (resourceType === 'worksheet' && format !== 'pdf') errors.push(`${label} Worksheet must use a protected PDF.`);
    if (resourceType === 'worksheet' && (questionCount === null || !Number.isInteger(questionCount) || questionCount < 1)) {
      errors.push(`${label} Worksheet needs a positive number of questions.`);
    }
    if (format === 'notion' && !masterMaterialId && !/^https:\/\/([a-z0-9-]+\.)?notion\.(so|site)\//i.test(notionUrl)) errors.push(`${label} needs a valid Notion HTTPS link.`);
    if (format === 'pdf' && !masterMaterialId && !/^\/api\/materials\/file\?path=worksheets%2F/i.test(fileUrl)) errors.push(`${label} needs a protected worksheet PDF.`);
    if (format === 'text' && (!textContent || textContent.length > 2000)) errors.push(`${label} needs text of 2,000 characters or fewer.`);
    if (scope === 'section' && (!sectionKey || !sectionKeys.has(sectionKey))) errors.push(`${label} needs a valid Section.`);
    if (scope === 'event' && (!eventKey || !eventKeys.has(eventKey))) errors.push(`${label} needs a valid event.`);
    if (!Number.isInteger(displayOrder) || displayOrder < 1) errors.push(`${label} needs a positive display order.`);
    resourceKeys.add(key);
    return {
      key,
      title: resourceTitle,
      resourceType,
      scope,
      sectionKey,
      eventKey,
      masterMaterialId,
      format,
      notionUrl: format === 'notion' ? notionUrl : '',
      fileUrl: format === 'pdf' ? fileUrl : '',
      textContent: format === 'text' ? textContent : '',
      questionCount,
      displayOrder,
    };
  });

  if (errors.length > 0) return { valid: false, errors: [...new Set(errors)] };
  return { valid: true, draft: { title, sections, events, resources } };
}

export function formatTemplateEventType(type: CourseTemplateEventType) {
  return type.replace('_', ' ').replace(/^./, (character) => character.toUpperCase());
}
