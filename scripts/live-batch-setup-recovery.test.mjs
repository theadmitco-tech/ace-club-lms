import assert from 'node:assert/strict';
import test from 'node:test';
import { isLiveBatchSetup } from '../src/lib/v2LiveBatchSetup.ts';
import { readDraftRecovery, writeDraftRecovery } from '../src/lib/draftRecovery.ts';
const form = { subject: 'quant', title: 'Unfinished batch', sourceId: '', createFeedbackSessions: false,
  classes: [{key:'first', title:'Partial class', date:'', time:'', duration:14}] };
test('incomplete creation survives owner-scoped recovery before review', () => {
  const values=new Map();const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  assert.equal(isLiveBatchSetup(form),true);
  assert.equal(writeDraftRecovery(storage,'admin-a','v2-live-batch-form',form,100),true);
  assert.deepEqual(JSON.parse(readDraftRecovery(storage,'admin-a','v2-live-batch-form',101)),form);
  assert.equal(readDraftRecovery(storage,'admin-b','v2-live-batch-form',101),null);
});
test('corrupt shapes, duplicate class identities and oversized lists cannot be restored', () => {
  for(const candidate of [null,{}, {...form,subject:'unknown'}, {...form,subject:['quant']}, {...form,createFeedbackSessions:'true'}, {...form,classes:[]}, {...form,classes:[form.classes[0],form.classes[0]]}, {...form,classes:[{...form.classes[0],duration:NaN}]}, {...form,classes:Array.from({length:101},(_,i)=>({...form.classes[0],key:String(i)}))}]) assert.equal(isLiveBatchSetup(candidate),false);
});

test('combined-subject creation preserves each class subject in recovery', () => {
  const mixed={...form,subject:'full_course',classes:['quant','verbal','di'].map((section,index)=>({...form.classes[0],key:String(index),section}))};
  assert.equal(isLiveBatchSetup(mixed),true);
  assert.equal(isLiveBatchSetup({...mixed,classes:[{...mixed.classes[0],section:'full_course'}]}),false);
});
