import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';
import { applyLatestMigrations } from './helpers/v2-latest-migrations.mjs';
import { preparePhase3Database, as, json, literal } from './helpers/v2-phase3-fixture.mjs';

// Synthetic students and obligations in a disposable database; no hosted connection is used.
test('Tally feedback is service-only, clears only its own obligation and replays safely', { timeout: 240000 }, () => withDisposablePostgres(async db => {
  const { query, rejects } = db;
  const f = preparePhase3Database(db);
  applyLatestMigrations(db);
  const b = f.batch('quant'); f.publish(b);
  const student = () => { const id = randomUUID(); query(`insert into auth.users(id,email) values('${id}','${id}@example.invalid');update public.profiles set is_active=true,role='student' where id='${id}'`); return id; };
  const s = student(), other = student();
  const obligation = id => query(`insert into public.v2_feedback_obligations(student_id,batch_id,session_key,session_title,section,source,source_key,publication_revision)
    values('${id}','${b.id}','${b.sessionKey}','Public outline heading','quant','recording','${randomUUID()}',1) returning id`);
  const due = obligation(s), otherDue = obligation(other);
  const pending = id => Number(query(`select count(*) from public.v2_feedback_obligations where student_id='${id}' and feedback_id is null`));
  const tally = (owner, ob, submission, role = 'service_role', response = { formId: 'synthetic', fields: [] }) =>
    as(owner, `select public.record_v2_tally_feedback('${ob}','${owner}',${literal(submission)},${json(response)})`, role);

  rejects(tally(s, due, 'sub_browser', 'authenticated'), /permission denied/);
  rejects(tally(s, due, 'sub_anon', 'anon'), /permission denied/);
  rejects(tally(other, due, 'sub_other'), /obligation unavailable/);
  for (const bad of ['', 'has space', 'x'.repeat(121)]) rejects(tally(s, due, bad), /Invalid Tally submission/);
  assert.equal(pending(s), 1);

  assert.deepEqual(JSON.parse(query(tally(s, due, 'sub_1'))), { submitted: true, replayed: false });
  assert.equal(pending(s), 0); assert.equal(pending(other), 1);
  assert.deepEqual(JSON.parse(query(tally(s, due, 'sub_1'))), { submitted: true, replayed: true });
  assert.deepEqual(JSON.parse(query(tally(s, due, 'sub_2'))), { submitted: true, replayed: false });
  assert.equal(query(`select string_agg(provider||'|'||confirmation_reference,',') from public.v2_session_feedback where student_id='${s}'`), 'tally|tally:sub_1');
  rejects(tally(other, otherDue, 'sub_1'), /another student/);
  assert.equal(pending(other), 1);
  rejects(`insert into public.v2_session_feedback(student_id,batch_id,session_key,request_id,confirmation_reference,provider,response) values('${other}','${b.id}','${b.sessionKey}','${randomUUID()}','x','email','{}')`, /provider_check/);
}));
