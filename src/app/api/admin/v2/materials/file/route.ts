import { NextRequest, NextResponse } from 'next/server';
import { getV2AdminMaterialPath, streamV2Material } from '@/lib/server/v2MaterialFiles';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const params=request.nextUrl.searchParams;
  const unavailable=()=>NextResponse.json({error:'Material unavailable'},{status:404,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
  if (params.getAll('path').length!==1 || [...params.keys()].some((name)=>name!=='path')) return unavailable();
  const path=await getV2AdminMaterialPath(params.get('path'));
  if (!path) return unavailable();
  return await streamV2Material(path,request.headers.get('range')) ?? unavailable();
}
