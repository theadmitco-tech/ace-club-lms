import {NextRequest,NextResponse} from 'next/server';
import {authorizedContentAsset,streamContentAsset} from '@/lib/server/v2ContentAssets';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const unavailable=()=>NextResponse.json({error:'Content unavailable'},{status:404,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
 const path=await authorizedContentAsset(request.nextUrl.searchParams,true);
 return path?await streamContentAsset(path,request.headers.get('range'))??unavailable():unavailable();
}
