export type AcademicSection = 'QA' | 'VA' | 'DI';
export type TimelineMaterialType = 'pre_read' | 'class_material' | 'worksheet' | 'video' | 'session_material';

export type StudentTimelineMaterial = {
  id: string;
  type: TimelineMaterialType;
  title: string;
  available_from: string;
  is_available: boolean;
  tracker_available: boolean;
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
  materials: StudentTimelineMaterial[];
};

export type StudentTimelineCourse = {
  id: string;
  name: string;
  cohort_start_date: string | null;
  schedule_timezone: string;
};

export type StudentTimelinePayload = {
  generated_at: string;
  course: StudentTimelineCourse | null;
  sessions: StudentTimelineSession[];
};

export type WeekGroup = {
  weekNumber: number;
  sessions: StudentTimelineSession[];
};

export type PreReadRecommendation = {
  session: StudentTimelineSession;
  material: StudentTimelineMaterial | null;
  section: AcademicSection;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function addDaysToDateKey(dateKey: string, days: number) {
  return new Date(parseDateKey(dateKey) + (days * DAY_IN_MS)).toISOString().slice(0, 10);
}

function compareSessions(left: StudentTimelineSession, right: StudentTimelineSession) {
  const dateDifference = new Date(left.session_date).getTime() - new Date(right.session_date).getTime();
  if (dateDifference !== 0) return dateDifference;

  const numberDifference = left.session_number - right.session_number;
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
      sessions: groupedSessions.sort((left, right) => left.session_number - right.session_number),
    }));
}

export function isAcademicSection(value: string | null): value is AcademicSection {
  return value === 'QA' || value === 'VA' || value === 'DI';
}

export function getRecommendedPractice(
  sessions: StudentTimelineSession[],
) {
  const sections: AcademicSection[] = ['DI', 'VA', 'QA'];

  return sections.flatMap((section) => {
    const activeSession = sessions
      .filter((session) => (
        session.class_type === section
        && session.materials.some((material) => material.type === 'worksheet' && material.is_available)
      ))
      .sort((left, right) => compareSessions(right, left))[0];
    if (!activeSession) return [];

    const worksheets = activeSession.materials.filter((material, index, materials) => (
      material.type === 'worksheet'
      && material.is_available
      && materials.findIndex((candidate) => candidate.id === material.id) === index
    ));

    return worksheets.map((material) => ({ session: activeSession, material }));
  });
}

export function getRecommendedReading(
  sessions: StudentTimelineSession[],
) {
  const sections: AcademicSection[] = ['DI', 'VA', 'QA'];

  return sections.flatMap((section) => {
    const activeSession = sessions
      .filter((session) => (
        session.class_type === section
        && session.materials.some((material) => material.type === 'session_material' && material.is_available)
      ))
      .sort((left, right) => compareSessions(right, left))[0];
    if (!activeSession) return [];

    const reading = activeSession.materials.filter((material, index, materials) => (
      material.type === 'session_material'
      && material.is_available
      && materials.findIndex((candidate) => candidate.id === material.id) === index
    ));

    return reading.map((material) => ({ session: activeSession, material }));
  });
}

export function getPreReadRecommendation(
  sessions: StudentTimelineSession[],
  generatedAt: string,
  timeZone: string,
): PreReadRecommendation | null {
  const programmeToday = getDateKeyInTimeZone(generatedAt, timeZone);
  const tomorrow = addDaysToDateKey(programmeToday, 1);
  const session = sessions
    .filter((item) => (
      isAcademicSection(item.class_type)
      && getDateKeyInTimeZone(item.session_date, timeZone) === tomorrow
    ))
    .sort(compareSessions)[0];
  if (!session) return null;

  const section = session.class_type as AcademicSection;

  return {
    session,
    material: session.materials.find((material) => material.type === 'pre_read') ?? null,
    section,
  };
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
