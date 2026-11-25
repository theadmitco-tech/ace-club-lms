import 'server-only';
import { createClient } from '@/utils/supabase/server';

export type V2BatchMock = { id: string; title: string; startsAt: string; endsAt: string | null; testUrl: string | null; instructions: string };
export type V2StudentMock = V2BatchMock & { batchId: string };
export type V2MockSaveResult = { status: 'success'; id: string } | { status: 'error'; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const instant = (value: unknown): value is string => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
const isMock = (value: unknown): value is V2BatchMock => {
  const item = value as Record<string, unknown> | null;
  return !!item && typeof item.id === 'string' && typeof item.title === 'string' && instant(item.startsAt)
    && (item.endsAt === null || instant(item.endsAt)) && (item.testUrl === null || typeof item.testUrl === 'string') && typeof item.instructions === 'string';
};

/** Admin view of one batch's mocks; null when they can't be read. */
export async function listV2BatchMocks(batchId: string): Promise<V2BatchMock[] | null> {
  if (!UUID.test(batchId)) return null;
  const client = await createClient();
  const { data, error } = await client.rpc('list_v2_batch_mocks', { p_batch_id: batchId });
  return error || !Array.isArray(data) || !data.every(isMock) ? null : data as V2BatchMock[];
}

/** Creates or updates a mock after validating the request; the database also checks the Admin and every field. */
export async function saveV2BatchMock(input: unknown): Promise<V2MockSaveResult> {
  const value = (input ?? {}) as Record<string, unknown>;
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const testUrl = typeof value.testUrl === 'string' ? value.testUrl.trim() : '';
  const instructions = typeof value.instructions === 'string' ? value.instructions.trim() : '';
  if (typeof value.batchId !== 'string' || !UUID.test(value.batchId) || (value.id != null && (typeof value.id !== 'string' || !UUID.test(value.id))))
    return { status: 'error', message: 'Reload the batch and try again.' };
  if (!title || title.length > 160) return { status: 'error', message: 'Give the mock a name of up to 160 characters.' };
  if (!instant(value.startsAt)) return { status: 'error', message: 'Choose the mock’s date and start time.' };
  if (value.endsAt != null && (!instant(value.endsAt) || Date.parse(value.endsAt) <= Date.parse(value.startsAt))) return { status: 'error', message: 'The end time must be after the start time.' };
  if (testUrl && (!/^https:\/\/\S+$/.test(testUrl) || testUrl.length > 2000)) return { status: 'error', message: 'The test link must start with https://.' };
  if (instructions.length > 2000) return { status: 'error', message: 'Keep the instructions under 2,000 characters.' };
  const client = await createClient();
  const { data, error } = await client.rpc('save_v2_batch_mock', { p_batch_id: value.batchId, p_mock_id: value.id ?? null, p_title: title,
    p_starts_at: value.startsAt, p_ends_at: value.endsAt ?? null, p_test_url: testUrl || null, p_instructions: instructions });
  if (error || !data || typeof (data as { id?: unknown }).id !== 'string') return { status: 'error', message: error?.code === '42501' ? 'Only active Admins can change mocks.' : 'The mock could not be saved. Please try again.' };
  return { status: 'success', id: (data as { id: string }).id };
}

export async function deleteV2BatchMock(batchId: string, mockId: string): Promise<boolean> {
  if (!UUID.test(batchId) || !UUID.test(mockId)) return false;
  const client = await createClient();
  const { data, error } = await client.rpc('delete_v2_batch_mock', { p_batch_id: batchId, p_mock_id: mockId });
  return !error && (data as { deleted?: boolean } | null)?.deleted === true;
}

/** The signed-in student's mocks from batches they're enrolled in with active access; null when they can't be read. */
export async function getMyV2Mocks(): Promise<V2StudentMock[] | null> {
  try {
    const client = await createClient();
    const { data, error } = await client.rpc('get_my_v2_mocks');
    return error || !Array.isArray(data) || !data.every(item => isMock(item) && typeof (item as { batchId?: unknown }).batchId === 'string') ? null : data as V2StudentMock[];
  } catch { return null; }
}
