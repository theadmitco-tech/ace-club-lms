import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { readContentPreview } from '@/lib/server/v2ContentPublishing';
import { V2LearningWorkspace } from '@/components/student/V2LearningWorkspace';
import type { V2LearningState } from '@/lib/v2Learning';
export default async function ContentPreview({params,searchParams}:{params:Promise<{batchId:string}>;searchParams:Promise<{item?:string;revision?:string}>}) {
  await requirePortalRole('admin');
  const {batchId}=await params, query=await searchParams;
  const data=await readContentPreview(batchId,query.item??null,query.revision?Number(query.revision):null);
  if(!data) notFound();
  const learning: V2LearningState={batchId,publicationRevision:data.course.publicationRevision,sessions:data.course.sessions.map(s=>({key:s.key,title:s.title,section:s.section,locked:false})),obligations:[],progress:[],lastSessionKey:null,liveRegistered:false,liveEvents:[]};
  return <main><h1>{data.course.title}</h1><p>Student presentation of the selected content revision. Student access and feedback locks are checked separately in the live course.</p><V2LearningWorkspace course={data.course} learning={learning} placements={data.placements} preview /></main>;
}
