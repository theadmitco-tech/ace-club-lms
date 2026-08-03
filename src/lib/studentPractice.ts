export type StudentQuestionStatus = 'done' | 'review';

export type StudentPracticeOverviewItem = {
  material_id: string;
  session_id: string;
  title: string;
  session_title: string;
  section: string | null;
  week_number: number;
  total_questions: number;
  done_count: number;
  review_count: number;
  last_updated: string | null;
};

export type StudentPracticeOverview = {
  course: {
    id: string;
    name: string;
    schedule_timezone: string;
  } | null;
  worksheets: StudentPracticeOverviewItem[];
};

export type StudentQuestionLog = {
  id: string;
  question_number: number;
  status: StudentQuestionStatus | null;
  time_taken_seconds: number | null;
  comment: string | null;
  updated_at: string | null;
};

export type StudentWorksheetLog = {
  material_id: string;
  session_id: string;
  course_id: string;
  title: string;
  session_title: string;
  section: string | null;
  week_number: number;
  questions: StudentQuestionLog[];
};

export function formatTrackerDuration(seconds: number | null) {
  if (seconds === null) return '';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function parseTrackerDuration(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { seconds: null, error: null };

  const match = /^(\d{1,3}):([0-5]\d)$/.exec(trimmed);
  if (!match) {
    return { seconds: null, error: 'Use mm:ss, for example 2:30.' };
  }

  return {
    seconds: Number(match[1]) * 60 + Number(match[2]),
    error: null,
  };
}
