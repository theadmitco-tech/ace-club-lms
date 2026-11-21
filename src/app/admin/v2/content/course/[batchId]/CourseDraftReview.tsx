'use client';
import {useRouter} from 'next/navigation';
import {AdminDraftLink as Link} from '@/components/AdminDraftNavigation';
import BatchDraftEditor from '../../../batches/BatchDraftEditor';
import PublicationPanel from '../../../batches/PublicationPanel';
import type {V2BatchDraft} from '@/lib/v2Batches';
import type {V2Publication} from '@/lib/v2Publications';
export default function CourseDraftReview({draft,publications,ownerId,editing,sessionKey}:{draft:V2BatchDraft;publications:V2Publication[];ownerId:string;editing:boolean;sessionKey?:string}) {
 const router=useRouter();
 return <div><Link href="/admin/v2/content">← Course content</Link>
 <h1 className="admin-page-title">{draft.title}</h1>
 <p className="admin-page-subtitle">Course sessions and reading pages</p>
 {editing ? <BatchDraftEditor courseMode focused initialDraft={draft} initialSessionKey={sessionKey} drafts={[draft]} templates={[]} ownerId={ownerId} onSaved={()=>router.push(`/admin/v2/content/course/${draft.id}`)}/> : <>
 <Link href={`/admin/v2/content/course/${draft.id}?edit=1`}>Edit saved course draft</Link>
 <PublicationPanel courseMode focused drafts={[draft]} publications={publications} ownerId={ownerId} onBack={()=>router.push('/admin/v2/content')}/>
 </>}
 </div>;
}
