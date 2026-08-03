import Link from 'next/link';
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
  return (
    <header className="student-header">
      <div className="student-header-inner">
        <Link className="student-brand" href="/dashboard" aria-label="Ace Club student home">
          <span className="student-brand-mark" aria-hidden="true">A</span>
          <span>Ace Club</span>
        </Link>
        <nav className="student-navigation" aria-label="Student navigation">
          <Link href="/dashboard">Course</Link>
          <Link href="/practice">Practice log</Link>
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
