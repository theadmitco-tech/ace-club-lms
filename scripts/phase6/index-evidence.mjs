import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const files=[
 'phase1-closeout-2026-11-01/passwordless-qa/hosted-results.json',
 'phase1-closeout-2026-11-01/passwordless-qa/student-legacy-results.json',
 'phase1-closeout-2026-11-01/passwordless-qa/admin-legacy-results.json',
 'phase2-hosted-acceptance/authoring-results.json','phase2-hosted-acceptance/ist-schedule.json',
 'phase4-hosted-acceptance/hosted-results.json','phase4-hosted-acceptance/provider-results.json',
 'phase5-hosted-acceptance/hosted-results.json','phase5-hosted-acceptance/preview-matrix-results.json',
 'phase5-hosted-acceptance/reorder-preview-results.json','phase5-hosted-acceptance/direct-storage-check.json',
 'phase5-hosted-acceptance/cleanup-verification.json',
 'phase5-preview-activation/activation-receipt.json','phase5-preview-activation/readonly-repair-receipt.json','phase5-preview-activation/conflict-repair-receipt.json',
];
const reports=files.map(file=>{
 const path='deliverables/'+file,raw=readFileSync(path),d=JSON.parse(raw);
 const commitRecord=execFileSync('git',['log','-1','--format=%H|%cI','--',path],{encoding:'utf8'}).trim().split('|');
 return {path,sha256:createHash('sha256').update(raw).digest('hex'),scope:'Inherited evidence; no new execution is claimed.',status:d.status??'receipt-or-observations',reportCommit:d.commit??null,recordedAt:d.finishedAt??d.recordedAt??d.startedAt??null,provenanceCommit:commitRecord[0],provenanceCommitDate:commitRecord[1],dateLimitation:!d.finishedAt&&!d.recordedAt&&!d.startedAt?'Execution timestamp absent; provenance commit date is not a test execution date.':null,checks:(d.checks??[]).map(c=>({id:c.id??null,status:c.status??'recorded-observation',commit:c.commit??d.commit??null}))};
});
writeFileSync('deliverables/phase6-staging-acceptance/evidence-index.json',JSON.stringify({check:'phase6_inherited_evidence_index',baselineCandidate:'879be1fcf2b32f6a4ef42ae431ca3ac6521fa06d',reports},null,2)+'\n');
console.info(`Indexed ${reports.length} reports without copying private records.`);
