-- Native practice migration for an existing Ace Club LMS Supabase project.
-- Run this in Supabase SQL Editor before importing worksheet questions.

CREATE TABLE IF NOT EXISTS public.practice_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.practice_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_set_id UUID REFERENCES public.practice_sets(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'basic' CHECK (difficulty IN ('basic', 'advanced')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.practice_questions
ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'basic'
CHECK (difficulty IN ('basic', 'advanced'));

CREATE TABLE IF NOT EXISTS public.practice_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.practice_questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

ALTER TABLE public.practice_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Practice sets viewable by everyone" ON public.practice_sets;
DROP POLICY IF EXISTS "Practice questions viewable by everyone" ON public.practice_questions;
DROP POLICY IF EXISTS "Admins can manage practice sets" ON public.practice_sets;
DROP POLICY IF EXISTS "Admins can manage practice questions" ON public.practice_questions;
DROP POLICY IF EXISTS "Users can view own practice attempts" ON public.practice_attempts;
DROP POLICY IF EXISTS "Users can insert own practice attempts" ON public.practice_attempts;
DROP POLICY IF EXISTS "Users can update own practice attempts" ON public.practice_attempts;
DROP POLICY IF EXISTS "Admins can manage practice attempts" ON public.practice_attempts;

CREATE POLICY "Practice sets viewable by everyone" ON public.practice_sets FOR SELECT USING (true);
CREATE POLICY "Practice questions viewable by everyone" ON public.practice_questions FOR SELECT USING (true);
CREATE POLICY "Admins can manage practice sets" ON public.practice_sets
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage practice questions" ON public.practice_questions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can view own practice attempts" ON public.practice_attempts FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can insert own practice attempts" ON public.practice_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own practice attempts" ON public.practice_attempts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage practice attempts" ON public.practice_attempts FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
