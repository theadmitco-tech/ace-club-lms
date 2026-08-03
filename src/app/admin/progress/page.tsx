import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

type CourseSummary = {
  id: string;
  name: string;
  is_active: boolean;
  enrollments: { id: string }[] | null;
};

export default async function AdminProgressPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('id, name, is_active, enrollments(id)')
    .order('created_at', { ascending: false });

  const courses = (data || []) as CourseSummary[];

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Student progress</h1>
          <p className="admin-page-subtitle">Read-only worksheet totals from each Student&apos;s manual Practice log.</p>
        </div>
      </div>

      {error ? (
        <div className="admin-card admin-progress-message" role="alert">
          <h2 className="admin-card-title">Progress could not be loaded</h2>
          <p>Retry this page, or contact support if the problem continues.</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="admin-card admin-progress-message">
          <h2 className="admin-card-title">No batches yet</h2>
          <p>Create a batch and enroll Students before checking worksheet progress.</p>
          <Link className="btn btn-secondary" href="/admin/courses">View batches</Link>
        </div>
      ) : (
        <div className="admin-progress-course-grid">
          {courses.map((course) => (
            <article className="admin-card admin-progress-course-card" key={course.id}>
              <div>
                <div className="admin-progress-card-heading">
                  <h2 className="admin-card-title">{course.name}</h2>
                  <span className={`badge ${course.is_active ? 'badge-available' : 'badge-locked'}`}>
                    {course.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p>{course.enrollments?.length || 0} enrolled Students</p>
              </div>
              <Link className="btn btn-primary" href={`/admin/progress/${course.id}`}>
                View progress
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
