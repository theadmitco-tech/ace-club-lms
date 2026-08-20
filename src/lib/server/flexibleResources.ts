import 'server-only';

import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { FlexibleResourceDraft, ResourceCategory, ResourceFormat, ResourceScope } from '@/lib/flexibleResources';
import {
  COURSE_MATERIALS_BUCKET,
  getProtectedMaterialPath,
  isSupportedProtectedMaterialPath,
} from '@/lib/materialFiles';
import { createClient } from '@/utils/supabase/server';

export type ResourceCourse = {
  id: string;
  name: string;
  cohortStartDate: string | null;
  isPublished: boolean;
};

export type ResourceSession = {
  id: string;
  courseId: string;
  title: string;
  displayOrder: number;
  sectionKey: string | null;
  sessionDate: string;
  sessionEndAt: string | null;
};

export type FlexibleResource = {
  id: string;
  courseId: string;
  sessionId: string | null;
  title: string;
  category: ResourceCategory;
  scope: ResourceScope;
  format: ResourceFormat;
  sectionKey: string | null;
  notionUrl: string | null;
  fileUrl: string | null;
  videoUrl: string | null;
  textContent: string | null;
  availableFrom: string;
  createdAt: string;
  reusable: boolean;
};

type CourseRow = { id: string; name: string; cohort_start_date: string | null; is_active: boolean };
type SessionRow = {
  id: string;
  course_id: string;
  title: string;
  display_order: number | null;
  session_number: number;
  section_key: string | null;
  session_date: string;
  session_end_at: string | null;
};
type MaterialRow = {
  id: string;
  course_id: string;
  session_id: string | null;
  title: string;
  category: ResourceCategory;
  resource_scope: ResourceScope;
  resource_format: ResourceFormat;
  section_key: string | null;
  notion_url: string | null;
  file_url: string | null;
  video_url: string | null;
  text_content: string | null;
  available_from: string;
  created_at: string;
  master_material_id: string | null;
  source_template_resource_id: string | null;
};

export async function listFlexibleResourceManagerData() {
  const supabase = await createClient();
  const [coursesResult, sessionsResult, materialsResult] = await Promise.all([
    supabase.from('courses').select('id, name, cohort_start_date, is_active').order('created_at', { ascending: false }),
    supabase.from('sessions').select('id, course_id, title, display_order, session_number, section_key, session_date, session_end_at').order('session_number'),
    supabase.from('materials').select('id, course_id, session_id, title, category, resource_scope, resource_format, section_key, notion_url, file_url, video_url, text_content, available_from, created_at, master_material_id, source_template_resource_id').order('created_at'),
  ]);
  const error = coursesResult.error ?? sessionsResult.error ?? materialsResult.error;
  if (error) throw new Error(`Unable to load resource manager: ${error.message}`);

  const courses = (coursesResult.data ?? []) as CourseRow[];
  const sessions = (sessionsResult.data ?? []) as SessionRow[];
  const materials = (materialsResult.data ?? []) as MaterialRow[];
  return {
    generatedAt: new Date().toISOString(),
    courses: courses.map((course): ResourceCourse => ({
      id: course.id,
      name: course.name,
      cohortStartDate: course.cohort_start_date,
      isPublished: course.is_active,
    })),
    sessions: sessions.map((session): ResourceSession => ({
      id: session.id,
      courseId: session.course_id,
      title: session.title,
      displayOrder: session.display_order ?? session.session_number,
      sectionKey: session.section_key,
      sessionDate: session.session_date,
      sessionEndAt: session.session_end_at,
    })),
    resources: materials.map((material): FlexibleResource => ({
      id: material.id,
      courseId: material.course_id,
      sessionId: material.session_id,
      title: material.title,
      category: material.category,
      scope: material.resource_scope,
      format: material.resource_format,
      sectionKey: material.section_key,
      notionUrl: material.notion_url,
      fileUrl: material.file_url,
      videoUrl: material.video_url,
      textContent: material.text_content,
      availableFrom: material.available_from,
      createdAt: material.created_at,
      reusable: Boolean(material.master_material_id || material.source_template_resource_id),
    })),
  };
}

export async function saveFlexibleResource(draft: FlexibleResourceDraft) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('save_batch_resource', {
    p_course_id: draft.courseId,
    p_title: draft.title,
    p_category: draft.category,
    p_resource_scope: draft.scope,
    p_resource_format: draft.format,
    p_section_key: draft.sectionKey,
    p_session_id: draft.sessionId,
    p_notion_url: draft.notionUrl,
    p_file_url: draft.fileUrl,
    p_video_url: draft.videoUrl,
    p_text_content: draft.textContent,
    p_material_id: draft.materialId,
  });
  if (error) throw new Error(error.message);
  return data as { id: string; availableFrom: string; previousFileUrl: string | null };
}

function getStorageAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function cleanupProtectedResourceFile(fileUrl: string | null | undefined) {
  const path = fileUrl ? getProtectedMaterialPath(fileUrl) : null;
  if (!path || !isSupportedProtectedMaterialPath(path)) return false;
  const admin = getStorageAdmin();
  if (!admin) return false;
  const { error } = await admin.storage.from(COURSE_MATERIALS_BUCKET).remove([path]);
  if (error) console.error('Flexible resource private-file cleanup failed:', error);
  return !error;
}

export async function removeUnreleasedFlexibleResource(courseId: string, materialId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('remove_unreleased_batch_resource', {
    p_course_id: courseId,
    p_material_id: materialId,
  });
  if (error || !data) throw new Error(error?.message || 'Unable to remove this resource.');
  const result = data as { id: string; fileUrl: string | null };
  if (!result.fileUrl) return { cleanupPending: false };
  return { cleanupPending: !(await cleanupProtectedResourceFile(result.fileUrl)) };
}
