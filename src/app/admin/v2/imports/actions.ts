'use server';
import { revalidatePath } from 'next/cache';
import { contentImportOperation } from '@/lib/server/v2ContentImports';
export async function contentImportAction(operation: unknown, input: unknown) {
  const result = await contentImportOperation(operation, input);
  if (result.status === 'success' && ['apply', 'recover', 'replace'].includes(String(operation))) {
    revalidatePath('/admin/v2/imports');
    revalidatePath('/admin/v2/templates');
  }
  return result;
}
