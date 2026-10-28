import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Phase 2 only. Run test:v2:phase1 separately for dependency and legacy coverage.
// Database suites use disposable Unix-socket clusters and synthetic fixtures.
const suites = [
  'v2-reading-preview.test.mjs',
  'v2-content-mapping.test.mjs',
  'v2-content-transfer.test.mjs',
  'v2-content-preservation.test.mjs',
  'v2-enrolled-schedules.test.mjs',
  'v2-enrolled-schedules-database.test.mjs',
  'draft-recovery.test.mjs',
  'admin-draft-navigation.test.mjs',
  'v2-approved-authoring.test.mjs',
  'v2-publication-database.test.mjs',
  'v2-template-authoring.test.mjs',
  'v2-template-database.test.mjs',
  'v2-batch-authoring.test.mjs',
  'v2-batch-database.test.mjs',
  'v2-meeting-authoring.test.mjs',
  'v2-meeting-database.test.mjs',
  'v2-schema-preflight.test.mjs',
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
console.info(`\nAll ${suites.length} Phase 2 local suites passed. Staging acceptance remains separate.`);
