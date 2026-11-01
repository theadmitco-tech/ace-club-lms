import { NextRequest, NextResponse } from 'next/server';
import { getV2StudentMaterialPath, streamV2Material } from '@/lib/server/v2MaterialFiles';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const params=request.nextUrl.searchParams;
  const fields=['batchId','sessionKey','itemKey'];
  const unavailable=()=>NextResponse.json({error:'Material unavailable'},{status:404,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
  if (fields.some((name)=>params.getAll(name).length!==1) || [...params.keys()].some((name)=>!fields.includes(name))) return unavailable();
  const path=await getV2StudentMaterialPath(params.get('batchId'),params.get('sessionKey'),params.get('itemKey'));
  if (!path) return unavailable();
  return await streamV2Material(path,request.headers.get('range')) ?? unavailable();
}
