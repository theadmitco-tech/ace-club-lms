import { pathToFileURL } from 'node:url';
import path from 'node:path';

export function previewOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('An explicit HTTPS Preview origin is required.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash
    || url.pathname !== '/' || url.hostname === 'ace-club-lms.vercel.app' || !/^ace-club(?:-lms)?-[a-z0-9-]+\.vercel\.app$/.test(url.hostname)) {
    throw new Error('An explicit ace-club Preview origin without credentials, path, query or fragment is required.');
  }
  return url.origin;
}

async function boundedText(response) {
  if (!response.body) return '';
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) return text + decoder.decode();
      size += item.value.byteLength;
      if (size > 2 * 1024 * 1024) throw new Error('Response exceeds readiness inspection limit.');
      text += decoder.decode(item.value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function checkHostedReadiness(origin, fetcher = fetch) {
  const base = previewOrigin(origin), checks = [];
  for (const route of ['/login', '/courses/v2', '/courses/v2/checkout', '/api/v2/checkout/webhook']) {
    try {
      const response = await fetcher(base + route, { method: 'GET', redirect: 'manual',
        credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(20000) });
      let observation, pass = false;
      if ([301,302,303,307,308,401,403].includes(response.status)) {
        observation = 'Access or redirect requires owner inspection; no authentication or redirect was followed.';
      } else if (route === '/api/v2/checkout/webhook') {
        pass = response.status === 405;
        observation = pass ? 'GET is rejected by the POST-only route; signed delivery remains untested.' : 'POST-only webhook route was not established.';
      } else {
        const html = response.status === 200 && /text\/html/i.test(response.headers.get('content-type') || '');
        if (html) {
          const text = await boundedText(response);
          const protection = /Authentication Required|Log in to Vercel|Request Access|Request Sent/i.test(text);
          pass = !protection && (route !== '/courses/v2/checkout'
            || text.includes('Choose your course. Start learning.') && text.includes('Test checkout') && text.includes('Continue with Google'));
          observation = pass ? 'Expected public page responded.' : 'Hosting protection or the expected checkout page could not be excluded.';
        } else observation = 'Expected HTML page was not returned.';
      }
      await response.body?.cancel().catch(() => undefined);
      checks.push({ path: route, httpStatus: response.status, status: pass ? 'pass' : 'blocked', observation });
    } catch {
      checks.push({ path: route, status: 'blocked', observation: 'Request or bounded inspection failed; response contents were not recorded.' });
    }
  }
  return { check: 'phase3_public_route_readiness', preview: base, recordedAt: new Date().toISOString(),
    overall: checks.every(check => check.status === 'pass') ? 'public_routes_reachable' : 'blocked',
    readOnly: true, credentialsUsed: false, checks,
    limitations: ['Preview identity and commit require deployment-owner confirmation; a hostname alone does not prove the environment.',
      'No Google sign-in, provider request, signed webhook POST, payment, fixture creation or cleanup occurs.',
      'GET 405 does not establish webhook secret correctness, POST reachability or provider delivery.',
      'This command is a readiness observation, not hosted acceptance.'] };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === '--help') {
    console.log('node scripts/phase3/check-hosted-readiness.mjs --preview-origin https://<owner-verified-preview>.vercel.app');
    return;
  }
  if (argv.length !== 2 || argv[0] !== '--preview-origin') throw new Error('Exactly one --preview-origin is required.');
  const report = await checkHostedReadiness(argv[1]);
  console.log(JSON.stringify(report, null, 2));
  if (report.overall === 'blocked') process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Readiness inspection requires an explicit owner-verified HTTPS Preview origin without secret parameters.'); process.exitCode = 1; });
}
