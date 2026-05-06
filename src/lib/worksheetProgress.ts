import type { WorksheetDailyTarget, WorksheetLog, WorksheetSectionKey } from '@/lib/types';

export const WORKSHEET_SECTION_LABELS: Record<WorksheetSectionKey, string> = {
  quant: 'Quant',
  verbal: 'Verbal',
  di: 'DI',
};

export const WORKSHEET_SECTION_ORDER: WorksheetSectionKey[] = ['quant', 'verbal', 'di'];

export type WorksheetStatus = 'ahead' | 'on_track' | 'behind';

export interface WorksheetSummary {
  attemptedTotal: number;
  expectedTotal: number;
  shortfall: number;
  completionPercent: number;
  status: WorksheetStatus;
  streak: number;
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

export function formatWorksheetTargetDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return dateKey;

  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function isWeekday(date: Date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function nextWeekday(date: Date) {
  let next = new Date(date);
  while (!isWeekday(next)) {
    next = addDays(next, 1);
  }
  return next;
}

export function getEditableStartDate(today = new Date()) {
  return toDateKey(addDays(today, -7));
}

export function canEditLogDate(dateKey: string, today = new Date()) {
  const editableStart = getEditableStartDate(today);
  const todayKey = toDateKey(today);
  return dateKey >= editableStart && dateKey <= todayKey;
}

export function generateSectionTargets(params: {
  planId: string;
  courseId: string;
  section: WorksheetSectionKey;
  startQuestion: number;
  endQuestion: number;
  dailyTargetCount: number;
  activeFromDate: string;
}) {
  const targets = [];
  const dailyCount = Math.max(params.dailyTargetCount, 1);
  let currentQuestion = params.startQuestion;
  let currentDate = nextWeekday(parseDateKey(params.activeFromDate));

  while (currentQuestion <= params.endQuestion) {
    const rangeStart = currentQuestion;
    const rangeEnd = Math.min(currentQuestion + dailyCount - 1, params.endQuestion);
    targets.push({
      plan_id: params.planId,
      course_id: params.courseId,
      target_date: toDateKey(currentDate),
      section: params.section,
      question_start: rangeStart,
      question_end: rangeEnd,
      target_count: rangeEnd - rangeStart + 1,
      range_label: `Q${rangeStart}-Q${rangeEnd}`,
    });
    currentQuestion = rangeEnd + 1;
    currentDate = nextWeekday(addDays(currentDate, 1));
  }

  return targets;
}

export function getExpectedTotal(targets: Pick<WorksheetDailyTarget, 'target_date' | 'target_count'>[], throughDateKey: string) {
  return targets
    .filter((target) => target.target_date <= throughDateKey)
    .reduce((sum, target) => sum + target.target_count, 0);
}

export function getAttemptedTotal(logs: Pick<WorksheetLog, 'attempted_count'>[]) {
  return logs.reduce((sum, log) => sum + Number(log.attempted_count || 0), 0);
}

export function getWorksheetStatus(shortfall: number, targets: Pick<WorksheetDailyTarget, 'target_date' | 'target_count'>[], todayKey: string): WorksheetStatus {
  if (shortfall <= 0) return 'ahead';

  const recentTargetTotal = targets
    .filter((target) => target.target_date <= todayKey)
    .sort((a, b) => b.target_date.localeCompare(a.target_date))
    .slice(0, 2)
    .reduce((sum, target) => sum + target.target_count, 0);

  return shortfall >= recentTargetTotal && recentTargetTotal > 0 ? 'behind' : 'on_track';
}

export function calculateStreak(logs: Pick<WorksheetLog, 'log_date' | 'attempted_count'>[], today = new Date()) {
  const loggedDates = new Set(
    logs
      .filter((log) => Number(log.attempted_count || 0) > 0)
      .map((log) => log.log_date)
  );

  let streak = 0;
  let cursor = nextWeekday(today);
  if (toDateKey(cursor) > toDateKey(today)) {
    cursor = addDays(cursor, -1);
  }

  while (!isWeekday(cursor)) {
    cursor = addDays(cursor, -1);
  }

  while (loggedDates.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
    while (!isWeekday(cursor)) {
      cursor = addDays(cursor, -1);
    }
  }

  return streak;
}

export function summarizeWorksheetProgress(params: {
  targets: WorksheetDailyTarget[];
  logs: WorksheetLog[];
  today?: Date;
}) {
  const today = params.today || new Date();
  const todayKey = toDateKey(today);
  const expectedTotal = getExpectedTotal(params.targets, todayKey);
  const attemptedTotal = getAttemptedTotal(params.logs);
  const shortfall = Math.max(expectedTotal - attemptedTotal, 0);
  const completionPercent = expectedTotal > 0 ? Math.round((attemptedTotal / expectedTotal) * 100) : 0;
  const status = getWorksheetStatus(shortfall, params.targets, todayKey);
  const streak = calculateStreak(params.logs, today);

  return {
    attemptedTotal,
    expectedTotal,
    shortfall,
    completionPercent,
    status,
    streak,
  };
}

export function getRankBand(percentile: number | null) {
  if (percentile === null) return 'Class data pending';
  if (percentile >= 75) return 'Top 25%';
  if (percentile >= 50) return 'Top half';
  if (percentile >= 25) return 'Middle band';
  return 'Building consistency';
}
