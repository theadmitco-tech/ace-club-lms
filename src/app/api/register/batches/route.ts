import { NextResponse } from 'next/server';
import { getPublicBatches } from '@/lib/registration';
import { getErrorMessage } from '@/lib/errorMessage';

export async function GET() {
  try {
    const batches = await getPublicBatches(3);
    return NextResponse.json({ batches });
  } catch (error) {
    console.error('Failed to fetch public batches:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to load batches.') }, { status: 500 });
  }
}
