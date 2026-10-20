import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Fixed Phase 1 and legacy regression suites only. Database tests create
// disposable Unix-socket clusters; no hosted credentials or app server are used.
const suites = [
  'v2-product-entitlements.test.mjs',
  'v2-product-readers.test.mjs',
  'v2-staging-catalogue-probe.test.mjs',
  'release-safety.test.mjs',
  'course-template-validation.test.mjs',
  'batch-schedule.test.mjs',
  'flexible-resources.test.mjs',
  'student-portal.test.mjs',
  'student-timeline-recommendations.test.mjs',
  'session-material-files.test.mjs',
  'phase5-integrated-safety.test.mjs',
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
console.info(`\nAll ${suites.length} Phase 1 local suites passed. Staging acceptance remains separate.`);
