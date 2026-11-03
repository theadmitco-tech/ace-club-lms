import {mkdirSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

// The existing .env* exclusion keeps private QA state outside version control across workspace resumes.
const directory=fileURLToPath(new URL('../../.env.phase5-private/',import.meta.url));
mkdirSync(directory,{recursive:true,mode:0o700});
const info=statSync(directory);
if(!info.isDirectory()||(info.mode&0o077)!==0||info.uid!==process.getuid())throw new Error('Private QA directory requires owner-only access.');
export function privateFile(name){
 if(!/^[a-z0-9][a-z0-9.-]+$/.test(name))throw new Error('Invalid private QA filename.');
 return join(directory,name);
}
