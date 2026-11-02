'use server';
import { setV2LiveMapping } from '@/lib/server/v2Learning';
import { revalidatePath } from 'next/cache';
import { setV2LiveRegistration, completeV2LiveClass } from '@/lib/server/v2StudentDelivery';

export async function setLiveRegistrationAction(input: unknown) {
  const result = await setV2LiveRegistration(input);
  if (result.status === 'success') revalidatePath('/admin/v2/batches','layout');
  return result;
}
export async function completeLiveClassAction(input: {batchId:string;eventKey:string;publicationRevision:number}) {
  const result = await completeV2LiveClass(input);
  if (result.status === 'success') { revalidatePath('/admin/v2/batches','layout'); revalidatePath('/schedule/v2'); }
  return result;
}

export async function setLiveMappingAction(input: { batchId: string; eventKey: string; sessionKey: string; publicationRevision: number }) {
  const result = await setV2LiveMapping(input);
  if (result.status === 'success') revalidatePath('/admin/v2/batches', 'layout');
  return result;
}
