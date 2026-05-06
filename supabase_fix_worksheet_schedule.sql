-- Fix active worksheet rules and regenerated daily targets from the actual
-- master worksheet question sets. Student attempts are not modified.

CREATE OR REPLACE VIEW public.worksheet_schedule_mismatches AS
WITH expected_sections AS (
  SELECT *
  FROM (VALUES
    (1, NULL::TEXT),
    (2, 'quant'),
    (3, 'verbal'),
    (4, 'quant'),
    (5, 'verbal'),
    (6, 'quant'),
    (7, 'verbal'),
    (8, 'quant'),
    (9, 'verbal'),
    (10, 'quant'),
    (11, 'verbal'),
    (12, 'quant'),
    (13, 'di'),
    (14, 'di'),
    (15, 'di'),
    (16, 'di')
  ) AS expected(session_number, expected_section)
)
SELECT
  'rule_section_mismatch' AS issue,
  rule.session_number,
  rule.section AS actual_section,
  expected.expected_section,
  rule.id AS rule_id,
  NULL::UUID AS target_id
FROM public.master_worksheet_session_rules rule
LEFT JOIN expected_sections expected ON expected.session_number = rule.session_number
WHERE rule.is_active = true
  AND (
    expected.expected_section IS NULL
    OR rule.section <> expected.expected_section
  )
UNION ALL
SELECT
  'target_section_mismatch' AS issue,
  session.session_number,
  target.section AS actual_section,
  expected.expected_section,
  target.master_rule_id AS rule_id,
  target.id AS target_id
FROM public.worksheet_daily_targets target
JOIN public.sessions session ON session.id = target.session_id
LEFT JOIN expected_sections expected ON expected.session_number = session.session_number
WHERE target.is_active = true
  AND (
    expected.expected_section IS NULL
    OR target.section <> expected.expected_section
  );

CREATE OR REPLACE FUNCTION public.sync_course_worksheet_targets(p_course_id UUID)
RETURNS INTEGER AS $$
DECLARE
  active_plan_id UUID;
  generated_count INTEGER := 0;
  sess RECORD;
  rule RECORD;
  q_start INTEGER;
  q_end INTEGER;
  target_day DATE;
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
      target_day := public.next_worksheet_weekday(sess.session_date::DATE);

      WHILE q_start <= rule.end_question LOOP
        q_end := LEAST(q_start + rule.daily_target_count - 1, rule.end_question);

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

DO $$
DECLARE
  active_plan_id UUID;
BEGIN
  SELECT id INTO active_plan_id
  FROM public.master_worksheet_plans
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF active_plan_id IS NULL THEN
    RAISE NOTICE 'No active worksheet plan found.';
    RETURN;
  END IF;

  UPDATE public.master_worksheet_session_rules
  SET is_active = false
  WHERE plan_id = active_plan_id;

  INSERT INTO public.master_worksheet_session_rules (
    plan_id,
    master_session_id,
    session_number,
    section,
    start_question,
    end_question,
    daily_target_count,
    is_active
  )
  SELECT
    active_plan_id,
    master_session.id,
    master_session.session_number,
    CASE
      WHEN master_session.session_number IN (13, 14, 15, 16) THEN 'di'
      WHEN master_session.session_number IN (3, 5, 7, 9, 11) THEN 'verbal'
      WHEN master_session.session_number IN (2, 4, 6, 8, 10, 12) THEN 'quant'
    END,
    1,
    question_bounds.max_order_index,
    10,
    true
  FROM public.master_sessions master_session
  JOIN public.master_practice_sets master_set
    ON master_set.master_session_id = master_session.id
  JOIN LATERAL (
    SELECT MAX(order_index) AS max_order_index
    FROM public.master_practice_questions
    WHERE master_practice_set_id = master_set.id
  ) question_bounds ON COALESCE(question_bounds.max_order_index, 0) > 0
  WHERE master_session.session_number <> 1
    AND master_session.session_number BETWEEN 2 AND 16
  ON CONFLICT (plan_id, master_session_id)
  DO UPDATE SET
    session_number = EXCLUDED.session_number,
    section = EXCLUDED.section,
    start_question = EXCLUDED.start_question,
    end_question = EXCLUDED.end_question,
    daily_target_count = EXCLUDED.daily_target_count,
    is_active = EXCLUDED.is_active;
END;
$$;

SELECT public.sync_universal_worksheet_targets();

SELECT * FROM public.worksheet_schedule_mismatches;
