'use server';

import { redirect } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { createClient } from '@/utils/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function selectStudentCourseAction(formData: FormData) {
  await requirePortalRole('student', { allowCourseSelection: true });
  const courseId = String(formData.get('courseId') ?? '');
  if (!UUID_PATTERN.test(courseId)) {
    throw new Error('Select a valid course.');
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('select_student_course', { p_course_id: courseId });
  if (error) throw error;

  redirect('/dashboard');
}
