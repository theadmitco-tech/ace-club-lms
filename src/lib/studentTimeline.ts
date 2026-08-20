export type AcademicSection = 'QA' | 'VA' | 'DI';
export type TimelineMaterialType = 'pre_read' | 'class_material' | 'worksheet' | 'video' | 'session_material';
export type CourseMode = 'full' | 'crash';
export type ResourceCategory = 'starter_pack' | 'pre_read' | 'worksheet' | 'session_material' | 'recording' | 'post_class' | 'reference' | 'other';
export type ResourceScope = 'batch' | 'section' | 'event' | 'standalone';
export type ResourceFormat = 'notion' | 'pdf' | 'youtube' | 'text';

export type StudentTimelineMaterial = {
  id: string;
  type: TimelineMaterialType;
  title: string;
  available_from: string;
  is_available: boolean;
  tracker_available: boolean;
  category?: ResourceCategory;
  resource_scope?: ResourceScope;
  resource_format?: ResourceFormat;
  section_key?: string | null;
  session_id?: string | null;
  text_content?: string | null;
  notion_url?: string | null;
  file_url?: string | null;
  video_url?: string | null;
  session_title?: string | null;
  created_at?: string;
};

export type StudentTimelineSession = {
  id: string;
  title: string;
  session_number: number;
  session_date: string;
  session_end_at: string | null;
  class_type: string | null;
  instructor: string | null;
  week_number: number | null;
  weekday: string | null;
  event_type?: string | null;
  section_key?: string | null;
  display_order?: number | null;
  venue?: string | null;
  reporting_time?: string | null;
  instructions?: string | null;
  materials: StudentTimelineMaterial[];
};

export type StudentTimelineCourse = {
  id: string;
  name: string;
  cohort_start_date: string | null;
  schedule_timezone: string;
  course_mode?: CourseMode | null;
};

export type StudentTimelinePayload = {
  generated_at: string;
  course: StudentTimelineCourse | null;
  sessions: StudentTimelineSession[];
  resources?: StudentTimelineMaterial[];
};

export type WeekGroup = {
  weekNumber: number;
  sessions: StudentTimelineSession[];
};

export type DayGroup = {
  dateKey: string;
  label: string;
  sessions: StudentTimelineSession[];
};

export type SectionGroup = {
  section: string;
  sessions: StudentTimelineSession[];
};

