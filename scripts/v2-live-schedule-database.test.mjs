import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';
import { applyLatestMigrations } from './helpers/v2-latest-migrations.mjs';
import { preparePhase3Database, as } from './helpers/v2-phase3-fixture.mjs';

// Synthetic accounts and batches in a disposable database; no hosted connection is used.
test('enrolled students see live class times without a seat; nothing private is exposed', { timeout: 240000 }, () => withDisposablePostgres(async db => {
  const { query, apply, rejects } = db;
  const f = preparePhase3Database(db);
  applyLatestMigrations(db);
  const b = f.batch('quant', true); f.publish(b);
  const student = () => {
    const id = randomUUID();
    query(`insert into auth.users(id,email) values('${id}','${id}@example.invalid');update public.profiles set role='student',is_active=true where id='${id}'`);
    query(`select public.grant_v2_purchase('${id}',array['quant_crash'],'qa-${id}',now()-interval '1 day',(public.quote_v2_products(array['quant_crash'])->>'price_version_id')::uuid,1000000,'INR')`);
    return id;
  };
  const enrolled = student(), outsider = student();
  query(as(f.admin, `select public.set_v2_batch_enrollment('${b.id}','${enrolled}',true,0)`));
  const schedule = who => JSON.parse(query(as(who, `select coalesce(public.get_my_v2_live_schedule('${b.id}'),'null'::jsonb)`)));

  const classes = schedule(enrolled);
  assert.equal(classes.length, 1); assert.equal(classes[0].key, b.eventKey); assert.equal(classes[0].title, 'Live class');
  assert.ok(classes[0].startsAt && classes[0].endsAt); assert.equal(classes[0].completedAt, null);
  assert.deepEqual(Object.keys(classes[0]).sort(), ['completedAt', 'endsAt', 'key', 'section', 'startsAt', 'title'], 'no Meet link or private detail');
  assert.equal(JSON.parse(query(as(enrolled, `select public.get_my_v2_learning_state('${b.id}')`))).liveEvents.length, 0, 'join details still need a live seat');
  assert.equal(schedule(outsider), null);
  rejects(`begin;set local role anon;select public.get_my_v2_live_schedule('${b.id}');commit;`, /permission denied/);
  query(`update public.v2_purchases set revoked_at=now() where student_id='${enrolled}'`);
  assert.equal(schedule(enrolled), null, 'ended access hides the schedule');
}));
