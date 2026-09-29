-- Current GMAT Data Sufficiency questions belong to Data Insights. Existing
-- Pilot revisions may still be stored under Quant, so retain that legacy state
-- while allowing all newly normalized V1.2 imports to use Data Insights.
alter table public.mock_question_revisions
  drop constraint if exists mock_question_revision_type_section_check;

alter table public.mock_question_revisions
  add constraint mock_question_revision_type_section_check check (
    (question_type = 'PS' and section = 'quant')
    or (question_type = 'DS' and section in ('quant', 'data_insights'))
    or (question_type in ('CR', 'RC') and section = 'verbal')
    or (question_type in ('GI', 'TI', 'MSR', 'TPA') and section = 'data_insights')
  );
