begin;

-- Product Owner-approved academic labels from 1 August 2026.
-- Stable curriculum keys, sequence, schedule, types and instructors are unchanged.
-- Keep the approved values inside each statement so this also works when an SQL
-- editor does not preserve temporary tables between statements.
update public.master_sessions as master
set title = approved.title
from (
  values
    ('w01-sat-verbal-1', 'VA 1: RC Intro + CR Inferences'),
    ('w01-sun-quant-1', 'QA 1: Fractions + Percentages + Ratios & Mixtures + SI/CI'),
    ('w02-fri-di-1', 'DI 1: DS + GI'),
    ('w02-sat-verbal-2', 'VA 2: RC Mind-Mapping + CR Finding the Assumptions'),
    ('w02-sun-quant-2', 'QA 2: Pipes & Cisterns + Work & Time + Speed, Time, Distance'),
    ('w03-fri-di-2', 'DI 2: DS + TA'),
    ('w03-sat-verbal-3', 'VA 3: RC Primary Purpose + CR Strengthen/Weaken the Conclusion'),
    ('w03-sun-quant-3', 'QA 3: Probability + Permutation & Combination'),
    ('w05-fri-di-3', 'DI 3: MSR + TPA'),
    ('w05-sat-verbal-4', 'VA 4: RC Point of View + CR Evaluate the Conclusion'),
    ('w05-sun-quant-4', 'QA 4: Polynomials + Functions + Equations + Inequalities'),
    ('w06-fri-di-4', 'DI 4: MSR + TPA (Non-Math)'),
    ('w06-sat-verbal-5', 'VA 5: RC Inference Qs + CR Complete the Argument'),
    ('w06-sun-quant-5', 'QA 5: Number Properties + Multiples & Factors + Powers & Roots + Exponents'),
    ('w07-fri-di-5', 'DI 5: Mix bag'),
    ('w07-sat-verbal-6', 'VA 6: RC Function & Role Qs + CR Paradoxes + Boldface'),
    ('w07-sun-quant-6', 'QA 6: Averages + Descriptive Stats + Set Theory + Progressions')
) as approved(curriculum_key, title)
where master.curriculum_key = approved.curriculum_key
  and master.curriculum_version = 'mvp-2026'
  and master.is_archived = false
  and master.title is distinct from approved.title;

do $$
declare
  approved_row_count integer;
begin
  select count(*)
  into approved_row_count
  from (
    values
      ('w01-sat-verbal-1', 'VA 1: RC Intro + CR Inferences'),
      ('w01-sun-quant-1', 'QA 1: Fractions + Percentages + Ratios & Mixtures + SI/CI'),
      ('w02-fri-di-1', 'DI 1: DS + GI'),
      ('w02-sat-verbal-2', 'VA 2: RC Mind-Mapping + CR Finding the Assumptions'),
      ('w02-sun-quant-2', 'QA 2: Pipes & Cisterns + Work & Time + Speed, Time, Distance'),
      ('w03-fri-di-2', 'DI 2: DS + TA'),
      ('w03-sat-verbal-3', 'VA 3: RC Primary Purpose + CR Strengthen/Weaken the Conclusion'),
      ('w03-sun-quant-3', 'QA 3: Probability + Permutation & Combination'),
      ('w05-fri-di-3', 'DI 3: MSR + TPA'),
      ('w05-sat-verbal-4', 'VA 4: RC Point of View + CR Evaluate the Conclusion'),
      ('w05-sun-quant-4', 'QA 4: Polynomials + Functions + Equations + Inequalities'),
      ('w06-fri-di-4', 'DI 4: MSR + TPA (Non-Math)'),
      ('w06-sat-verbal-5', 'VA 5: RC Inference Qs + CR Complete the Argument'),
      ('w06-sun-quant-5', 'QA 5: Number Properties + Multiples & Factors + Powers & Roots + Exponents'),
      ('w07-fri-di-5', 'DI 5: Mix bag'),
      ('w07-sat-verbal-6', 'VA 6: RC Function & Role Qs + CR Paradoxes + Boldface'),
      ('w07-sun-quant-6', 'QA 6: Averages + Descriptive Stats + Set Theory + Progressions')
  ) as approved(curriculum_key, title)
  join public.master_sessions as master
    on master.curriculum_key = approved.curriculum_key
   and master.curriculum_version = 'mvp-2026'
   and master.is_archived = false
   and master.title = approved.title;

  if approved_row_count <> 17 then
    raise exception
      'Expected 17 active mvp-2026 academic titles after refinement; found %',
      approved_row_count;
  end if;
end;
$$;

commit;
