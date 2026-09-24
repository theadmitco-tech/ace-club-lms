import { BrandLogo } from '@/components/BrandLogo';
import { SignOutButton } from '@/components/student/SignOutButton';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { loadStudentCourseSelection } from '@/lib/server/studentCourses';
import { selectStudentCourseAction } from './actions';
import '../dashboard/dashboard.css';
import './courses.css';

function formatStartDate(value: string | null) {
  if (!value) return 'Start date not listed';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(`${value}T00:00:00+05:30`));
}

export default async function CoursesPage() {
  const identity = await requirePortalRole('student', { allowCourseSelection: true });
  const selection = await loadStudentCourseSelection();

  return (
    <div className="course-picker-page">
      <header className="course-picker-header">
        <BrandLogo variant="light" className="course-picker-logo" preload />
        <div className="course-picker-account">
          <span>{identity.fullName}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="course-picker-main">
        <span className="student-eyebrow">Your learning</span>
        <h1>{selection.courses.length > 1 ? 'Which course would you like to open?' : 'Your course'}</h1>
        <p className="course-picker-intro">
          All courses linked to your account remain available here, including completed and historical batches.
        </p>

        {selection.courses.length === 0 ? (
          <section className="course-picker-empty">
            <h2>No course assigned</h2>
            <p>Contact the programme team if you expected a course to appear here.</p>
          </section>
        ) : (
          <div className="course-picker-grid">
            {selection.courses.map((course) => {
              const isSelected = course.id === selection.selectedCourseId;
              return (
                <article className={`course-picker-card${isSelected ? ' course-picker-card-selected' : ''}`} key={course.id}>
                  <div className="course-picker-card-heading">
                    <span>{course.courseMode === 'crash' ? 'Crash course' : 'Full course'}</span>
                    <small>{course.isActive ? 'Current batch' : 'Historical batch'}</small>
                  </div>
                  <h2>{course.name}</h2>
                  <p>{formatStartDate(course.cohortStartDate)}</p>
                  <form action={selectStudentCourseAction}>
                    <input name="courseId" type="hidden" value={course.id} />
                    <button className="course-picker-button" type="submit">
                      {isSelected ? 'Continue with this course' : 'Open course'}
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
