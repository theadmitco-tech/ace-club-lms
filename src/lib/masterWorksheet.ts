import type { SupabaseClient } from '@supabase/supabase-js';

export type Difficulty = 'basic' | 'advanced';
export type QuestionType = 'problem_solving' | 'data_sufficiency' | 'critical_reasoning' | 'reading_comprehension' | 'data_insights';
export type DiQuestionType = 'data_sufficiency' | 'multi_source_reasoning' | 'table_analysis' | 'graphics_interpretation' | 'two_part_analysis';
export type AnswerMode = 'single_choice' | 'multi_select' | 'numeric' | 'two_part' | 'dropdown';
export type ContentFormat = 'plain' | 'markdown';
export type MasterSession = { id: string; title: string; session_number: number };
export type MasterPracticeSet = { id: string; master_session_id: string; title: string; created_at: string };
export type MasterPracticeQuestion = {
  id: string;
  master_practice_set_id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: Difficulty;
  question_type?: QuestionType;
  di_question_type?: DiQuestionType | null;
  answer_mode?: AnswerMode;
  stimulus_group_key?: string | null;
  stimulus_title?: string | null;
  stimulus_text?: string | null;
  stimulus_data?: Record<string, unknown> | null;
  content_format?: ContentFormat;
  admin_notes?: string | null;
  order_index: number;
  created_at: string;
};

export type MasterWorksheetResult =
  | { status: 'session-error' }
  | { status: 'tables-error'; session: MasterSession }
  | { status: 'ready'; session: MasterSession; practiceSet: MasterPracticeSet | null; questions: MasterPracticeQuestion[] };

// Uses the caller's browser client and existing RLS; never an elevated client.
export async function loadMasterWorksheet(supabase: SupabaseClient, sessionId: string): Promise<MasterWorksheetResult> {
  let session: MasterSession;
  try {
    const result = await supabase.from('master_sessions')
      .select('id, title, session_number').eq('id', sessionId).single();
    if (result.error || !result.data) return { status: 'session-error' };
    session = result.data;
  } catch {
    return { status: 'session-error' };
  }

  try {
    const { data: sets, error: setError } = await supabase.from('master_practice_sets')
      .select('*').eq('master_session_id', sessionId)
      .order('created_at', { ascending: true }).limit(1);
    if (setError) throw setError;
    const practiceSet = (sets?.[0] || null) as MasterPracticeSet | null;
    if (!practiceSet) return { status: 'ready', session, practiceSet: null, questions: [] };

    const { data, error } = await supabase.from('master_practice_questions')
      .select('*').eq('master_practice_set_id', practiceSet.id)
      .order('order_index', { ascending: true });
    if (error) throw error;
    const questions = ((data || []) as MasterPracticeQuestion[]).map((question) => ({
      ...question,
      options: Array.isArray(question.options) ? question.options : [],
    }));
    return { status: 'ready', session, practiceSet, questions };
  } catch {
    return { status: 'tables-error', session };
  }
}
