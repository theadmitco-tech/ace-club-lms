import { NextRequest, NextResponse } from 'next/server';
import { contentOperation, ContentConflictError } from '@/lib/server/v2ContentPublishing';
import { prepareContentUpload } from '@/lib/server/v2ContentAssets';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function POST(request: NextRequest) {
  if(request.headers.get('origin')!==request.nextUrl.origin) return NextResponse.json({error:'Same-origin request required.'},{status:403,headers});
  try {
    const raw=await request.text();if(raw.length>200000) return NextResponse.json({error:'Content request too large.'},{status:413,headers});
    const body=JSON.parse(raw);if(!body||typeof body.action!=='string'||!body.input||typeof body.input!=='object') throw new Error('Invalid request.');
    return NextResponse.json(await (body.action==='upload'?prepareContentUpload(body.input):contentOperation(body.action,body.input)),{headers});
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Content action unavailable.'},{status:error instanceof ContentConflictError?409:400,headers});}
}
