import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DataInsightsType,
  QuestionBankQuestion,
  QuestionBankSet,
  QuestionSetType,
  StandaloneQuestionType,
} from './types';

export interface StandaloneQuestionFilters {
  section?: 'Quant' | 'Verbal';
  questionType?: StandaloneQuestionType;
  primaryTopic?: string;
  subtopic?: string;
  difficulty?: number;
  activeOnly?: boolean;
}

export interface QuestionSetFilters {
  type?: QuestionSetType;
  diType?: DataInsightsType;
  primaryTopic?: string;
  subtopic?: string;
  difficulty?: number;
  activeOnly?: boolean;
}

export async function fetchStandaloneQuestions(
  supabase: SupabaseClient,
  filters: StandaloneQuestionFilters
) {
  let query = supabase
    .from('questions')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (filters.activeOnly !== false) query = query.eq('is_active', true);
  if (filters.section) query = query.eq('section', filters.section);
  if (filters.questionType) query = query.eq('question_type', filters.questionType);
  if (filters.primaryTopic) query = query.eq('primary_topic', filters.primaryTopic);
  if (filters.subtopic) query = query.eq('subtopic', filters.subtopic);
  if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as QuestionBankQuestion[];
}

export async function fetchQuestionSets(
  supabase: SupabaseClient,
  filters: QuestionSetFilters
) {
  let query = supabase
    .from('question_sets')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (filters.activeOnly !== false) query = query.eq('is_active', true);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.diType) query = query.eq('di_type', filters.diType);
  if (filters.primaryTopic) query = query.eq('primary_topic', filters.primaryTopic);
  if (filters.subtopic) query = query.eq('subtopic', filters.subtopic);
  if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as QuestionBankSet[];
}

export async function fetchQuestionSetWithQuestions(
  supabase: SupabaseClient,
  setId: string
) {
  const { data, error } = await supabase
    .from('question_sets')
    .select('*, set_questions(*)')
    .eq('id', setId)
    .single();

  if (error) throw error;
  return data as QuestionBankSet;
}
