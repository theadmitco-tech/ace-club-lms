begin;

alter table public.mock_question_revisions
  drop constraint mock_question_revision_type_response_check;

alter table public.mock_question_revisions
  add constraint mock_question_revision_type_response_check check (
    (question_type in ('PS', 'DS', 'CR', 'RC') and response_type = 'single_choice')
    or (question_type = 'GI' and response_type in ('single_choice', 'dropdowns'))
    or (question_type = 'MSR' and response_type in ('single_choice', 'dropdowns', 'binary_matrix'))
    or (question_type = 'TI' and response_type = 'binary_matrix')
    or (question_type = 'TPA' and response_type = 'two_part_matrix')
  );

commit;
