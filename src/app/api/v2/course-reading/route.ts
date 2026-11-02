import { isV2LearningEnabled } from '@/lib/server/v2LearningFeature';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import { NextRequest, NextResponse } from 'next/server';
import { NotionAPI } from 'notion-client';
import { getMyV2PublishedCourse } from '@/lib/server/v2StudentDelivery';
import { hasV2ReadingContent, v2ReadingPageId } from '@/lib/v2ReadingPreview';

export const dynamic = 'force-dynamic';
const headers = {'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(request: NextRequest) {
  const pageId = request.nextUrl.searchParams.get('pageId');
  const learningEnabled = isV2LearningEnabled();
  const sessionKey = request.nextUrl.searchParams.get('sessionKey');
  if (!pageId || !/^[a-f0-9]{32}$/.test(pageId) || request.nextUrl.searchParams.getAll('pageId').length !== 1
    || request.nextUrl.searchParams.getAll('batchId').length !== 1
    || (learningEnabled && (!isV2MeetingBatchId(sessionKey) || request.nextUrl.searchParams.getAll('sessionKey').length !== 1))
    || [...request.nextUrl.searchParams.keys()].some((key) => !(learningEnabled ? ['pageId','batchId','sessionKey'] : ['pageId','batchId']).includes(key))) return NextResponse.json({error:'Reading unavailable'},{status:404,headers});
  const course = await getMyV2PublishedCourse(request.nextUrl.searchParams.get('batchId'));
  const allowed = course?.sessions.some((session) => (!learningEnabled || session.key === sessionKey) && [...session.content.preSessionReads,...session.content.postSessionReads,...session.content.materials]
    .some((item) => v2ReadingPageId(item.url) === pageId));
  if (!allowed) return NextResponse.json({error:'Reading unavailable'},{status:404,headers});
  try {
    const recordMap = await new NotionAPI({ofetchOptions:{timeout:10000,retry:0}}).getPage(pageId,{fetchRelationPages:false,throwOnCollectionErrors:true});
    if (!hasV2ReadingContent(recordMap,pageId)) return NextResponse.json({error:'Reading is empty or unavailable'},{status:422,headers});
    return NextResponse.json(recordMap,{headers});
  } catch { return NextResponse.json({error:'Reading could not be loaded'},{status:502,headers}); }
}
