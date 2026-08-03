import 'server-only';

import type {
  AdminCoursePracticeProgress,
  AdminStudentWorksheetProgress,
} from '@/lib/adminPractice';
import { createClient } from '@/utils/supabase/server';

type AdminPracticeResult<T> =
  | { status: 'ready'; data: T }
  | { status: 'failed'; message: string };

export async function loadAdminCoursePracticeProgress(
  courseId: string,
): Promise<AdminPracticeResult<AdminCoursePracticeProgress>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_admin_course_practice_progress', {
    p_course_id: courseId,
  });

  if (error || !data) {
    console.error('Admin cohort practice progress load failed:', error);
    return {
      status: 'failed',
      message: 'We could not load tracker progress for this batch. Retry, or contact support if the problem continues.',
    };
  }

  return { status: 'ready', data: data as AdminCoursePracticeProgress };
}

export async function loadAdminStudentWorksheetProgress(
  courseId: string,
  userId: string,
  materialId: string,
): Promise<AdminPracticeResult<AdminStudentWorksheetProgress>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_admin_student_worksheet_progress', {
    p_course_id: courseId,
    p_user_id: userId,
    p_material_id: materialId,
  });

  if (error || !data) {
    console.error('Admin Student worksheet progress load failed:', error);
    return {
      status: 'failed',
      message: 'We could not load this Student worksheet log. Return to batch progress and try again.',
    };
  }

  return { status: 'ready', data: data as AdminStudentWorksheetProgress };
}