export type SectionReadingRecommendation = {
  section: AcademicSection;
  session: StudentTimelineSession | null;
  materials: StudentTimelineMaterial[];
  state?: 'active' | 'waiting' | 'none';
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function compareSessions(left: StudentTimelineSession, right: StudentTimelineSession) {
  const dateDifference = new Date(left.session_date).getTime() - new Date(right.session_date).getTime();
  if (dateDifference !== 0) return dateDifference;

  const numberDifference = (left.display_order ?? left.session_number) - (right.display_order ?? right.session_number);
  return numberDifference !== 0 ? numberDifference : left.id.localeCompare(right.id);
}

export function getDateKeyInTimeZone(value: string | Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getWeekdayInTimeZone(value: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(new Date(value));
}

export function getCurrentProgrammeWeek(course: StudentTimelineCourse, generatedAt: string) {
  if (!course.cohort_start_date) return 0;
  const currentDate = getDateKeyInTimeZone(generatedAt, course.schedule_timezone);
  return Math.max(0, Math.floor((parseDateKey(currentDate) - parseDateKey(course.cohort_start_date)) / (7 * DAY_IN_MS)));
}

export function groupTimelineByWeek(sessions: StudentTimelineSession[]): WeekGroup[] {
  const groups = new Map<number, StudentTimelineSession[]>();
  for (const session of sessions) {
    const weekNumber = session.week_number ?? 0;
    const group = groups.get(weekNumber) ?? [];
    group.push(session);
    groups.set(weekNumber, group);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left - right)
    .map(([weekNumber, groupedSessions]) => ({
      weekNumber,
      sessions: groupedSessions.sort(compareSessions),
    }));
}

export function groupTimelineByDay(
  sessions: StudentTimelineSession[],
  timeZone: string,
): DayGroup[] {
  const groups = new Map<string, StudentTimelineSession[]>();
  for (const session of [...sessions].sort(compareSessions)) {
    const dateKey = getDateKeyInTimeZone(session.session_date, timeZone);
    const group = groups.get(dateKey) ?? [];
    group.push(session);
    groups.set(dateKey, group);
  }

  return Array.from(groups.entries()).map(([dateKey, groupedSessions]) => ({
    dateKey,
    label: formatProgrammeDate(groupedSessions[0].session_date, timeZone),
    sessions: groupedSessions,
  }));
}

export function getSessionSection(session: StudentTimelineSession) {
  const candidate = session.section_key?.trim() || session.class_type?.trim() || '';
  return candidate ? candidate.toUpperCase() : 'PROGRAMME';
}

export function isCrashCourse(
  course: StudentTimelineCourse,
  sessions: StudentTimelineSession[],
) {
  if (course.course_mode) return course.course_mode === 'crash';
  if (/crash\s*course/i.test(course.name)) return true;
  return sessions.length > 0 && sessions.every((session) => session.week_number === null);
}

export function groupTimelineBySection(sessions: StudentTimelineSession[]): SectionGroup[] {
  const groups = new Map<string, StudentTimelineSession[]>();
  for (const session of [...sessions].sort(compareSessions)) {
    const section = getSessionSection(session);
    const group = groups.get(section) ?? [];
    group.push(session);
    groups.set(section, group);
  }
  return Array.from(groups.entries()).map(([section, groupedSessions]) => ({
    section,
    sessions: groupedSessions,
  }));
}

export function getNextEvent(
  sessions: StudentTimelineSession[],
  generatedAt: string,
  eventType?: string,
) {
  const now = new Date(generatedAt).getTime();
  return [...sessions]
    .filter((session) => (
      new Date(session.session_date).getTime() > now
      && (!eventType || session.event_type === eventType)
    ))
    .sort(compareSessions)[0] ?? null;
}

export function isAcademicSection(value: string | null): value is AcademicSection {
  return value === 'QA' || value === 'VA' || value === 'DI';
}

export function getRecommendedPractice(
  sessions: StudentTimelineSession[],
  generatedAt: string,
) {
  const sections: AcademicSection[] = ['DI', 'VA', 'QA'];
  const generatedAtTime = new Date(generatedAt).getTime();

  return sections.flatMap((section) => {
    const sectionSessions = sessions
      .filter((session) => session.class_type === section)
      .sort(compareSessions);
    const previousClass = sectionSessions.filter((session) => (
      session.session_end_at !== null
      && new Date(session.session_end_at).getTime() <= generatedAtTime
    )).at(-1) ?? null;
    if (!previousClass) return [];

    const nextClass = sectionSessions.find((session) => compareSessions(session, previousClass) > 0);
    if (nextClass && generatedAtTime >= new Date(nextClass.session_date).getTime()) return [];

    const worksheets = previousClass.materials.filter((material, index, materials) => (
      material.type === 'worksheet'
      && material.is_available
      && materials.findIndex((candidate) => candidate.id === material.id) === index
    ));

    return worksheets.map((material) => ({ session: previousClass, material }));
  });
}

const READING_SECTIONS: AcademicSection[] = ['QA', 'VA', 'DI'];

function uniqueMaterials(
  materials: StudentTimelineMaterial[],
  type: TimelineMaterialType,
  availableOnly = false,
) {
  return materials.filter((material, index, allMaterials) => (
    material.type === type
    && (!availableOnly || material.is_available)
    && allMaterials.findIndex((candidate) => candidate.id === material.id) === index
  ));
}

export function getNextClassPreReads(
  sessions: StudentTimelineSession[],
  generatedAt: string,
): SectionReadingRecommendation[] {
  const generatedAtTime = new Date(generatedAt).getTime();

  return READING_SECTIONS.map((section) => {
    const sectionSessions = sessions
      .filter((session) => session.class_type === section)
      .sort(compareSessions);
    const nextSessionIndex = sectionSessions.findIndex((session) => (
      new Date(session.session_date).getTime() > generatedAtTime
    ));
    const nextSession = nextSessionIndex >= 0 ? sectionSessions[nextSessionIndex] : null;
    const previousSession = nextSessionIndex > 0 ? sectionSessions[nextSessionIndex - 1] : null;
    const isBetweenClasses = previousSession?.session_end_at !== null
      && previousSession?.session_end_at !== undefined
      && new Date(previousSession.session_end_at).getTime() <= generatedAtTime;

    return {
      section,
      session: nextSession,
      materials: isBetweenClasses && nextSession ? uniqueMaterials(nextSession.materials, 'pre_read') : [],
      state: !nextSession ? 'none' : isBetweenClasses ? 'active' : 'waiting',
    };
  });
}

export function getLastClassSessionMaterials(
  sessions: StudentTimelineSession[],
  generatedAt: string,
): SectionReadingRecommendation[] {
  const generatedAtTime = new Date(generatedAt).getTime();

  return READING_SECTIONS.map((section) => {
    const sectionSessions = sessions
      .filter((session) => session.class_type === section)
      .sort(compareSessions);
    const lastCompletedSession = sectionSessions
      .filter((session) => (
        session.session_end_at !== null
        && new Date(session.session_end_at).getTime() <= generatedAtTime
      ))
      .at(-1) ?? null;

    if (!lastCompletedSession) {
      return { section, session: null, materials: [] };
    }

    const nextSession = sectionSessions.find((session) => (
      compareSessions(session, lastCompletedSession) > 0
    ));
    const isBeforeNextClass = !nextSession
      || generatedAtTime < new Date(nextSession.session_date).getTime();

    return {
      section,
      session: isBeforeNextClass ? lastCompletedSession : null,
      materials: isBeforeNextClass
        ? uniqueMaterials(lastCompletedSession.materials, 'session_material', true)
        : [],
    };
  });
}

export function formatProgrammeDateTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatProgrammeDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

export function getMaterialAvailabilityCopy(
  material: StudentTimelineMaterial,
  timeZone: string,
) {
  if (material.is_available) return 'Available now';
  if (material.type === 'pre_read') {
    return `Available on ${formatProgrammeDateTime(material.available_from, timeZone)}`;
  }
  return `Available after class on ${formatProgrammeDate(material.available_from, timeZone)}`;
}
