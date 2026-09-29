import 'server-only';

import { createClient } from '@/utils/supabase/server';

export type StudentCourseOption = {
  id: string;
  name: string;
  courseMode: 'full' | 'crash';
  cohortStartDate: string | null;
  isActive: boolean;
  enrolledAt: string;
};

export type StudentCourseSelection = {
  selectedCourseId: string | null;
  courses: StudentCourseOption[];
};

export async function loadStudentCourseSelection(): Promise<StudentCourseSelection> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_student_course_options');
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    throw error ?? new Error('Student course options are unavailable.');
  }

  const payload = data as Record<string, unknown>;
  const courses = Array.isArray(payload.courses) ? payload.courses : [];

  return {
    selectedCourseId: typeof payload.selected_course_id === 'string' ? payload.selected_course_id : null,
    courses: courses.flatMap((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
      const course = value as Record<string, unknown>;
      if (typeof course.id !== 'string' || typeof course.name !== 'string' || typeof course.enrolled_at !== 'string') return [];
      return [{
        id: course.id,
        name: course.name,
        courseMode: course.course_mode === 'crash' ? 'crash' : 'full',
        cohortStartDate: typeof course.cohort_start_date === 'string' ? course.cohort_start_date : null,
        isActive: course.is_active === true,
        enrolledAt: course.enrolled_at,
      }];
    }),
  };
}
