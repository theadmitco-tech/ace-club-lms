import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(compiled, { exports, ...globals, require: (name) => {
    assert(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

// Component handlers run with deterministic hook/effect and navigation adapters.
// These tests do not simulate a browser, React scheduling or Next.js routing.
function harness() {
  let scope;
  let index;
  let context;
  const scopes = new Map();
  const listeners = new Set();
  const state = { accept: false, confirmations: 0, pushes: [], replacements: [], logouts: 0, refreshes: 0,
    user: { role: 'admin', full_name: 'Synthetic Admin', email: 'admin@example.test' } };
  const react = {
    createContext: (value) => (context = { value, Provider: 'context-provider' }),
    useContext: (value) => value.value,
    useRef: (value) => scope[index++] ??= { current: value },
    useState: (value) => {
      const slot = index++;
      const hooks = scope;
      hooks[slot] ??= { value: typeof value === 'function' ? value() : value };
      return [hooks[slot].value, (next) => {
        hooks[slot].value = typeof next === 'function' ? next(hooks[slot].value) : next;
      }];
    },
    useCallback: (callback) => callback,
    useMemo: (factory) => factory(),
    useEffect: (setup, dependencies) => {
      const slot = index++;
      const previous = scope[slot];
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        previous?.cleanup?.();
        scope[slot] = { dependencies, setup };
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const window = {
    confirm: () => { state.confirmations++; return state.accept; },
    addEventListener: (name, handler) => { assert.equal(name, 'beforeunload'); listeners.add(handler); },
    removeEventListener: (name, handler) => { assert.equal(name, 'beforeunload'); listeners.delete(handler); },
  };
  const router = { push: (url) => state.pushes.push(url), replace: (url) => state.replacements.push(url),
    refresh: () => { state.refreshes++; } };
  const dependencies = { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': { default: 'next-link' },
    '@/components/DraftRecovery': { DraftRecoveryNotice: 'recovery-notice', useDraftRecovery: () => ({ recovered: null, remember() {}, forget() {}, acknowledge() {}, unavailable: false }) },
    '@/lib/v2WorkspaceRecovery': {},
    'next/navigation': { useRouter: () => router, usePathname: () => '/admin/v2/templates' } };
  const component = (path, extra = {}) => load(path, { ...dependencies, ...extra }, {
    window, crypto: { randomUUID }, structuredClone,
  });
  function render(key, renderComponent) {
    if (!scopes.has(key)) scopes.set(key, []);
    scope = scopes.get(key);
    index = 0;
    const tree = renderComponent();
    for (const hook of scope) {
      if (hook?.setup) { hook.cleanup = hook.setup(); delete hook.setup; }
    }
    return tree;
  }
  function unmount(key) {
    for (const hook of scopes.get(key) ?? []) hook?.cleanup?.();
    scopes.delete(key);
  }
  const navigation = component('src/components/AdminDraftNavigation.tsx');
  context.value = render('provider', () => navigation.AdminDraftNavigationProvider({ children: null })).props.value;
  dependencies['@/components/AdminDraftNavigation'] = navigation;
  return { state, listeners, component, render, unmount, navigation, guard: context.value };
}

function elements(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap((child) => elements(child, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...elements(tree.props?.children, predicate)];
}
const element = (tree, predicate) => {
  const matches = elements(tree, predicate);
  assert.equal(matches.length, 1, 'Expected one matching element');
  return matches[0];
};
const event = () => ({ prevented: false, preventDefault() { this.prevented = true; } });
const templates = load('src/lib/v2Templates.ts');
const batches = load('src/lib/v2Batches.ts', { './v2Templates': templates });
const meetings = load('src/lib/v2Meetings.ts', { './v2Batches': batches });
const batch = () => ({
  id: randomUUID(), templateId: randomUUID(), templateRevision: 1, revision: 1, state: 'draft',
  productCode: 'quant_crash', title: 'Synthetic batch', startDate: '2028-01-01', timeZone: 'Asia/Kolkata',
  events: [{ key: randomUUID(), title: 'Synthetic lesson', section: 'quant', localDate: '2028-01-01',
    localStartTime: '18:00', durationMinutes: 60, instructor: '', capacity: 8,
    startsAt: '2028-01-01T12:30:00.000Z', endsAt: '2028-01-01T13:30:00.000Z' }],
});

test('publication confirmation requires preview and an interrupted retry retains the reviewed request', async () => {
  const app = harness();
  const draft = batch();
  const calls = [];
  let interrupt = true;
  const fingerprint = 'a'.repeat(32);
  const document = { batchId: draft.id, batchRevision: 1, revision: 1, state: 'published',
    title: draft.title, productCode: draft.productCode, sections: ['quant'], timeZone: draft.timeZone,
    liveRegistrationLimit: 8, events: [] };
  const { default: Panel } = app.component('src/app/admin/v2/batches/PublicationPanel.tsx', {
    '@/lib/v2Templates': templates, '../templates/templates.module.css': { default: {} },
    './actions': {
      previewBatchPublicationAction: async (input) => {
        calls.push(['preview', input]); return { status: 'success', proposal: { document, fingerprint } };
      },
      saveBatchPublicationAction: async (input, proof) => {
        calls.push(['save', input, proof]);
        if (interrupt) throw new Error('Synthetic interrupted confirmation');
        return { status: 'success', document, replayed: true };
      },
    },
  });
  const render = () => app.render('publication', () => Panel({ drafts: [draft], publications: [] }));
  let tree = render();
  assert.equal(elements(tree, (node) => node.props?.children === 'Confirm publish').length, 0);
  await element(tree, (node) => node.type === 'button' && node.props.children === 'Preview publication').props.onClick();
  tree = render();
  assert.equal(app.guard.confirmLeave(), false);
  const scope = element(tree, (node) => node.type === 'h3' && node.props.id === 'publication-scope');
  assert(scope);
  await element(tree, (node) => node.type === 'button' && node.props.children === 'Confirm publish').props.onClick();
  tree = render();
  assert.match(element(tree, (node) => node.props.role === 'alert').props.children, /interrupted/);
  assert.equal(app.guard.confirmLeave(), false);
  interrupt = false;
  await element(tree, (node) => node.type === 'button' && node.props.children === 'Confirm publish').props.onClick();
  tree = render();
  assert.equal(app.guard.confirmLeave(), true);
  assert.equal(app.state.refreshes, 1);
  assert.deepEqual(calls[1], calls[2]);
  assert.match(element(tree, (node) => node.props.role === 'status').props.children, /previous confirmation recovered/);
});

test('canceling publication preview writes nothing and releases its navigation guard', async () => {
  const app = harness(); const draft = batch(); let saves = 0;
  const { default: Panel } = app.component('src/app/admin/v2/batches/PublicationPanel.tsx', {
    '@/lib/v2Templates': templates, '../templates/templates.module.css': { default: {} },
    './actions': {
      previewBatchPublicationAction: async () => ({ status: 'success', proposal: { fingerprint: 'a'.repeat(32),
        document: { ...draft, sections: ['quant'], batchRevision: 1, liveRegistrationLimit: null } } }),
      saveBatchPublicationAction: async () => { saves++; },
    },
  });
  const render = () => app.render('publication', () => Panel({ drafts: [draft], publications: [] }));
  await element(render(), (node) => node.type === 'button' && node.props.children === 'Preview publication').props.onClick();
  element(render(), (node) => node.type === 'button' && node.props.children === 'Cancel review').props.onClick();
  render();
  assert.equal(saves, 0);
  assert.equal(app.guard.confirmLeave(), true);
});

test('clean, dirty, saved and unmounted forms register and clear navigation/unload warnings', () => {
  const app = harness();
  const render = (dirty) => app.render('editor', () => app.navigation.useAdminDraftGuard(dirty));
  render(false);
  assert.equal(app.guard.confirmLeave(), true);
  assert.equal(app.state.confirmations, 0);
  assert.equal(app.listeners.size, 0);
  render(true);
  assert.equal(app.guard.confirmLeave(), false);
  const unload = event();
  for (const listener of app.listeners) listener(unload);
  assert.equal(unload.prevented, true);
  assert.equal(unload.returnValue, '');
  render(false);
  assert.equal(app.guard.confirmLeave(), true);
  assert.equal(app.listeners.size, 0);
  render(true);
  app.unmount('editor');
  assert.equal(app.guard.confirmLeave(), true);
  assert.equal(app.listeners.size, 0);
});

test('cleaning one mounted editor does not erase another editor warning', () => {
  const app = harness();
  for (const key of ['first', 'second']) app.render(key, () => app.navigation.useAdminDraftGuard(true));
  app.unmount('first');
  assert.equal(app.guard.confirmLeave(), false);
  assert.equal(app.listeners.size, 1);
  app.unmount('first');
  app.unmount('second');
  assert.equal(app.guard.confirmLeave(), true);
  assert.equal(app.listeners.size, 0);
});

test('links cancel same-tab navigation without attaching a click blocker to new-tab gestures', () => {
  const app = harness();
  app.render('editor', () => app.navigation.useAdminDraftGuard(true));
  let navigations = 0;
  const link = app.navigation.AdminDraftLink({ href: '/admin/v2/batches', prefetch: false,
    children: 'Batch drafts', onNavigate: () => { navigations++; } });
  assert.equal(link.props.onClick, undefined);
  assert.equal(link.props.href, '/admin/v2/batches');
  assert.equal(link.props.prefetch, false);
  const declined = event();
  link.props.onNavigate(declined);
  assert.equal(declined.prevented, true);
  assert.equal(navigations, 0);
  app.state.accept = true;
  const accepted = event();
  link.props.onNavigate(accepted);
  assert.equal(accepted.prevented, false);
  assert.equal(navigations, 1);
  app.unmount('editor');
  app.state.accept = false;
  link.props.onNavigate(event());
  assert.equal(navigations, 2);
  assert.equal(app.state.confirmations, 2);
});

function shell(app) {
  const { default: Shell } = app.component('src/app/admin/AdminShell.tsx', {
    '@/components/BrandLogo': { BrandLogo: 'brand-logo' }, './admin.css': {},
    '@/lib/AuthContext': { useAuth: () => ({ user: app.state.user, isLoading: false,
      logout: () => { app.state.logouts++; } }) },
  });
  const content = Shell({ children: null }).props.children;
  return app.render('shell', () => content.type(content.props));
}

test('sidebar and sign-out respect cancellation and preserve clean-page navigation', () => {
  const app = harness();
  const tree = shell(app);
  const dashboard = elements(tree, (node) => node.type === 'button' && node.props.className?.startsWith('sidebar-nav-item'))[0];
  const signOut = element(tree, (node) => node.type === 'button' && node.props.children === 'Sign Out');
  app.render('editor', () => app.navigation.useAdminDraftGuard(true));
  dashboard.props.onClick();
  signOut.props.onClick();
  assert.deepEqual(app.state.pushes, []);
  assert.equal(app.state.logouts, 0);
  app.state.accept = true;
  dashboard.props.onClick();
  signOut.props.onClick();
  assert.deepEqual(app.state.pushes, ['/admin']);
  assert.equal(app.state.logouts, 1);
  app.unmount('editor');
  app.state.accept = false;
  const prompts = app.state.confirmations;
  dashboard.props.onClick();
  signOut.props.onClick();
  assert.equal(app.state.confirmations, prompts);
  assert.equal(app.state.logouts, 2);
});

test('dirty forms never block signed-out or non-Admin authorization redirects', () => {
  for (const user of [null, { role: 'student' }]) {
    const app = harness();
    app.render('editor', () => app.navigation.useAdminDraftGuard(true));
    app.state.user = user;
    shell(app);
    assert.deepEqual(app.state.replacements, [user ? '/dashboard' : '/login']);
    assert.equal(app.state.confirmations, 0);
  }
});

test('template save failures retain warnings, retries retain their token, successful saves clear warnings', async () => {
  const app = harness();
  const calls = [];
  let resolveSave;
  const { default: Editor } = app.component('src/app/admin/v2/templates/TemplateEditor.tsx', {
    '@/lib/v2Templates': templates, './templates.module.css': { default: {} },
    './actions': { saveTemplateDraftAction: (input) => {
      calls.push(input);
      return new Promise((resolve) => { resolveSave = resolve; });
    } },
  });
  const render = () => app.render('editor', () => Editor({ templates: [] }));
  let tree = render();
  element(tree, (node) => node.type === 'button' && node.props.children === 'Full Batch').props.onClick();
  tree = render();
  element(tree, (node) => node.props.id === 'template-title').props.onChange({ target: { value: 'Synthetic template' } });
  tree = render();
  assert.equal(app.guard.confirmLeave(), false);
  const firstSave = element(tree, (node) => node.type === 'form').props.onSubmit(event());
  render();
  assert.equal(app.guard.confirmLeave(), false);
  resolveSave({ status: 'error', message: 'Synthetic interrupted save' });
  await firstSave;
  tree = render();
  assert.equal(app.guard.confirmLeave(), false);
  const retry = element(tree, (node) => node.type === 'form').props.onSubmit(event());
  render();
  assert.equal(calls[0].requestId, calls[1].requestId);
  resolveSave({ status: 'success', replayed: true, template: {
    id: calls[1].id, productCode: calls[1].productCode, revision: 1, document: calls[1].document,
  } });
  await retry;
  render();
  assert.equal(app.guard.confirmLeave(), true);
  assert.equal(app.listeners.size, 0);
  assert.equal(app.state.refreshes, 1);
});

test('meeting links respect unsaved batch edits and other mounted draft guards', () => {
  const app = harness();
  const draft = batch();
  const { default: Editor } = app.component('src/app/admin/v2/batches/BatchDraftEditor.tsx', {
    '@/lib/v2Templates': templates, '@/lib/v2Batches': batches, '../templates/templates.module.css': { default: {} }, './actions': {},
  });
  const render = () => app.render('editor', () => Editor({ drafts: [draft], templates: [] }));
  let tree = render();
  elements(tree, (node) => node.type === 'button')[0].props.onClick();
  tree = render();
  assert.equal(app.guard.confirmLeave(), true);
  element(tree, (node) => node.props.id === 'v2-batch-title').props.onChange({ target: { value: 'Changed title' } });
  tree = render();
  assert.equal(app.guard.confirmLeave(), false);
  const link = element(tree, (node) => node.props.href?.endsWith('/meeting'));
  assert.equal(link.props.onClick, undefined);
  const navigation = event();
  app.navigation.AdminDraftLink(link.props).props.onNavigate(navigation);
  assert.equal(navigation.prevented, true);
  app.unmount('editor');
  assert.equal(app.guard.confirmLeave(), true);
  app.render('publication', () => app.navigation.useAdminDraftGuard(true));
  const publicationNavigation = event();
  app.navigation.AdminDraftLink(link.props).props.onNavigate(publicationNavigation);
  assert.equal(publicationNavigation.prevented, true);
  app.unmount('publication');
  const cleanNavigation = event();
  app.navigation.AdminDraftLink(link.props).props.onNavigate(cleanNavigation);
  assert.equal(cleanNavigation.prevented, false);
});

test('private meeting edits warn on shared navigation and clear on unmount', () => {
  const app = harness();
  const savedBatch = batch();
  const draft = { batch: savedBatch, revision: 0, links: [{ key: savedBatch.events[0].key, url: null }] };
  const { default: Editor } = app.component('src/app/admin/v2/batches/[batchId]/meeting/MeetingDraftEditor.tsx', {
    '@/lib/v2Meetings': meetings, '../../../templates/templates.module.css': { default: {} }, './actions': {},
  });
  const render = () => app.render('editor', () => Editor({ draft }));
  const tree = render();
  assert.equal(app.guard.confirmLeave(), true);
  element(tree, (node) => node.type === 'input').props.onChange({ target: { value: 'https://meet.google.com/aaa-bbbb-ccc' } });
  render();
  assert.equal(app.guard.confirmLeave(), false);
  app.unmount('editor');
  assert.equal(app.guard.confirmLeave(), true);
  assert.equal(app.listeners.size, 0);
});
