import 'server-only';

import type {
  StudentPracticeOverview,
  StudentWorksheetLog,
} from '@/lib/studentPractice';
import { createClient } from '@/utils/supabase/server';

type PracticeOverviewResult =
  | { status: 'ready'; data: StudentPracticeOverview }
  | { status: 'failed'; message: string };

type WorksheetLogResult =
  | { status: 'ready'; data: StudentWorksheetLog }
  | { status: 'failed'; message: string };

export async function loadStudentPracticeOverview(): Promise<PracticeOverviewResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_student_practice_log');

  if (error || !data) {
    console.error('Student practice overview load failed:', error);
    return {
      status: 'failed',
      message: 'We could not load your Practice log right now. Retry, or contact the programme team if the problem continues.',
    };
  }

  return { status: 'ready', data: data as StudentPracticeOverview };
}

export async function loadStudentWorksheetLog(materialId: string): Promise<WorksheetLogResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_student_worksheet_log', {
    p_material_id: materialId,
  });

  if (error || !data) {
    console.error('Student worksheet log load failed:', error);
    return {
      status: 'failed',
      message: 'We could not load this worksheet log. Retry from the worksheet, or contact the programme team if the problem continues.',
    };
  }

  return { status: 'ready', data: data as StudentWorksheetLog };
}
