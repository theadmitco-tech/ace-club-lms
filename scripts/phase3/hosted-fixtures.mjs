import { randomUUID } from 'node:crypto';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const check = (value, message) => { if (!value) throw new Error(message); };
const sql = value => `'${String(value).replaceAll("'", "''")}'`;
const json = value => `${sql(JSON.stringify(value))}::jsonb`;
export const fixtureLabels = ['admin','full','individual','retry','delayed','unpaid','expired','revoked','inactive','wrong_subject','multiple',...Array.from({length:7},(_,i)=>`capacity_${i+1}`),'contender_1','contender_2'];
export function fixtureEmail(runId, label) {
  check(UUID.test(runId) && fixtureLabels.includes(label), 'Invalid fixture identity.');
  return `ace-p3-${label}-${runId}@example.invalid`;
}
export function createManifest({ runId, createdAt, users, preview, commit, startDate, expectedTableCount = 92 }) {
  const courses = Object.fromEntries(['full_course','quant','verbal','di','capacity'].map(label => {
    const product = label === 'capacity' ? 'quant' : label;
    const sections = product === 'full_course' ? ['quant','verbal','di'] : [product];
    return [label, { product, batchId: randomUUID(), templateId: randomUUID(), templateRequestId: randomUUID(), batchRequestId: randomUUID(), publishRequestId: randomUUID(),
      sessions: sections.flatMap(section => [1,2].map(position => ({ key: randomUUID(), title:`QA ${section} ${position}`, section,
        content: Object.fromEntries(['preSessionReads','recordings','postSessionReads','materials'].map(kind=>[kind,[{key:randomUUID(),title:`Synthetic ${kind}`,url:`https://example.invalid/phase3/${runId}/${section}/${position}/${kind}`}]])) }))),
      eventKey: randomUUID() }];
  }));
  const manifest = { version:1, project:'eyphkkginlgoaxflauog', runId, createdAt, users, preview, commit, startDate, expectedTableCount, courses,
    authenticationEvidence:'Synthetic fixture identities only; no Google OAuth acceptance is implied.' };
  validateManifest(manifest); return manifest;
}
export function validateManifest(m) {
  check(m?.project === 'eyphkkginlgoaxflauog' && UUID.test(m.runId), 'Only the designated staging run is accepted.');
  check(Number.isFinite(Date.parse(m.createdAt)) && /^\d{4}-\d{2}-\d{2}$/.test(m.startDate), 'Fixture creation time and start date are required.');
  check(/^[0-9a-f]{40}$/.test(m.commit) && /^https:\/\/ace-club-[a-z0-9-]+\.vercel\.app$/.test(m.preview) && m.preview !== 'https://ace-club-lms.vercel.app', 'Exact reviewed commit and Preview origin required.');
  check(Number.isInteger(m.expectedTableCount) && m.expectedTableCount >= 30, 'Expected schema table count required.');
  check(m.users && Object.keys(m.users).length === fixtureLabels.length && fixtureLabels.every(label => UUID.test(m.users[label]?.id) && m.users[label].email === fixtureEmail(m.runId,label)), 'Exact generated fixture identities required.');
  check(new Set(Object.values(m.users).map(u=>u.id)).size === fixtureLabels.length, 'Duplicate fixture identity.');
  check(Object.keys(m.courses).sort().join(',') === 'capacity,di,full_course,quant,verbal', 'Five isolated fixture courses required.');
  const ids = [];
  for (const [label,c] of Object.entries(m.courses)) {
    check(c.product === (label === 'capacity' ? 'quant' : label), 'Fixture offering mismatch.');
    for (const key of ['batchId','templateId','templateRequestId','batchRequestId','publishRequestId','eventKey']) { check(UUID.test(c[key]), 'Invalid course identity.'); ids.push(c[key]); }
    check(Array.isArray(c.sessions) && c.sessions.length === (label === 'full_course' ? 6 : 2), 'Fixture sessions mismatch.');
    for (const session of c.sessions) {
      check(UUID.test(session.key) && ['quant','verbal','di'].includes(session.section), 'Fixture session identity mismatch.');
      ids.push(session.key);
      for (const kind of ['preSessionReads','recordings','postSessionReads','materials']) {
        check(session.content[kind]?.length === 1, 'One synthetic resource per fixture slot required.');
        const item = session.content[kind][0];
        check(UUID.test(item.key) && item.url.startsWith(`https://example.invalid/phase3/${m.runId}/`), 'Only synthetic resource references are accepted.'); ids.push(item.key);
      }
    }
  }
  check(new Set(ids).size === ids.length, 'Duplicate course/resource identity.');
}
const courseIds = '(select batch_id from p3_courses)';
const userIds = '(select id from p3_users)';
function common(m) {
  validateManifest(m);
  return `-- Staging-only packet; the SQL Editor project must be eyphkkginlgoaxflauog.
-- Exact generated fixture identities remain outside version control. No provider is called.
rollback; begin; set local statement_timeout='90s'; set local lock_timeout='3s';
create temporary table p3_users(label text primary key,id uuid unique,email text) on commit drop;
insert into p3_users values ${fixtureLabels.map(label=>`(${sql(label)},${sql(m.users[label].id)},${sql(m.users[label].email)})`).join(',')};
create temporary table p3_courses(label text primary key,batch_id uuid unique,template_id uuid unique,product text) on commit drop;
insert into p3_courses values ${Object.entries(m.courses).map(([label,c])=>`(${sql(label)},${sql(c.batchId)},${sql(c.templateId)},${sql(c.product)})`).join(',')};
do $$begin
 if (select count(*) from p3_users q join auth.users u on u.id=q.id and u.email=q.email and u.raw_user_meta_data->>'phase3_qa_run'=${sql(m.runId)} and u.created_at>=${sql(m.createdAt)}::timestamptz join public.profiles p on p.id=u.id and p.email=q.email)<>${fixtureLabels.length} then raise exception 'Generated QA identity ownership mismatch'; end if;
 if (select count(*) from pg_tables where schemaname='public')<>${m.expectedTableCount} then raise exception 'Application table inventory changed';end if;
 if to_regprocedure('public.fulfill_v2_checkout(uuid,text,text,integer,text)') is null then raise exception 'Installed Phase 3 schema required';end if;
 if to_regclass('supabase_migrations.schema_migrations') is null then raise exception 'Migration ledger required';end if;
end $$;
create or replace function pg_temp.p3_fingerprint() returns jsonb language plpgsql as $$
declare t record;h text;hashes text:='';n integer:=0;ledger text;
begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  if t.tablename='profiles' then select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) into h from public.profiles r where id not in ${userIds};
  elsif t.tablename='v2_signup_candidates' then select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) into h from public.v2_signup_candidates r where student_id not in ${userIds};
  else execute format('select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),'''')) from public.%I r',t.tablename) into h;end if;
  hashes:=hashes||t.tablename||':'||h||';';n:=n+1;
 end loop;
 select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) into ledger from supabase_migrations.schema_migrations r;
 return jsonb_build_object('md5',md5(hashes),'table_count',n,'ledger_md5',ledger,'excluded_generated_profiles',${fixtureLabels.length},'excluded_generated_candidates',${fixtureLabels.length});
end $$;
`;
}
function grants(m) {
  const labels = ['expired','revoked','inactive','wrong_subject','multiple',...fixtureLabels.filter(x=>x.startsWith('capacity_'))];
  return labels.flatMap(label => (label === 'multiple' ? ['quant_crash','verbal_crash'] : [label === 'wrong_subject' ? 'di_crash' : 'quant_crash']).map(code=>({label,code,reference:`phase3-qa:${m.runId}:${label}:${code}`})));
}
export function setupSql(m) {
  let result = common(m);
  result += `create temporary table p3_baseline on commit drop as select pg_temp.p3_fingerprint() value;
create temporary table p3_original_rows(table_name text,row_hash text,row_count bigint) on commit drop;
do $$declare t record;found boolean;begin
 if ${sql(m.startDate)}::date<=(statement_timestamp() at time zone 'Asia/Kolkata')::date then raise exception 'Fixture start date must remain in the future';end if;
 if (select count(*) from public.v2_signup_candidates where student_id in ${userIds})<>${fixtureLabels.length} or exists(select 1 from public.profiles where id in ${userIds} and (role<>'student' or is_active)) then raise exception 'Fresh inactive signup candidates required; setup must not repeat';end if;
 if exists(select 1 from public.v2_course_batches where id in ${courseIds}) or exists(select 1 from public.v2_course_templates where id in(select template_id from p3_courses)) then raise exception 'Fixture setup must not repeat';end if;
 for t in select tablename from pg_tables where schemaname='public' and tablename not in('profiles','v2_signup_candidates') loop
  execute format('select exists(select 1 from public.%I r where to_jsonb(r)->>''student_id'' in(select id::text from p3_users) or to_jsonb(r)->>''actor_id'' in(select id::text from p3_users))',t.tablename) into found;
  if found then raise exception 'Generated identity already has application activity';end if;
  execute format('insert into p3_original_rows select %L,md5(to_jsonb(r)::text),count(*) from public.%I r group by md5(to_jsonb(r)::text)',t.tablename,t.tablename);
 end loop;
 insert into p3_original_rows select 'profiles',md5(to_jsonb(r)::text),count(*) from public.profiles r where id not in ${userIds} group by md5(to_jsonb(r)::text);
 insert into p3_original_rows select 'v2_signup_candidates',md5(to_jsonb(r)::text),count(*) from public.v2_signup_candidates r where student_id not in ${userIds} group by md5(to_jsonb(r)::text);
end $$;
update public.profiles p set role=case when q.label='admin' then 'admin' else 'student' end,is_active=true from p3_users q where p.id=q.id and q.label in('admin','expired','revoked','inactive','wrong_subject','multiple','capacity_1','capacity_2','capacity_3','capacity_4','capacity_5','capacity_6','capacity_7');
do $$declare request jsonb;preview jsonb;begin
 perform set_config('request.jwt.claim.sub',${sql(m.users.admin.id)},true);
`;
  for (const [label,c] of Object.entries(m.courses)) {
    const title=`Phase 3 QA ${label} ${m.runId}`;
    const document={title,summary:'Synthetic payment acceptance fixture; resources are non-deliverable placeholders.',durationDays:2,sessions:c.sessions,events:[{key:c.eventKey,title:'Synthetic upcoming live class',section:c.product==='full_course'?'quant':c.product,kind:'live',dayOffset:0,localStartTime:'19:00',durationMinutes:60,capacity:8,instructor:''}]};
    const request={id:c.batchId,templateId:c.templateId,templateRevision:1,expectedRevision:0,requestId:c.batchRequestId,title,startDate:m.startDate,timeZone:'Asia/Kolkata',events:null};
    const publication={batchId:c.batchId,batchRevision:1,expectedRevision:0,requestId:c.publishRequestId,action:'publish'};
    result+=` perform public.save_v2_template_draft(${sql(c.templateId)},${sql(c.product)},0,${sql(c.templateRequestId)},${json(document)});
 request:=${json(request)};preview:=public.preview_v2_batch_draft(request);perform public.save_v2_batch_draft(request,preview->>'fingerprint');
 request:=${json(publication)};preview:=public.preview_v2_batch_publication(request);perform public.save_v2_batch_publication(request,preview->>'fingerprint');
 perform public.set_v2_live_session_mapping(${sql(c.batchId)},${sql(c.eventKey)},${sql(c.sessions[0].key)},1);
`;
  }
  for (const g of grants(m)) result+=` perform public.grant_v2_purchase(${sql(m.users[g.label].id)},array[${sql(g.code)}],${sql(g.reference)},statement_timestamp()-interval '1 second',(public.quote_v2_products(array[${sql(g.code)}])->>'price_version_id')::uuid,(public.quote_v2_products(array[${sql(g.code)}])->>'amount_paise')::integer,'INR');\n`;
  for (const label of fixtureLabels.filter(x=>x.startsWith('capacity_'))) result+=` perform public.set_v2_batch_enrollment(${sql(m.courses.capacity.batchId)},${sql(m.users[label].id)},true,0);perform public.set_v2_live_registration(${sql(m.courses.capacity.batchId)},${sql(m.users[label].id)},true,0);\n`;
  result+=`end $$;
update public.v2_purchases set confirmed_at=statement_timestamp()-interval '7 months' where student_id=${sql(m.users.expired.id)} and payment_reference=${sql(`phase3-qa:${m.runId}:expired:quant_crash`)};
update public.v2_purchases set revoked_at=statement_timestamp() where student_id=${sql(m.users.revoked.id)} and payment_reference=${sql(`phase3-qa:${m.runId}:revoked:quant_crash`)};
update public.profiles set is_active=false where id=${sql(m.users.inactive.id)};
do $$declare t record;missing boolean;begin
 for t in select distinct table_name from p3_original_rows loop
  execute format('select exists(select 1 from p3_original_rows o left join(select md5(to_jsonb(r)::text) h,count(*) n from public.%I r group by md5(to_jsonb(r)::text)) c on c.h=o.row_hash where o.table_name=%L and coalesce(c.n,0)<o.row_count)',t.table_name,t.table_name) into missing;
  if missing then raise exception 'Original application rows changed; setup rolled back';end if;
 end loop;
 if pg_temp.p3_fingerprint()->>'ledger_md5'<>(select value->>'ledger_md5' from p3_baseline) then raise exception 'Original ledger changed';end if;
end $$;
select jsonb_build_object('check','phase3_qa_fixture_setup','run_id',${sql(m.runId)},'qa_accounts',${fixtureLabels.length},'batches',5,'synthetic_seed_purchases',${grants(m).length},'capacity_occupied',7,'google_oauth_verified',false,'payments_taken',false,'baseline',(select value from p3_baseline));
commit;\n`;
  return result;
}
export function cleanupSql(m,{baseline,checkouts=[],contentIds=[]}) {
  validateManifest(m);
  check(/^[0-9a-f]{32}$/.test(baseline?.md5) && /^[0-9a-f]{32}$/.test(baseline?.ledger_md5) && baseline.table_count===m.expectedTableCount && baseline.excluded_generated_profiles===fixtureLabels.length && baseline.excluded_generated_candidates===fixtureLabels.length, 'Exact recorded setup baseline required.');
  check(Array.isArray(checkouts) && new Set(checkouts.map(c=>c.id)).size===checkouts.length && checkouts.every(c=>UUID.test(c.id) && Object.values(m.users).some(u=>u.id===c.studentId) && (c.orderId===null || /^order_[A-Za-z0-9]+$/.test(c.orderId)) && (c.paymentId===null || /^pay_[A-Za-z0-9]+$/.test(c.paymentId)) && Array.isArray(c.eventIds) && c.eventIds.every(id=>typeof id==='string'&&id.length>0&&id.length<=200)), 'Explicit tracked checkout/provider/event identities required.');
  check(Array.isArray(contentIds)&&contentIds.every(id=>UUID.test(id))&&new Set(contentIds).size===contentIds.length,'Exact content identities required.');
  let result=common(m)+`create temporary table p3_checkouts(id uuid primary key,student_id uuid,order_id text,payment_id text,event_ids text[]) on commit drop;\n`;
  if(checkouts.length) result+=`insert into p3_checkouts values ${checkouts.map(c=>`(${sql(c.id)},${sql(c.studentId)},${c.orderId===null?'null':sql(c.orderId)},${c.paymentId===null?'null':sql(c.paymentId)},array[${c.eventIds.map(sql).join(',')}]::text[])`).join(',')};\n`;
  result+=`create temporary table p3_content(id uuid primary key) on commit drop;\n`;
  if(contentIds.length) result+=`insert into p3_content values ${contentIds.map(id=>`(${sql(id)})`).join(',')};\n`;
  result+=`create temporary table p3_seed_refs(student_id uuid,reference text) on commit drop;
insert into p3_seed_refs values ${grants(m).map(g=>`(${sql(m.users[g.label].id)},${sql(g.reference)})`).join(',')};
do $$declare t text;bad boolean;begin
 if (select count(*) from public.v2_course_batches b join p3_courses c on c.batch_id=b.id and c.template_id=b.template_id and c.product=b.product_code)<>5 then raise exception 'Fixture course ownership mismatch';end if;
 if exists(select 1 from public.v2_checkout_intents c where c.student_id in ${userIds} and not exists(select 1 from p3_checkouts q where q.id=c.id and q.student_id=c.student_id and q.order_id is not distinct from c.provider_order_id and q.payment_id is not distinct from c.provider_payment_id)) then raise exception 'Untracked or changed checkout';end if;
 if exists(select 1 from p3_checkouts q left join public.v2_checkout_intents c on c.id=q.id and c.student_id=q.student_id where c.id is null) then raise exception 'Tracked checkout ownership mismatch';end if;
 if exists(select 1 from public.v2_checkout_intents c cross join lateral jsonb_array_elements(c.batches) b where c.id in(select id from p3_checkouts) and (b->>'batchId')::uuid not in ${courseIds}) or exists(select 1 from public.v2_checkout_intents c cross join lateral unnest(c.live_batches) b where c.id in(select id from p3_checkouts) and b not in ${courseIds}) then raise exception 'Checkout escaped fixture courses';end if;
 if exists(select 1 from public.v2_payment_events e join p3_checkouts c on c.id=e.checkout_id where not(e.event_id=any(c.event_ids))) then raise exception 'Untracked payment event';end if;
 if exists(select 1 from public.v2_purchases p where p.student_id in ${userIds} and not exists(select 1 from p3_seed_refs q where q.student_id=p.student_id and q.reference=p.payment_reference) and not exists(select 1 from public.v2_checkout_intents c join p3_checkouts q on q.id=c.id where c.purchase_id=p.id and c.student_id=p.student_id and c.base_purchase_id is null and p.payment_reference='razorpay_test:'||q.payment_id)) then raise exception 'Untracked purchase';end if;
 if exists(select 1 from public.v2_purchase_upgrades u join public.v2_purchases p on p.id=u.purchase_id where (p.student_id in ${userIds} or u.checkout_id in(select id from p3_checkouts)) and (p.student_id not in ${userIds} or u.checkout_id not in(select id from p3_checkouts))) then raise exception 'Foreign upgrade relation';end if;
 if exists(select 1 from public.v2_checkout_intents c where c.id in(select id from p3_checkouts) and (exists(select 1 from public.v2_purchases p where p.id=c.base_purchase_id and p.student_id<>c.student_id) or exists(select 1 from public.v2_purchases p where p.id=c.purchase_id and p.student_id<>c.student_id))) then raise exception 'Foreign checkout purchase relation';end if;
 foreach t in array array['v2_batch_enrollments','v2_live_registrations','v2_live_registration_audit','v2_learning_progress','v2_session_feedback','v2_feedback_obligations','v2_recording_watch_sessions'] loop
  execute format('select exists(select 1 from public.%I where (batch_id in(select batch_id from p3_courses) and student_id not in(select id from p3_users)) or (student_id in(select id from p3_users) and batch_id not in(select batch_id from p3_courses)))',t) into bad;
  if bad then raise exception 'Foreign Student or escaped fixture activity in %',t;end if;
 end loop;
 foreach t in array array['v2_course_batch_revisions','v2_batch_publication_revisions','v2_batch_meeting_revisions','v2_live_class_completions','v2_live_session_mapping_audit','v2_live_session_mappings'] loop
  execute format('select exists(select 1 from public.%I where batch_id in(select batch_id from p3_courses) and actor_id<>%L::uuid)',t,${sql(m.users.admin.id)}) into bad;
  if bad then raise exception 'Fixture revision or action has foreign ownership in %',t;end if;
 end loop;
 foreach t in array array['v2_batch_enrollments','v2_live_registrations','v2_live_registration_audit'] loop
  execute format('select exists(select 1 from public.%I r where batch_id in(select batch_id from p3_courses) and actor_id<>%L::uuid and (actor_id<>student_id or not exists(select 1 from public.v2_checkout_intents c join p3_checkouts q on q.id=c.id where c.student_id=r.student_id and c.state=''fulfilled'' and exists(select 1 from jsonb_array_elements(c.batches) b where b->>''batchId''=r.batch_id::text))))',t,${sql(m.users.admin.id)}) into bad;
  if bad then raise exception 'Fixture enrollment or registration has foreign ownership in %',t;end if;
 end loop;
 if exists(select 1 from public.v2_live_registrations where batch_id in ${courseIds} and actor_id=student_id and provenance<>'verified_payment') then raise exception 'Payment registration provenance mismatch';end if;
 if exists(select 1 from public.v2_course_template_revisions where template_id in(select template_id from p3_courses) and actor_id<>${sql(m.users.admin.id)}::uuid) then raise exception 'Template revision has foreign ownership';end if;
 if exists(select 1 from public.v2_content_item_revisions r where r.item_id in(select id from p3_content) and (r.actor_id<>${sql(m.users.admin.id)}::uuid or exists(select 1 from jsonb_array_elements(r.document->'targets') target where (target->>'batchId')::uuid not in ${courseIds}))) or exists(select 1 from public.v2_content_publication_audit where item_id in(select id from p3_content) and actor_id<>${sql(m.users.admin.id)}::uuid) then raise exception 'Content escaped fixture scope';end if;
end $$;
create temporary table p3_purchase_ids on commit drop as select id from public.v2_purchases where student_id in ${userIds};
delete from public.v2_payment_events where checkout_id in(select id from p3_checkouts);
delete from public.v2_purchase_upgrades where checkout_id in(select id from p3_checkouts);
delete from public.v2_checkout_intents where id in(select id from p3_checkouts);
delete from public.v2_content_publication_audit where item_id in(select id from p3_content);
delete from public.v2_content_item_revisions where item_id in(select id from p3_content);
delete from public.v2_content_items where id in(select id from p3_content);
delete from public.v2_recording_watch_samples s using public.v2_recording_watch_sessions w where s.watch_id=w.id and w.batch_id in ${courseIds};
`;
  for(const table of ['v2_recording_watch_sessions','v2_feedback_obligations','v2_session_feedback','v2_learning_progress','v2_live_session_mapping_audit','v2_live_session_mappings','v2_live_registration_audit','v2_live_registrations','v2_live_class_completions','v2_published_meetings','v2_batch_enrollments','v2_batch_publication_revisions','v2_batch_meeting_revisions','v2_course_batch_revisions']) result+=`delete from public.${table} where batch_id in ${courseIds};\n`;
  result+=`delete from public.v2_course_batches where id in ${courseIds};
delete from public.v2_course_template_revisions where template_id in(select template_id from p3_courses);
delete from public.v2_course_templates where id in(select template_id from p3_courses);
delete from public.v2_product_grants where purchase_id in(select id from p3_purchase_ids);
delete from public.v2_purchases where id in(select id from p3_purchase_ids);
delete from public.v2_signup_candidates where student_id in ${userIds};
update public.profiles set is_active=false where id in ${userIds};
do $$begin
 if pg_temp.p3_fingerprint()<>${json(baseline)} then raise exception 'Application or ledger baseline changed; cleanup rolled back';end if;
end $$;
select jsonb_build_object('check','phase3_qa_fixture_cleanup','run_id',${sql(m.runId)},'baseline_restored',true,'generated_profiles_deactivated',${fixtureLabels.length},'auth_deletion_required',true,'fingerprint',pg_temp.p3_fingerprint());
commit;\n`;
  return result;
}
