import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { NextResponse } from 'next/server.js';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('../src/app/api/admin/bulk-enroll/route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const existingStudent = { id: 'synthetic-student', full_name: 'Synthetic Student', role: 'student' };
const ok = data => ({ data, error: null });
const privateError = { message: 'private provider detail', details: 'synthetic-secret', code: '42501' };

function harness(options = {}) {
  const calls = { clients: 0, lookups: [], creates: [], profiles: [], enrollments: [], logs: [] };
  const client = {
    from: table => ({
      select: columns => {
        assert.equal(table, 'profiles');
        assert.equal(columns, 'id, full_name, role');
        return { eq: (column, email) => ({ maybeSingle: async () => {
          assert.equal(column, 'email');
          calls.lookups.push(email);
          if (options.lookupThrows) throw privateError;
          return options.lookups?.[calls.lookups.length - 1] ?? options.lookup ?? ok(existingStudent);
        } }) };
      },
      upsert: async (data, config) => {
        if (table === 'profiles') {
          calls.profiles.push(data);
          return { error: options.profileError ?? null };
        }
        assert.equal(table, 'enrollments');
        calls.enrollments.push(data);
        assert.equal(config.onConflict, 'user_id,course_id');
        assert.equal(config.ignoreDuplicates, true);
        return { error: options.enrollmentError ?? null };
      },
    }),
    auth: { admin: { createUser: async input => {
      calls.creates.push(input);
      return options.creation ?? ok({ user: { id: 'synthetic-new-student' } });
    } } },
  };
  const dependencies = {
    'next/server': { NextResponse },
    '@supabase/supabase-js': { createClient: () => { calls.clients++; return client; } },
    '@/lib/server/requireAdmin': { requireAdmin: async () => options.denied
      ? { authorized: false, response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
      : { authorized: true, userId: 'synthetic-admin' } },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    process: { env: options.missingConfig ? {} : {
      NEXT_PUBLIC_SUPABASE_URL: 'https://staging.example.invalid',
      SUPABASE_SERVICE_ROLE_KEY: 'synthetic-secret',
    } },
    console: { error: (...args) => calls.logs.push(args) },
    require: name => { assert(Object.hasOwn(dependencies, name)); return dependencies[name]; },
  });
  return { calls, async send(emails = ['student@example.test']) {
    const response = await exports.POST({ json: async () => ({ emails, courseId: 'synthetic-course' }) });
    const body = await response.json();
    assert.doesNotMatch(JSON.stringify([body, calls.logs]), /private provider|synthetic-secret|@example\.test/);
    return { status: response.status, body };
  } };
}

test('Admin authorization is required before constructing the privileged client', async () => {
  const app = harness({ denied: true });
  assert.equal((await app.send()).status, 403);
  assert.equal(app.calls.clients, 0);
});

test('a failed profile lookup cannot fall through to account creation or writes', async () => {
  for (const data of [null, existingStudent]) {
    const app = harness({ lookup: { data, error: privateError } });
    const { body } = await app.send();
    assert.equal(body.failed, 1);
    assert.equal(body.success, 0);
    assert.deepEqual(body.failures, [{ input: 1, stage: 'profile_lookup' }]);
    assert.equal(app.calls.creates.length + app.calls.profiles.length + app.calls.enrollments.length, 0);
  }
});

test('an existing Student profile is enrolled without creating an Auth account', async () => {
  const app = harness();
  const { body } = await app.send([' STUDENT@EXAMPLE.TEST ']);
  assert.equal(body.success, 1);
  assert.equal(body.failed, 0);
  assert.deepEqual(app.calls.lookups, ['student@example.test']);
  assert.equal(app.calls.creates.length, 0);
  assert.equal(app.calls.profiles[0].id, existingStudent.id);
  assert.equal(app.calls.enrollments[0].user_id, existingStudent.id);
});

test('an existing non-Student account is never demoted or activated by enrollment', async () => {
  for (const role of ['admin', 'instructor', null]) {
    const app = harness({ lookup: ok({ ...existingStudent, role }) });
    const { body } = await app.send();
    assert.equal(body.failures[0].stage, 'profile_role');
    assert.equal(app.calls.creates.length + app.calls.profiles.length + app.calls.enrollments.length, 0);
  }
});

test('a confirmed absent profile retains the new-Student provisioning path', async () => {
  const app = harness({ lookup: ok(null) });
  const { body } = await app.send();
  assert.equal(body.success, 1);
  assert.equal(app.calls.creates.length, 1);
  assert.equal(app.calls.profiles[0].id, 'synthetic-new-student');
  assert.equal(app.calls.profiles[0].role, 'student');
  assert.equal(app.calls.enrollments[0].user_id, 'synthetic-new-student');
});

test('failed account creation is distinguished from profile lookup and cannot enroll', async () => {
  for (const creation of [{ data: { user: null }, error: privateError }, ok({ user: null })]) {
    const app = harness({ lookup: ok(null), creation });
    const { body } = await app.send();
    assert.equal(body.failures[0].stage, 'account_creation');
    assert.equal(app.calls.profiles.length + app.calls.enrollments.length, 0);
  }
});

test('profile activation failure stops enrollment while identifying the failing stage', async () => {
  const app = harness({ profileError: privateError });
  const { body } = await app.send();
  assert.equal(body.failures[0].stage, 'profile_activation');
  assert.equal(app.calls.enrollments.length, 0);
});

test('enrollment failure reports that profile activation may already have happened', async () => {
  const app = harness({ enrollmentError: privateError });
  const { body } = await app.send();
  assert.equal(body.failures[0].stage, 'enrollment_write');
  assert.match(body.errors[0], /profile may already have been activated/);
  assert.equal(app.calls.profiles.length, 1);
  assert.equal(body.success, 0);
});

test('mixed batches keep truthful partial counts and identify failure by input position', async () => {
  const app = harness({ lookups: [{ data: null, error: privateError }, ok(existingStudent)] });
  const { body, status } = await app.send(['first@example.test', 'second@example.test']);
  assert.equal(status, 200);
  assert.equal(body.success, 1);
  assert.equal(body.failed, 1);
  assert.deepEqual(body.failures, [{ input: 1, stage: 'profile_lookup' }]);
  assert.equal(app.calls.creates.length, 0);
  assert.equal(app.calls.enrollments.length, 1);
});

test('configuration and unexpected lookup failures do not expose raw diagnostics', async () => {
  for (const options of [{ missingConfig: true }, { lookupThrows: true }]) {
    const app = harness(options);
    assert.equal((await app.send()).status, 500);
    assert.equal(app.calls.creates.length + app.calls.profiles.length + app.calls.enrollments.length, 0);
  }
});
