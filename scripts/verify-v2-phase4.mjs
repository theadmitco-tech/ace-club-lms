import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Local Phase 4 verification; browser and hosted acceptance remain separate.
// SQL tests use disposable Unix-socket databases without staging credentials.
const suites = [
  'v2-learning-feedback-database.test.mjs',
  'v2-learning-security.test.mjs',
  'phase4/recovery.test.mjs',
  'phase4/fixtures.test.mjs',
  'phase4/activation.test.mjs',
];
const cwd = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env };
delete env.NODE_TEST_CONTEXT;
for (const suite of suites) {
  console.info(`\nRunning ${suite}`);
  const result = spawnSync(process.execPath, ['--experimental-strip-types', `scripts/${suite}`], {
    cwd, env, stdio: 'inherit', timeout: 180000,
  });
  if (result.error || result.status !== 0) {
    console.error(`Verification stopped at ${suite}.`);
    process.exit(1);
  }
}
console.info(`\nAll ${suites.length} Phase 4 local suites passed. Browser and hosted acceptance remain separate.`);
