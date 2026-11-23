import Link from 'next/link';
import { isV2LearningEnabled } from '@/lib/server/v2LearningFeature';
import previewStyles from './studentPreview.module.css';
import styles from './studentHeader.module.css';
import { isV2Phase1PreviewEnabled } from '@/lib/server/v2Phase1Feature';
import { BrandLogo } from '@/components/BrandLogo';
import { SignOutButton } from './SignOutButton';

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export function StudentHeader({ studentName }: { studentName: string }) {
  const preview = isV2Phase1PreviewEnabled();
  const learning = isV2LearningEnabled();
  if (!learning) {
    // Students on the earlier course system keep its navigation unchanged.
    return (
      <header className={preview ? `student-header ${previewStyles.previewHeader}` : 'student-header'}>
        <div className="student-header-inner">
          <Link className="student-brand" href="/dashboard" aria-label="Ace Club student home"><BrandLogo variant="light" className="student-brand-logo" preload /></Link>
          <nav className="student-navigation" aria-label="Student navigation">
            <Link href="/dashboard">{preview ? 'My learning' : 'Home'}</Link>
            {preview && <><Link href="/account/access" prefetch={false}>My access</Link><Link href="/courses/v2" prefetch={false}>Explore courses</Link></>}
            <Link href="/schedule">Schedule</Link><Link href="/resources">Resources</Link><Link className="student-navigation-secondary" href="/practice">Practice log</Link>
          </nav>
          <div className="student-account">
            <span className="student-avatar" aria-hidden="true">{getInitials(studentName)}</span>
            <span className="student-account-copy"><strong>{studentName}</strong><small>Student</small></span>
            <SignOutButton />
          </div>
        </div>
      </header>
    );
  }
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/schedule/v2" aria-label="Ace Club, my learning"><BrandLogo variant="light" className="student-brand-logo" preload /></Link>
        <nav className={styles.nav} aria-label="Student navigation">
          <Link href="/schedule/v2">My learning</Link>
          {preview && <><Link href="/account/access" prefetch={false}>My access</Link><Link href="/courses/v2" prefetch={false}>Explore courses</Link></>}
        </nav>
        <details className={styles.account}>
          <summary aria-label={`Account menu for ${studentName}`}>
            <span className={styles.avatar} aria-hidden="true">{getInitials(studentName)}</span>
            <span className={styles.name}>{studentName}</span>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
          </summary>
          <div className={styles.menu}>
            <p className={styles.menuName}>{studentName}<small>Student</small></p>
            <nav aria-label="More pages">
              <Link href="/dashboard">Mocks & practice</Link>
              <p className={styles.menuGroup}>Older course pages</p>
              <Link href="/schedule">Schedule</Link>
              <Link href="/resources">Resources</Link>
              <Link href="/practice">Practice log</Link>
            </nav>
            <div className={styles.signOut}><SignOutButton /></div>
          </div>
        </details>
      </div>
    </header>
  );
}
