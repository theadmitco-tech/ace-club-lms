'use server';

import { revalidatePath } from 'next/cache';
import { cancelBatchEvent, reorderBatchEvents, saveBatchEvent, shiftBatchSchedule, type SaveBatchEventInput } from '@/lib/server/batchSchedule';
import { requirePortalRole } from '@/lib/server/portalAuthorization';

export type ScheduleActionResult = { status: 'success' | 'error'; message: string; scheduleRevision?: number };

export async function shiftScheduleAction(input: {
  courseId: string; sessionId: string; days: number; expectedRevision: number;
}): Promise<ScheduleActionResult> {
  await requirePortalRole('admin');
  try {
    const result = await shiftBatchSchedule(input.courseId, input.sessionId, input.days, input.expectedRevision);
    revalidatePath('/admin/sessions');
    return { status: 'success', scheduleRevision: result.scheduleRevision, message: `Shifted ${result.events.length} eligible event${result.events.length === 1 ? '' : 's'}.` };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to shift the schedule.' };
  }
}

export async function cancelEventAction(input: {
  courseId: string; sessionId: string; reason: string; expectedRevision: number;
}): Promise<ScheduleActionResult> {
  await requirePortalRole('admin');
  try {
    const result = await cancelBatchEvent(input.courseId, input.sessionId, input.reason, input.expectedRevision);
    revalidatePath('/admin/sessions');
    return { status: 'success', scheduleRevision: result.scheduleRevision, message: 'Future event cancelled. Its history has been preserved.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to cancel the event.' };
  }
}

export async function reorderEventsAction(input: { courseId: string; sessionIds: string[]; expectedRevision: number }): Promise<ScheduleActionResult> {
  await requirePortalRole('admin');
  try {
    const result = await reorderBatchEvents(input.courseId, input.sessionIds, input.expectedRevision);
    revalidatePath('/admin/sessions');
    return { status: 'success', scheduleRevision: result.scheduleRevision, message: `Reordered ${result.events} eligible future events.` };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to reorder the schedule.' };
  }
}

export async function saveEventAction(input: SaveBatchEventInput): Promise<ScheduleActionResult & { sessionId?: string }> {
  await requirePortalRole('admin');
  try {
    const result = await saveBatchEvent(input);
    revalidatePath('/admin/sessions');
    return { status: 'success', scheduleRevision: result.scheduleRevision, sessionId: result.sessionId, message: input.sessionId ? 'Future event updated.' : 'Extra future event added to this batch only.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to save the event.' };
  }
}
