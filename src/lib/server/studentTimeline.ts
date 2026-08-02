import 'server-only';

import type { StudentTimelinePayload } from '@/lib/studentTimeline';
import { createClient } from '@/utils/supabase/server';

type StudentTimelineResult =
  | { status: 'ready'; studentName: string; timeline: StudentTimelinePayload }
  | { status: 'failed'; studentName: string; message: string };

export async function loadStudentTimeline(studentId: string): Promise<StudentTimelineResult> {
  const supabase = await createClient();
  const [{ data: profile }, { data, error }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', studentId)
      .maybeSingle(),
    supabase.rpc('get_student_timeline'),
  ]);
  const studentName = profile?.full_name?.trim() || 'Student';

  if (error || !data) {
    console.error('Student timeline load failed:', error);
    return {
      status: 'failed',
      studentName,
      message: 'We could not load your course right now. Please retry. If the problem continues, contact the programme team.',
    };
  }

  return {
    status: 'ready',
    studentName,
    timeline: data as StudentTimelinePayload,
  };
}
