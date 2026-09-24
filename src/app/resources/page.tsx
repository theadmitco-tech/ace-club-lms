import Link from 'next/link';
import { PortalResourceCard } from '@/components/student/PortalResourceCard';
import { ResourceFilters } from '@/components/student/ResourceFilters';
import { StudentHeader } from '@/components/student/StudentHeader';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { loadStudentTimeline } from '@/lib/server/studentTimeline';
import type { StudentTimelineMaterial } from '@/lib/studentTimeline';
import '../dashboard/dashboard.css';

type ResourceSearchParams = Promise<{
  category?: string | string[];
  section?: string | string[];
  topic?: string | string[];
}>;

const CATEGORY_LABELS: Record<string, string> = {
  starter_pack: 'Starter Pack', pre_read: 'Pre-read', worksheet: 'Worksheet',
  session_material: 'Session Material', recording: 'Class Recording', post_class: 'Post-class',
  reference: 'Reference', other: 'Other',
};
const CATEGORY_ORDER = ['starter_pack', 'pre_read', 'worksheet', 'session_material', 'recording', 'post_class', 'reference', 'other'];
const SECTION_ORDER = ['QA', 'VA', 'DI'];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResourcesPage({ searchParams }: { searchParams: ResourceSearchParams }) {
  const identity = await requirePortalRole('student');
  const [query, result] = await Promise.all([searchParams, loadStudentTimeline(identity.id, identity.fullName)]);

  if (result.status === 'failed') {
    return <div className="student-page"><StudentHeader studentName={result.studentName} />
      <main className="student-main"><section className="student-state student-state-error" role="alert">
        <h1>We couldn&apos;t load your Resources</h1><p>{result.message}</p><Link className="student-button" href="/resources">Retry Resources</Link>
      </section></main></div>;
  }

  const { studentName, timeline } = result;
  if (!timeline.course) {
    return <div className="student-page"><StudentHeader studentName={studentName} />
      <main className="student-main"><section className="student-state"><h1>No Resources yet</h1><p>Your released learning material will appear after a course is assigned.</p></section></main>
    </div>;
  }

  const resources: StudentTimelineMaterial[] = timeline.resources ?? timeline.sessions.flatMap((session) => (
    session.materials.filter((material) => material.is_available).map((material) => ({
      ...material,
      session_id: session.id,
      session_title: session.title,
      section_key: session.section_key ?? session.class_type,
    }))
  ));
  const sections = Array.from(new Set(resources.map((resource) => resource.section_key?.toUpperCase()).filter(Boolean))).sort((left, right) => {
    const leftIndex = SECTION_ORDER.indexOf(left!);
    const rightIndex = SECTION_ORDER.indexOf(right!);
    return (leftIndex < 0 ? SECTION_ORDER.length : leftIndex) - (rightIndex < 0 ? SECTION_ORDER.length : rightIndex)
      || left!.localeCompare(right!);
  }) as string[];
  const requestedCategory = firstValue(query.category);
  const requestedSection = firstValue(query.section)?.toUpperCase();
  const requestedTopic = firstValue(query.topic);
  const selectedSection = sections.includes(requestedSection ?? '') ? requestedSection : undefined;
  const sectionResources = resources.filter((resource) => (
    !selectedSection || resource.section_key?.toUpperCase() === selectedSection
  ));
  const topics = Array.from(new Map(sectionResources.filter((resource) => resource.session_id).map((resource) => [
    resource.session_id!, {
      id: resource.session_id!,
      title: resource.session_title ?? 'Course topic',
      section: resource.section_key?.toUpperCase() ?? '',
    },
  ])).values()).sort((left, right) => {
    const leftIndex = SECTION_ORDER.indexOf(left.section);
    const rightIndex = SECTION_ORDER.indexOf(right.section);
    return (leftIndex < 0 ? SECTION_ORDER.length : leftIndex) - (rightIndex < 0 ? SECTION_ORDER.length : rightIndex);
  });
  const selectedTopic = topics.some(({ id }) => id === requestedTopic) ? requestedTopic : undefined;
  const topicResources = sectionResources.filter((resource) => !selectedTopic || resource.session_id === selectedTopic);
  const categories = Array.from(new Set(topicResources.map((resource) => resource.category).filter(Boolean))).sort((left, right) => (
    CATEGORY_ORDER.indexOf(left!) - CATEGORY_ORDER.indexOf(right!)
  )) as string[];
  const selectedCategory = categories.includes(requestedCategory ?? '') ? requestedCategory : undefined;
  const filteredResources = resources.filter((resource) => (
    (!selectedCategory || resource.category === selectedCategory)
    && (!selectedSection || resource.section_key?.toUpperCase() === selectedSection)
    && (!selectedTopic || resource.session_id === selectedTopic)
  ));

  return <div className="student-page">
    <StudentHeader studentName={studentName} />
    <main className="student-main"><div className="student-container">
      <header className="student-intro"><div><span className="student-eyebrow">{timeline.course.name}</span><h1>Resources</h1>
        <p>Browse every resource currently available to you. Starter Packs and standalone resources remain under All Sections and All Topics.</p></div></header>

      <ResourceFilters
        categories={categories.map((category) => ({ label: CATEGORY_LABELS[category] ?? category, value: category }))}
        sections={sections.map((section) => ({ label: section, value: section }))}
        selectedCategory={selectedCategory}
        selectedSection={selectedSection}
        selectedTopic={selectedTopic}
        topics={topics.map(({ id, title }) => ({ label: title, value: id }))}
      />

      <section className="resource-results" aria-live="polite">
        <div className="browser-heading"><div><span className="student-eyebrow">Available now</span><h2>{filteredResources.length} resource{filteredResources.length === 1 ? '' : 's'}</h2></div>
          {(selectedCategory || selectedSection || selectedTopic) && <Link className="text-link" href="/resources">Clear filters</Link>}</div>
        {filteredResources.length > 0 ? <div className="resource-browser-grid">
          {filteredResources.map((resource) => <PortalResourceCard hideDetails key={resource.id} resource={resource} />)}
        </div> : <div className="student-state compact"><h3>No matching resources</h3><p>Clear one or more filters to see other available material.</p></div>}
      </section>
    </div></main>
  </div>;
}
