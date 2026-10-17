import Link from 'next/link';
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

export function StudentHeader({ studentName, testerMode = false }: { studentName: string; testerMode?: boolean }) {
  return (
    <header className="student-header">
      <div className="student-header-inner">
        <Link className="student-brand" href={testerMode ? '/admin' : '/dashboard'} aria-label={testerMode ? 'Ace Club admin home' : 'Ace Club student home'}>
          <BrandLogo variant="light" className="student-brand-logo" preload />
        </Link>
        <nav className="student-navigation" aria-label={testerMode ? 'Mock tester navigation' : 'Student navigation'}>
          {testerMode ? <><Link href="/admin">Admin</Link><Link href="/mocks">Mocks</Link></> : <>
          <Link href="/dashboard">Home</Link>
          <Link href="/schedule">Schedule</Link>
          <Link href="/resources">Resources</Link>
          <Link href="/mocks">Mocks</Link>
          <Link className="student-navigation-secondary" href="/practice">Practice log</Link>
          <Link href="/courses">Switch course</Link>
          </>}
        </nav>
        <div className="student-account">
          <span className="student-avatar" aria-hidden="true">{getInitials(studentName)}</span>
          <span className="student-account-copy">
            <strong>{studentName}</strong>
            <small>{testerMode ? 'Mock tester' : 'Student'}</small>
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
