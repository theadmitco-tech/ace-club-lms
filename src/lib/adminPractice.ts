import type { StudentQuestionLog } from '@/lib/studentPractice';

export type AdminPracticeStudent = {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
};

export type AdminPracticeWorksheet = {
  material_id: string;
  session_id: string;
  title: string;
  session_title: string;
  section: string | null;
  week_number: number;
  total_questions: number;
};

export type AdminPracticeProgressRow = {
  user_id: string;
  material_id: string;
  total_questions: number;
  done_count: number;
  review_count: number;
  last_updated: string | null;
};

export type AdminCoursePracticeProgress = {
  course: {
    id: string;
    name: string;
    schedule_timezone: string;
  };
  students: AdminPracticeStudent[];
  worksheets: AdminPracticeWorksheet[];
  progress: AdminPracticeProgressRow[];
};

export type AdminStudentWorksheetProgress = {
  course: AdminCoursePracticeProgress['course'];
  student: AdminPracticeStudent;
  worksheet: Omit<AdminPracticeWorksheet, 'total_questions'> & {
    questions: StudentQuestionLog[];
  };
};

export function getAdminProgressCounts(row: AdminPracticeProgressRow | undefined, totalQuestions: number) {
  const done = Number(row?.done_count || 0);
  const review = Number(row?.review_count || 0);
  const total = Number(row?.total_questions || totalQuestions || 0);

  return {
    done,
    review,
    notUpdated: Math.max(total - done - review, 0),
    completionPercent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}
