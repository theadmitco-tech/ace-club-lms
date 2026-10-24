import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('../src/app/admin/courses/CoursesClient.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const course = {
  id: 'synthetic-course', name: 'Synthetic QA batch', is_active: false,
  registration_open: false, capacity: 8, price_amount: 0, currency: 'INR',
  registration_closes_at: null, public_note: '', created_at: '2026-10-25T00:00:00Z',
  sessions: [], enrollments: [], registrations: [],
};

function elements(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(child => elements(child, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...elements(tree.props?.children, predicate)];
}
const button = (tree, label) => {
  const found = elements(tree, node => node.type === 'button' && node.props.children === label);
  assert.equal(found.length, 1, label);
  return found[0];
};
const input = tree => elements(tree, node => node.type === 'textarea')[0];

// Execute the actual component's event handlers with deterministic hooks and
// mocked I/O. This does not emulate browser rendering or React scheduling.
async function harness(options = {}) {
  let index = 0;
  const hooks = [];
  const calls = { updates: [], requests: [], toasts: [], courseReads: 0 };
  const supabase = { from: table => ({
    select: () => ({
      order: async () => {
        calls.courseReads++;
        if (calls.courseReads > 1 && options.refreshThrows) throw new Error('private transport detail');
        return { data: [course], error: calls.courseReads > 1 ? options.refreshError ?? null : null };
      },
      eq: async () => ({ data: [], error: null }),
    }),
    update: payload => ({ eq: async (key, value) => {
      calls.updates.push({ table, key, value, payload });
      if (options.updateThrows) throw new Error('private database detail');
      return { error: options.updateError ?? null };
    } }),
  }) };
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: {
      useState: initial => {
        const slot = index++;
        hooks[slot] ??= { value: initial };
        return [hooks[slot].value, value => {
          hooks[slot].value = typeof value === 'function' ? value(hooks[slot].value) : value;
        }];
      },
      useEffect: setup => { const slot = index++; if (!hooks[slot]) { hooks[slot] = {}; setup(); } },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: 'link' },
    '@/utils/supabase/client': { createClient: () => supabase },
    '@/lib/utils': { formatDate: value => value },
    '@/lib/AuthContext': { useAuth: () => ({ addToast: (kind, message) => calls.toasts.push({ kind, message }) }) },
    './BatchCreationBuilder': { default: 'batch-builder' },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    window: { setTimeout: callback => { callback(); return 1; }, clearTimeout() {} },
    console: { error() {} },
    fetch: async (url, init) => {
      calls.requests.push({ url, init });
      assert.equal(url, '/api/admin/bulk-enroll');
      assert.equal(init.method, 'POST');
      if (options.networkError) throw new Error('private transport detail');
      const status = options.status ?? 200;
      return { status, ok: status >= 200 && status < 300, json: async () => {
        if (options.invalidJson) throw new SyntaxError('private HTML');
        return Object.hasOwn(options, 'result') ? options.result : { success: 1, failed: 0, errors: [] };
      } };
    },
    require: name => {
      assert(Object.hasOwn(dependencies, name), `Unexpected dependency ${name}`);
      return dependencies[name];
    },
  });
  const render = () => { index = 0; return exports.default({ templates: [] }); };
  render();
  await new Promise(resolve => setImmediate(resolve));
  button(render(), 'Edit').props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  return {
    calls, render,
    enter: value => input(render()).props.onChange({ target: { value } }),
    submit: () => button(render(), 'Update Batch').props.onClick(),
  };
}

function retained(app, emails) {
  const tree = app.render();
  assert.equal(input(tree).props.value, emails);
  assert.equal(button(tree, 'Update Batch').props.disabled, false);
  const alerts = elements(tree, node => node.props.role === 'alert');
  assert.equal(alerts.length, 1);
  assert.equal(app.calls.toasts.some(toast => toast.kind === 'success'), false);
  assert.equal(JSON.stringify(app.calls.toasts).includes('private'), false);
  return alerts[0].props.children;
}

test('HTTP enrollment failures preserve input and display an error instead of batch success', async () => {
  for (const status of [400, 401, 403, 500]) {
    const app = await harness({ status });
    app.enter('student@example.test');
    await app.submit();
    const message = retained(app, 'student@example.test');
    assert.match(message, /Batch saved, but enrollment was not confirmed/);
    assert.equal(app.calls.requests.length, 1);
    assert.equal(app.calls.updates.length, 1);
  }
});

test('network, HTML and malformed responses cannot clear the form or claim enrollment', async () => {
  for (const options of [{ networkError: true }, { invalidJson: true }, { result: null },
    { result: { error: 'private detail' } }, { result: { success: 0, failed: 0 } },
    { result: { success: -1, failed: 2 } }, { result: { success: '1', failed: 0 } }]) {
    const app = await harness(options);
    app.enter('student@example.test');
    await app.submit();
    retained(app, 'student@example.test');
    assert.equal(app.calls.requests.length, 1, 'No automatic enrollment retry');
  }
});

test('partial enrollment reports counts and retains the entered list for review', async () => {
  const app = await harness({ result: { success: 1, failed: 1, errors: ['private detail'] } });
  const emails = 'first@example.test, second@example.test';
  app.enter(emails);
  await app.submit();
  assert.match(retained(app, emails), /1 of 2 students; 1 failed/);
});

test('failed batch saves stop before enrollment and always release the submitting state', async () => {
  for (const options of [{ updateError: { message: 'private database detail' } }, { updateThrows: true }]) {
    const app = await harness(options);
    app.enter('student@example.test');
    await app.submit();
    assert.match(retained(app, 'student@example.test'), /Enrollment was not attempted/);
    assert.equal(app.calls.requests.length, 0);
  }
});

test('invalid email entries stop all writes rather than silently dropping students', async () => {
  const app = await harness();
  app.enter('student@example.test, invalid-address');
  await app.submit();
  assert.match(retained(app, 'student@example.test, invalid-address'), /Nothing was saved/);
  assert.equal(app.calls.updates.length, 0);
  assert.equal(app.calls.requests.length, 0);
});

test('confirmed enrollment normalizes duplicate emails and closes the editor', async () => {
  const app = await harness();
  app.enter(' Student@Example.test, student@example.test\n');
  await app.submit();
  assert.deepEqual(JSON.parse(app.calls.requests[0].init.body), {
    emails: ['student@example.test'], courseId: course.id,
  });
  assert.equal(input(app.render()), undefined);
  assert.match(app.calls.toasts.at(-1).message, /Enrollment confirmed for 1 student\./);
  assert.equal(app.calls.toasts.at(-1).kind, 'success');
  assert.equal(app.calls.updates[0].payload.is_active, false);
  assert.equal(app.calls.updates[0].payload.registration_open, false);
});

test('saving without enrollment keeps the existing batch-only flow', async () => {
  const app = await harness();
  await app.submit();
  assert.equal(app.calls.requests.length, 0);
  assert.equal(input(app.render()), undefined);
  assert.equal(app.calls.toasts.at(-1).message, 'Batch updated.');
});

test('a failed list refresh after successful enrollment releases loading and identifies saved changes', async () => {
  for (const options of [{ refreshThrows: true }, { refreshError: { message: 'private database detail' } }]) {
    const app = await harness(options);
    app.enter('student@example.test');
    await app.submit();
    assert.match(retained(app, 'student@example.test'), /Changes saved, but the batch list could not be refreshed/);
    assert.equal(app.calls.requests.length, 1);
  }
});
