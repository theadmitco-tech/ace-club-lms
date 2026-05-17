-- Regenerate worksheet targets so each conducted session is spread across
-- the Monday-Friday after that session's weekend class.
--
-- Example:
-- - Session 2 on Sun, May 3 with Q1-Q50 becomes:
--   Mon Q1-Q10, Tue Q11-Q20, Wed Q21-Q30, Thu Q31-Q40, Fri Q41-Q50
-- - If Saturday and Sunday sessions both have rules, both start on the same
--   following Monday, so students work on two sessions in parallel that week.

CREATE OR REPLACE FUNCTION public.sync_course_worksheet_targets(p_course_id UUID)
RETURNS INTEGER AS $$
DECLARE
  active_plan_id UUID;
  generated_count INTEGER := 0;
  sess RECORD;
  rule RECORD;
  q_start INTEGER;
  q_end INTEGER;
  total_questions INTEGER;
  remaining_questions INTEGER;
  remaining_days INTEGER;
  chunk_count INTEGER;
  target_day DATE;
  day_index INTEGER;
BEGIN
  SELECT id INTO active_plan_id
  FROM public.master_worksheet_plans
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF active_plan_id IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.worksheet_daily_targets target
  SET is_active = false
  WHERE target.course_id = p_course_id
    AND target.plan_id = active_plan_id
    AND target.is_active = true;

  FOR sess IN
    SELECT id, course_id, session_number, session_date
    FROM public.sessions
    WHERE course_id = p_course_id
      AND is_published = true
      AND session_number > 1
    ORDER BY session_number
  LOOP
    FOR rule IN
      SELECT *
      FROM public.master_worksheet_session_rules
      WHERE plan_id = active_plan_id
        AND session_number = sess.session_number
        AND is_active = true
      ORDER BY section
    LOOP
      q_start := rule.start_question;
      total_questions := GREATEST(rule.end_question - rule.start_question + 1, 0);
      target_day := public.next_worksheet_weekday(sess.session_date::DATE);

      FOR day_index IN 0..4 LOOP
        EXIT WHEN q_start > rule.end_question OR total_questions <= 0;

        remaining_questions := rule.end_question - q_start + 1;
        remaining_days := 5 - day_index;
        chunk_count := CEIL(remaining_questions::NUMERIC / remaining_days::NUMERIC)::INTEGER;
        q_end := LEAST(q_start + chunk_count - 1, rule.end_question);

        INSERT INTO public.worksheet_daily_targets (
          plan_id,
          course_id,
          session_id,
          master_rule_id,
          target_date,
          section,
          question_start,
          question_end,
          target_count,
          range_label,
          is_active
        )
        VALUES (
          active_plan_id,
          sess.course_id,
          sess.id,
          rule.id,
          target_day,
          rule.section,
          q_start,
          q_end,
          q_end - q_start + 1,
          'Q' || q_start || '-Q' || q_end,
          true
        )
        ON CONFLICT (course_id, session_id, section, target_date, question_start, question_end)
        DO UPDATE SET
          plan_id = EXCLUDED.plan_id,
          master_rule_id = EXCLUDED.master_rule_id,
          target_count = EXCLUDED.target_count,
          range_label = EXCLUDED.range_label,
          is_active = true;

        generated_count := generated_count + 1;
        q_start := q_end + 1;
        target_day := public.next_worksheet_weekday(target_day + 1);
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN generated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Run this after replacing the function for each existing course:
-- SELECT public.sync_course_worksheet_targets('<course_id>');
