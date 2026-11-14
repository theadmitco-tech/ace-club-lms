import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const suites=['phase6/conflict-adapters.test.mjs','phase6/conflict-repair.test.mjs','phase6/integrated-access.test.mjs','phase6/paid-integration.test.mjs'];
const env={...process.env};delete env.NODE_TEST_CONTEXT;
for(const suite of suites){
 console.info(`Running ${suite}`);
 const result=spawnSync(process.execPath,['--experimental-strip-types',`scripts/${suite}`],{cwd,env,stdio:'inherit',timeout:180000});
 if(result.error||result.status!==0){console.error(`Phase 6 local verification failed: ${suite}`);process.exit(1);}
}
console.info('Phase 6 local checks passed. Provider-backed hosted acceptance and owner sign-off remain separate.');
