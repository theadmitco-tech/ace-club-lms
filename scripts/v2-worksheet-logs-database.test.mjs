import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';
import { applyLatestMigrations } from './helpers/v2-latest-migrations.mjs';
import { preparePhase3Database, as } from './helpers/v2-phase3-fixture.mjs';

// Synthetic accounts, batches and worksheets in a disposable database; no hosted connection is used.
test('V2 practice logs follow worksheet access and the master question list', { timeout: 240000 }, () => withDisposablePostgres(async db => {
  const { query, apply, rejects } = db;
  const f = preparePhase3Database(db);
  applyLatestMigrations(db);
  const b = f.batch('quant'); f.publish(b);
  const worksheet = b.document.sessions[0].content.materials[0];
  // The master worksheet shares the V2 item's file address and has three questions.
  const masterSession = query(`insert into public.master_sessions(title,session_number) values('Quant 1',1) returning id`);
  const master = query(`insert into public.master_materials(master_session_id,type,title,file_url) values('${masterSession}','worksheet','Worksheet 1','${worksheet.url}') returning id`);
  const questions = [1, 2, 3].map(n => query(`insert into public.master_worksheet_questions(master_material_id,question_number) values('${master}',${n}) returning id`));
  const student = () => {
    const id = randomUUID();
    query(`insert into auth.users(id,email) values('${id}','${id}@example.invalid');update public.profiles set role='student',is_active=true where id='${id}'`);
    query(`select public.grant_v2_purchase('${id}',array['quant_crash'],'qa-${id}',now()-interval '1 day',(public.quote_v2_products(array['quant_crash'])->>'price_version_id')::uuid,1000000,'INR')`);
    return id;
  };
  const s = student(), outsider = student();
  query(as(f.admin, `select public.set_v2_batch_enrollment('${b.id}','${s}',true,0)`));
  const read = (who, item = worksheet.key) => JSON.parse(query(as(who, `select public.get_my_v2_worksheet_log('${b.id}','${b.sessionKey}','${item}')`)));
  const save = (who, question, status = 'done', seconds = 90, comment = 'Ratio trap') =>
    as(who, `select public.update_my_v2_worksheet_log('${b.id}','${b.sessionKey}','${worksheet.key}','${question}',${status ? `'${status}'` : 'null'},${seconds ?? 'null'},${comment ? `'${comment}'` : 'null'})`);

  const log = read(s);
  assert.equal(log.title, worksheet.title); assert.equal(log.questions.length, 3);
  assert.deepEqual(log.questions.map(q => q.question_number), [1, 2, 3]); assert.ok(log.questions.every(q => q.status === null && q.updated_at === null));

  const receipt = JSON.parse(query(save(s, questions[1])));
  assert.equal(receipt.id, questions[1]); assert.equal(receipt.status, 'done'); assert.equal(receipt.time_taken_seconds, 90); assert.equal(receipt.comment, 'Ratio trap');
  assert.equal(read(s).questions[1].status, 'done');
  query(save(s, questions[1], null, null, '  '));
  const kept = read(s).questions[1]; assert.equal(kept.status, 'done', 'a blank status keeps the earlier one'); assert.equal(kept.time_taken_seconds, null); assert.equal(kept.comment, null);

  rejects(as(outsider, `select public.get_my_v2_worksheet_log('${b.id}','${b.sessionKey}','${worksheet.key}')`), /Worksheet unavailable/);
  rejects(save(outsider, questions[0]), /Worksheet unavailable/);
  rejects(as(s, `select public.get_my_v2_worksheet_log('${b.id}','${b.sessionKey}','${randomUUID()}')`), /Worksheet unavailable/);
  const otherMaster = query(`insert into public.master_materials(master_session_id,type,title,file_url) values('${masterSession}','worksheet','Other','https://other.example.test') returning id`);
  const foreignQuestion = query(`insert into public.master_worksheet_questions(master_material_id,question_number) values('${otherMaster}',1) returning id`);
  rejects(save(s, foreignQuestion), /Question log access required/);
  for (const [status, seconds] of [['finished', 1], ['done', -1]]) rejects(save(s, questions[0], status, seconds), /Invalid/);
  rejects(as(s, 'select count(*) from public.v2_worksheet_logs'), /permission denied/);
  rejects(`begin;set local role anon;select public.get_my_v2_worksheet_log('${b.id}','${b.sessionKey}','${worksheet.key}');commit;`, /permission denied/);
}));
