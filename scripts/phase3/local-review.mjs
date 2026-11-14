import { existsSync, readFileSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { parseEnv } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { readConfig, check, ORIGIN } from '../phase1-hosted-closeout-config.mjs';

export const repo = fileURLToPath(new URL('../../', import.meta.url));
const paymentKeys = ['V2_RAZORPAY_TEST_KEY_ID', 'V2_RAZORPAY_TEST_KEY_SECRET', 'V2_RAZORPAY_TEST_WEBHOOK_SECRET'];

export function reviewEnvironment(staging, payment, port, inherited = {}) {
  check(!inherited.VERCEL_ENV && inherited.NODE_ENV !== 'production', 'Local review cannot run in a deployment or Production process.');
  check(Number.isInteger(port) && port >= 1024 && port <= 65535, 'A local port between 1024 and 65535 is required.');
  check(staging.SUPABASE_URL === ORIGIN, 'Only the designated staging project is accepted.');
  if (payment) {
    check(Object.keys(payment).every(key => paymentKeys.includes(key)), 'Unexpected payment configuration entry.');
    check(/^rzp_test_[A-Za-z0-9]+$/.test(payment.V2_RAZORPAY_TEST_KEY_ID || ''), 'A Razorpay Test Mode key is required.');
    check(payment.V2_RAZORPAY_TEST_KEY_SECRET?.length >= 16, 'The Test Mode API secret is missing.');
    check(payment.V2_RAZORPAY_TEST_WEBHOOK_SECRET?.length >= 32, 'A dedicated webhook secret of at least 32 characters is required.');
  }
  return {
    PATH: inherited.PATH || process.env.PATH,
    NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: ORIGIN,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: staging.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: staging.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SITE_URL: `http://localhost:${port}`,
    V2_TEMPLATE_AUTHORING_ENABLED: 'true', V2_BATCH_AUTHORING_ENABLED: 'true',
    V2_STUDENT_SCHEDULE_ENABLED: 'true', V2_LEARNING_DELIVERY_ENABLED: 'true',
    V2_CONTENT_PUBLISHING_ENABLED: 'true', V2_CHECKOUT_TEST_ENABLED: payment ? 'true' : 'false',
    ...(payment || {}),
  };
}

function privatePaymentFile(filename) {
  const info = statSync(filename);
  check(info.isFile() && info.uid === process.getuid() && (info.mode & 0o077) === 0,
    'Payment configuration must be owner-only (chmod 600).');
  return parseEnv(readFileSync(filename, 'utf8'));
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help')) {
    console.log('Local review: node scripts/phase3/local-review.mjs --staging-env <private-file> [--razorpay-env <private-test-file>] [--port 3030] [--check]');
    return;
  }
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    check(['--staging-env', '--razorpay-env', '--port', '--check'].includes(key) && !Object.hasOwn(options, key), 'Unknown or duplicate local-review option.');
    if (key === '--check') options[key] = true;
    else {
      check(argv[index + 1] && !argv[index + 1].startsWith('--'), 'Missing local-review option value.');
      options[key] = argv[++index];
    }
  }
  check(options['--staging-env'], 'The private staging configuration path is required.');
  for (const filename of ['.env', '.env.local', '.env.development', '.env.development.local']) {
    check(!existsSync(path.join(repo, filename)), 'Ambient Next.js environment files must be moved aside before isolated local review.');
  }
  const staging = readConfig(options['--staging-env'], { database: false });
  const payment = options['--razorpay-env'] ? privatePaymentFile(options['--razorpay-env']) : null;
  const port = Number(options['--port'] || 3030);
  const env = reviewEnvironment(staging, payment, port, process.env);
  console.log(JSON.stringify({ check: 'local_review_configuration', stagingProject: 'eyphkkginlgoaxflauog',
    loopbackOnly: true, checkoutTestEnabled: Boolean(payment), credentialsPrinted: false }));
  if (options['--check']) return;
  console.log(`Local login: http://localhost:${port}/login`);
  console.log('Authenticated actions use actual staging data. Localhost does not receive provider webhooks.');
  const child = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)],
    { cwd: repo, env, stdio: 'inherit' });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (status, signal) => resolve(status ?? (signal ? 1 : 0)));
  });
  process.exitCode = code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Local review could not start. The private file paths, owner-only permissions, staging project, Test Mode keys and local port require verification.'); process.exitCode = 1; });
}
