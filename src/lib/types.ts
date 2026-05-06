/* ============================================
   ACE CLUB LMS — Type Definitions
   ============================================ */

export type UserRole = 'admin' | 'student';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  course_id: string;
  title: string;
  session_number: number;
  session_date: string;
  is_published: boolean;
  created_at: string;
  materials?: Material[];
}

export type MaterialType = 'pre_read' | 'class_material' | 'worksheet' | 'video';

export interface Material {
  id: string;
  session_id: string;
  type: MaterialType;
  title: string;
  file_url?: string;
  notion_url?: string;
  video_url?: string;
  available_from: string;
  created_at: string;
}

export interface PracticeSet {
  id: string;
  session_id?: string;
  master_session_id?: string;
  title: string;
  created_at: string;
  questions?: PracticeQuestion[];
}

export interface PracticeQuestion {
  id: string;
  practice_set_id?: string;
  master_practice_set_id?: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: 'basic' | 'advanced';
  order_index: number;
  created_at: string;
  attempts?: PracticeAttempt[];
}

export interface PracticeAttempt {
  id: string;
  user_id: string;
  question_id?: string;
  master_question_id?: string;
  course_id?: string;
  session_id?: string;
  selected_answer: string;
  is_correct: boolean;
  answered_at: string;
}

export type QuestionBankSection = 'Quant' | 'Verbal' | 'DI';
export type StandaloneQuestionType = 'QA' | 'CR' | 'DS';
export type QuestionSetType = 'RC' | 'DI';
export type DataInsightsType = 'table' | 'graph' | 'caselet' | 'multi_source';
export type SetQuestionType = 'mcq' | 'multi_select' | 'numeric' | 'dropdown';
export type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E';

export interface QuestionBankQuestion {
  id: string;
  external_id?: string | null;
  import_batch_id?: string | null;
  section: 'Quant' | 'Verbal';
  question_type: StandaloneQuestionType;
  primary_topic: string;
  subtopic: string;
  difficulty: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e?: string | null;
  correct_option?: AnswerOption | null;
  correct_value?: string | null;
  explanation: string;
  short_explanation?: string | null;
  time_estimate_sec?: number | null;
  concept_tested?: string | null;
  common_trap?: string | null;
  skill?: string | null;
  tags?: string[] | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionBankSet {
  id: string;
  external_id?: string | null;
  import_batch_id?: string | null;
  type: QuestionSetType;
  di_type?: DataInsightsType | null;
  section: 'Verbal' | 'DI';
  primary_topic: string;
  subtopic: string;
  difficulty: number;
  passage_text?: string | null;
  stimulus_data?: Record<string, unknown> | null;
  time_estimate_sec?: number | null;
  concept_tested?: string | null;
  tags?: string[] | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  set_questions?: QuestionBankSetQuestion[];
}

export interface QuestionBankSetQuestion {
  id: string;
  external_id?: string | null;
  import_batch_id?: string | null;
  set_id: string;
  question_type: SetQuestionType;
  question_text: string;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  option_e?: string | null;
  correct_option?: AnswerOption | null;
  correct_options?: AnswerOption[] | null;
  correct_value?: string | null;
  explanation: string;
  short_explanation?: string | null;
  difficulty: number;
  time_estimate_sec?: number | null;
  concept_tested?: string | null;
  common_trap?: string | null;
  skill?: string | null;
  tags?: string[] | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}

export type WorksheetSectionKey = 'quant' | 'verbal' | 'di';

export interface MasterWorksheetPlan {
  id: string;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  master_worksheet_session_rules?: MasterWorksheetSessionRule[];
}

export interface MasterWorksheetSessionRule {
  id: string;
  plan_id: string;
  master_session_id: string;
  session_number: number;
  section: WorksheetSectionKey;
  start_question: number;
  end_question: number;
  daily_target_count: number;
  is_active: boolean;
  created_at: string;
}

export interface WorksheetDailyTarget {
  id: string;
  plan_id: string;
  course_id: string;
  session_id: string;
  master_rule_id?: string | null;
  target_date: string;
  section: WorksheetSectionKey;
  question_start: number;
  question_end: number;
  target_count: number;
  range_label: string;
  is_active: boolean;
  created_at: string;
}

export interface WorksheetLog {
  id: string;
  target_id: string;
  course_id: string;
  user_id: string;
  log_date: string;
  section: WorksheetSectionKey;
  attempted_count: number;
  attempted_range?: string | null;
  note?: string | null;
  created_at: string;
  updated_at?: string;
}

// UI State types
export interface SessionWithStatus extends Session {
  status: 'available' | 'locked' | 'upcoming';
  materialsStatus: {
    pre_read: MaterialStatus;
    class_material: MaterialStatus;
    worksheet: MaterialStatus;
    video: MaterialStatus;
  };
}

export interface MaterialStatus {
  available: boolean;
  material?: Material;
  available_from?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}
