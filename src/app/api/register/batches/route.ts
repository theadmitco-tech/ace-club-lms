import { NextResponse } from 'next/server';
import { getPublicBatches } from '@/lib/registration';

export async function GET() {
  try {
    const batches = await getPublicBatches(3);
    return NextResponse.json({ batches });
  } catch (error: any) {
    console.error('Failed to fetch public batches:', error);
    return NextResponse.json({ error: error.message || 'Failed to load batches.' }, { status: 500 });
  }
}
