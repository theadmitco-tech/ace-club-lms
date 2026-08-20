import 'server-only';

import type { StudentTimelineMaterial, StudentTimelinePayload } from '@/lib/studentTimeline';
import { createClient } from '@/utils/supabase/server';

type StudentTimelineResult =
  | { status: 'ready'; studentName: string; timeline: StudentTimelinePayload }
  | { status: 'failed'; studentName: string; message: string };

export async function loadStudentTimeline(studentId: string): Promise<StudentTimelineResult> {
  const supabase = await createClient();
  const [{ data: profile }, { data, error }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', studentId)
      .maybeSingle(),
    supabase.rpc('get_student_timeline'),
  ]);
  const studentName = profile?.full_name?.trim() || 'Student';

  if (error || !data) {
    console.error('Student timeline load failed:', error);
    return {
      status: 'failed',
      studentName,
      message: 'We could not load your course right now. Please retry. If the problem continues, contact the programme team.',
    };
  }

  const timeline = data as StudentTimelinePayload;
  if (timeline.course && !Array.isArray(timeline.resources)) {
    const { data: releasedResources, error: resourceError } = await supabase
      .from('materials')
      .select('id, session_id, type, title, available_from, category, resource_scope, resource_format, section_key, text_content, notion_url, file_url, video_url, created_at')
      .eq('course_id', timeline.course.id)
      .lte('available_from', timeline.generated_at)
      .order('available_from', { ascending: false })
      .order('created_at', { ascending: false });

    if (resourceError) {
      console.error('Released Student resources fallback load failed:', resourceError);
    } else {
      const sessions = new Map(timeline.sessions.map((session) => [session.id, session]));
      const timelineMaterials = new Map(timeline.sessions.flatMap((session) => (
        session.materials.map((material) => [material.id, material] as const)
      )));
      timeline.resources = (releasedResources ?? []).map((resource) => {
        const session = resource.session_id ? sessions.get(resource.session_id) : null;
        const timelineMaterial = timelineMaterials.get(resource.id);
        return {
          id: resource.id,
          session_id: resource.session_id,
          type: resource.type,
          title: resource.title,
          available_from: resource.available_from,
          is_available: true,
          tracker_available: timelineMaterial?.tracker_available ?? false,
          category: resource.category,
          resource_scope: resource.resource_scope,
          resource_format: resource.resource_format,
          section_key: resource.section_key
            ?? session?.section_key
            ?? (session?.class_type && ['QA', 'VA', 'DI'].includes(session.class_type) ? session.class_type.toLowerCase() : null),
          session_title: session?.title ?? null,
          text_content: resource.text_content,
          notion_url: resource.notion_url,
          file_url: resource.file_url,
          video_url: resource.video_url,
          created_at: resource.created_at,
        } as StudentTimelineMaterial;
      });
    }
  }

  return {
    status: 'ready',
    studentName,
    timeline,
  };
}
