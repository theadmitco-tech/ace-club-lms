import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';
import { applyLatestMigrations } from './helpers/v2-latest-migrations.mjs';
import { preparePhase3Database, as, literal } from './helpers/v2-phase3-fixture.mjs';

// Synthetic accounts and batches in a disposable database; no hosted connection is used.
test('batch mocks are managed by Admins and shown only to enrolled students with active access', { timeout: 240000 }, () => withDisposablePostgres(async db => {
  const { query, rejects } = db;
  const f = preparePhase3Database(db);
  applyLatestMigrations(db);
  const b = f.batch('quant'); f.publish(b);
  const student = () => {
    const id = randomUUID();
    query(`insert into auth.users(id,email) values('${id}','${id}@example.invalid');update public.profiles set role='student',is_active=true where id='${id}'`);
    query(`select public.grant_v2_purchase('${id}',array['quant_crash'],'qa-${id}',now()-interval '1 day',(public.quote_v2_products(array['quant_crash'])->>'price_version_id')::uuid,1000000,'INR')`);
    return id;
  };
  const enrolled = student(), notEnrolled = student(), revoked = student();
  query(as(f.admin, `select public.set_v2_batch_enrollment('${b.id}','${enrolled}',true,0)`));
  query(as(f.admin, `select public.set_v2_batch_enrollment('${b.id}','${revoked}',true,0)`));
  // This student's access ends after enrolment: the purchase is revoked.
  query(`update public.v2_purchases set revoked_at=now() where student_id='${revoked}'`);
  const save = (who, mock = null, title = 'Mock 1', url = 'https://mocks.example.test/m1') =>
    as(who, `select public.save_v2_batch_mock('${b.id}',${mock ? `'${mock}'` : 'null'},${literal(title)},'2099-01-10T04:30:00Z','2099-01-10T08:00:00Z',${url ? literal(url) : 'null'},'Quiet room please')`);
  const mine = who => JSON.parse(query(as(who, 'select public.get_my_v2_mocks()')));

  rejects(save(enrolled), /Active Admin access required/);
  rejects(save(null, null, 'Mock', null).replace('authenticated', 'anon'), /permission denied/);
  for (const [title, url] of [['', null], ['Mock', 'http://insecure.example.test'], ['Mock', 'https://has space']]) rejects(save(f.admin, null, title, url), /check constraint|needs a title/);

  const { id } = JSON.parse(query(save(f.admin)));
  assert.equal(JSON.parse(query(as(f.admin, `select public.list_v2_batch_mocks('${b.id}')`))).length, 1);
  rejects(as(enrolled, `select public.list_v2_batch_mocks('${b.id}')`), /Active Admin access required/);

  const seen = mine(enrolled);
  assert.equal(seen.length, 1); assert.equal(seen[0].title, 'Mock 1'); assert.equal(seen[0].testUrl, 'https://mocks.example.test/m1');
  assert.deepEqual(mine(notEnrolled), [], 'not enrolled in the batch');
  assert.deepEqual(mine(revoked), [], 'enrolled without active access');

  query(save(f.admin, id, 'Mock 1 (rescheduled)', null));
  assert.equal(mine(enrolled)[0].title, 'Mock 1 (rescheduled)'); assert.equal(mine(enrolled)[0].testUrl, null);
  rejects(save(f.admin, randomUUID()), /Mock unavailable/);
  rejects(as(enrolled, 'select count(*) from public.v2_batch_mocks'), /permission denied/);

  assert.deepEqual(JSON.parse(query(as(f.admin, `select public.delete_v2_batch_mock('${b.id}','${id}')`))), { deleted: true });
  assert.deepEqual(mine(enrolled), []);
  assert.equal(query(`select count(*) from public.v2_feedback_obligations`), '0', 'mocks never create feedback obligations');
}));
