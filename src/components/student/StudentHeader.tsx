import Link from 'next/link';
import { isV2LearningEnabled } from '@/lib/server/v2LearningFeature';
import previewStyles from './studentPreview.module.css';
import { isV2Phase1PreviewEnabled } from '@/lib/server/v2Phase1Feature';
import { BrandLogo } from '@/components/BrandLogo';
import { SignOutButton } from './SignOutButton';

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function StudentHeader({ studentName }: { studentName: string }) {
  const preview = isV2Phase1PreviewEnabled();
  const learning = isV2LearningEnabled();
  return (
    <header className={preview ? `student-header ${previewStyles.previewHeader}` : 'student-header'}>
      <div className="student-header-inner">
        <Link className="student-brand" href="/dashboard" aria-label="Ace Club student home">
          <BrandLogo variant="light" className="student-brand-logo" preload />
        </Link>
        <nav className="student-navigation" aria-label="Student navigation">
          <Link href={learning ? '/schedule/v2' : '/dashboard'}>{preview ? 'My learning' : 'Home'}</Link>
          {preview && <><Link href="/account/access" prefetch={false}>My access</Link><Link href="/courses/v2" prefetch={false}>Explore courses</Link></>}
          {learning && <Link href="/dashboard">Dashboard</Link>}
          <Link href="/schedule">Schedule</Link>
          <Link href="/resources">Resources</Link>
          <Link className="student-navigation-secondary" href="/practice">Practice log</Link>
        </nav>
        <div className="student-account">
          <span className="student-avatar" aria-hidden="true">{getInitials(studentName)}</span>
          <span className="student-account-copy">
            <strong>{studentName}</strong>
            <small>Student</small>
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
