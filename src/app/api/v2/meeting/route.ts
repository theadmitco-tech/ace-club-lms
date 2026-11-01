import { NextRequest, NextResponse } from 'next/server';
import { getMyV2Meeting } from '@/lib/server/v2StudentDelivery';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const meeting = await getMyV2Meeting(request.nextUrl.searchParams.get('batchId'),request.nextUrl.searchParams.get('eventKey'));
  if (!meeting) return NextResponse.json({error:'Meeting unavailable. Active course access, batch enrollment and live registration are required. Completed classes have no join link.'},
    {status:404,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
  return new NextResponse(null,{status:303,headers:{Location:meeting.url,'Cache-Control':'private, no-store','Vary':'Cookie','Referrer-Policy':'no-referrer'}});
}
