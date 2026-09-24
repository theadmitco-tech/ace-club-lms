do $$
declare
  function_definition text;
begin
  function_definition := pg_catalog.pg_get_functiondef(
    'public.begin_mock_question_import(text,text,text,text,jsonb,jsonb)'::pg_catalog.regprocedure
  );

  if pg_catalog.strpos(function_definition, 'jsonb_object_length(v_answer)') = 0 then
    raise exception 'Expected answer-key slot count expression was not found in begin_mock_question_import';
  end if;

  execute pg_catalog.replace(
    function_definition,
    'jsonb_object_length(v_answer)',
    '(select count(*) from pg_catalog.jsonb_object_keys(v_answer))'
  );

  function_definition := pg_catalog.pg_get_functiondef(
    'public.update_mock_question_draft(uuid,jsonb,jsonb,text,text,text,jsonb)'::pg_catalog.regprocedure
  );

  if pg_catalog.strpos(function_definition, 'jsonb_object_length(v_answer)') = 0 then
    raise exception 'Expected answer-key slot count expression was not found in update_mock_question_draft';
  end if;

  execute pg_catalog.replace(
    function_definition,
    'jsonb_object_length(v_answer)',
    '(select count(*) from pg_catalog.jsonb_object_keys(v_answer))'
  );
end;
$$;
