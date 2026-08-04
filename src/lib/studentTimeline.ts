export type AcademicSection = 'QA' | 'VA' | 'DI';
export type TimelineMaterialType = 'pre_read' | 'class_material' | 'worksheet' | 'video';

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
  generatedAt: string,
) {
  const now = new Date(generatedAt).getTime();
  const sections: AcademicSection[] = ['DI', 'VA', 'QA'];

  return sections.flatMap((section) => {
    const sectionSessions = sessions
      .filter((session) => session.class_type === section)
      .sort((left, right) => (
        new Date(left.session_date).getTime() - new Date(right.session_date).getTime()
      ));

    const activeSession = sectionSessions.find((session, index) => {
      const sessionEnd = new Date(session.session_end_at ?? session.session_date).getTime();
      const nextSession = sectionSessions[index + 1];
      const nextSessionStart = nextSession
        ? new Date(nextSession.session_date).getTime()
        : Number.POSITIVE_INFINITY;

      return sessionEnd <= now && now < nextSessionStart;
    });
    if (!activeSession) return [];

    const worksheet = activeSession.materials.find((material) => (
      material.type === 'worksheet' && material.is_available
    ));

    return worksheet ? [{ session: activeSession, material: worksheet }] : [];
  });
}

export function getPreReadRecommendation(
  sessions: StudentTimelineSession[],
  currentWeek: number,
  generatedAt: string,
  timeZone: string,
): PreReadRecommendation | null {
  const targetByDay: Partial<Record<string, AcademicSection>> = {
    Thursday: 'VA',
    Friday: 'QA',
    Saturday: 'DI',
  };
  const section = targetByDay[getWeekdayInTimeZone(generatedAt, timeZone)];
  if (!section) return null;

  const session = sessions.find((item) => (
    item.week_number === currentWeek && item.class_type === section
  ));
  if (!session) return null;

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

export function getMaterialActionLabel(type: TimelineMaterialType) {
  if (type === 'pre_read') return 'Pre-read';
  if (type === 'video') return 'Recording';
  if (type === 'worksheet') return 'Worksheet';
  return 'Class material';
}
