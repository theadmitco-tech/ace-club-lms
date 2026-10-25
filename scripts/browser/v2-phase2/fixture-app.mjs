import { copyFile, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repo = fileURLToPath(new URL('../../../', import.meta.url));
export const sources = [
  'src/app/admin/AdminShell.tsx',
  'src/app/admin/admin.css',
  'src/components/AdminDraftNavigation.tsx',
  'src/components/DraftRecovery.tsx',
  'src/components/student/WorksheetLog.tsx',
  'src/lib/studentPractice.ts',
  'src/lib/worksheetRecovery.ts',
  'src/lib/draftRecovery.ts',
  'src/lib/v2WorkspaceRecovery.ts',
  'src/components/BrandLogo.tsx',
  'src/app/admin/v2/templates/page.tsx',
  'src/app/admin/v2/templates/TemplateEditor.tsx',
  'src/app/admin/v2/templates/actions.ts',
  'src/app/admin/v2/templates/templates.module.css',
  'src/app/admin/v2/batches/page.tsx',
  'src/app/admin/v2/batches/BatchDraftEditor.tsx',
  'src/app/admin/v2/batches/PublicationPanel.tsx',
  'src/app/admin/v2/batches/actions.ts',
  'src/app/admin/v2/batches/[batchId]/meeting/page.tsx',
  'src/app/admin/v2/batches/[batchId]/meeting/MeetingDraftEditor.tsx',
  'src/app/admin/v2/batches/[batchId]/meeting/actions.ts',
  'src/lib/v2Products.ts',
  'src/lib/v2Templates.ts',
  'src/lib/v2Batches.ts',
  'src/lib/v2Meetings.ts',
  'src/lib/v2Publications.ts',
  'public/5.svg',
  'public/6.svg',
];

// Copy actual screens into a disposable app. Replace only auth/DAL dependencies.
// No fixture route or test identity is added to the deployable application.
export async function createFixtureApp(backendPort) {
  const root = await mkdtemp(path.join(tmpdir(), 'ace-v2-browser-'));
  const put = async (file, content) => {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), content);
  };
  for (const file of sources) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await copyFile(path.join(repo, file), path.join(root, file));
  }
  await symlink(path.join(repo, 'node_modules'), path.join(root, 'node_modules'));
  await put('package.json', JSON.stringify({ private: true, dependencies: {
    next: '16.2.4', react: '19.2.4', 'react-dom': '19.2.4',
  } }));
  await put('tsconfig.json', await readFile(path.join(repo, 'tsconfig.json'), 'utf8'));
  await put('next.config.mjs', 'export default { devIndicators: false };');
  const css = await readFile(path.join(repo, 'src/app/globals.css'), 'utf8');
  await put('src/app/globals.css', css.replace(/^@import url\(.*\);\r?\n/gm, ''));
  await put('src/app/layout.tsx', `
import './globals.css';
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}`);
  await put('src/app/admin/layout.tsx', `
import Shell from './AdminShell';
export const dynamic = 'force-dynamic';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}`);
  await put('src/app/admin/page.tsx', `export default function Page() {
  return <h1 className="admin-page-title">Synthetic Admin dashboard</h1>;
}`);
  await put('src/app/login/page.tsx', `export default function Page() {
  return <h1>Synthetic sign-out destination</h1>;
}`);
  await put('src/lib/AuthContext.tsx', `'use client';
import { clearDraftRecovery } from '@/lib/draftRecovery';
const user = { id: 'synthetic-admin', role: 'admin', full_name: 'Synthetic Admin', email: 'admin@example.test' };
export function useAuth() {
  return { user, isLoading: false, logout: async () => { clearDraftRecovery(window.sessionStorage); window.location.href = '/login'; } };
}`);
  await put('src/lib/server/portalAuthorization.ts', `
import { call } from './fixture';
export async function requirePortalRole(role: string) { return call('fixtureIdentity', role); }
`);
  await put('src/lib/server/v2TemplateFeature.ts', `
export function isV2TemplateAuthoringEnabled() { return true; }
`);
  await put('src/lib/server/v2BatchFeature.ts', `
export function isV2BatchAuthoringEnabled() { return true; }
`);
  await put('src/lib/server/fixture.ts', `
import 'server-only';
// This module exists only inside the disposable browser fixture.
export async function call(method: string, ...args: unknown[]) {
  const response = await fetch('http://127.0.0.1:${backendPort}/' + method, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args), cache: 'no-store',
  });
  if (!response.ok) throw new Error('Synthetic transport interruption');
  return response.json();
}`);
  for (const [module, methods] of Object.entries({
    v2Templates: ['listV2TemplateDrafts', 'saveV2TemplateDraft'],
    v2Batches: ['listV2BatchDrafts', 'previewV2BatchDraft', 'saveV2BatchDraft'],
    v2Publications: ['listV2BatchPublications', 'previewV2BatchPublication', 'saveV2BatchPublication'],
    v2Meetings: ['readV2MeetingDraft', 'saveV2MeetingDraft'],
  })) {
    await put(`src/lib/server/${module}.ts`, `import { call } from './fixture';\n`
      + methods.map((method) => `export async function ${method}(...args: unknown[]) { return call('${method}', ...args); }`).join('\n'));
  }
  await put('src/app/practice/fixture/[materialId]/page.tsx', `
import { WorksheetLog } from '@/components/student/WorksheetLog';
import { call } from '@/lib/server/fixture';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const identity = await call('fixtureIdentity', 'student');
  const worksheet = await call('fixtureWorksheet', materialId);
  return <main><h1>Synthetic worksheet</h1><WorksheetLog key={identity.id + materialId} ownerId={identity.id} worksheet={worksheet} /></main>;
}`);
  await put('src/app/api/fixture-log/route.ts', `
import { call } from '@/lib/server/fixture';
export async function POST(request: Request) {
  try { return Response.json(await call('fixtureSaveQuestion', await request.json())); }
  catch { return new Response('Synthetic interruption', { status: 503 }); }
}`);
  await put('src/utils/supabase/client.ts', `
export function createClient() {
  return { rpc: async (name: string, input: unknown) => {
    if (name !== 'update_student_question_log') throw new Error('Unexpected fixture RPC');
    const response = await fetch('/api/fixture-log', { method: 'POST', body: JSON.stringify(input) });
    if (!response.ok) throw new Error('Synthetic transport interruption');
    const body = await response.json();
    return body.status === 'error' ? { data: null, error: { message: body.message } } : body;
  } };
}`);
  return root;
}
