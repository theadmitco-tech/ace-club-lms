import Link from 'next/link';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { getMyDisplayName } from '@/lib/server/studentProfile';
import { StudentHeader } from '@/components/student/StudentHeader';
import styles from './help.module.css';
import '../dashboard/dashboard.css';

export const dynamic = 'force-dynamic';

// The public WhatsApp contact already shown on the homepage, used until a support email or phone is configured.
const DEFAULT_WHATSAPP = 'https://wa.me/917689992562';

const QUESTIONS: { q: string; a: React.ReactNode }[] = [
  { q: 'Why are some of my sessions locked?', a: <>After you watch most of a recording, or after a live class you were registered for, we ask for quick feedback on that session. Until you send it, the other sessions <em>in that subject</em> pause. The session itself and your other subjects stay open. Sending feedback, or “I didn’t attend” for a live class you missed, reopens everything straight away.</> },
  { q: 'How do I join a live class?', a: <>Open <strong>Live classes</strong> at the top. A <strong>Join class</strong> button appears 15 minutes before the class starts. Live classes are for students with a live seat; every recording is available to everyone in the course.</> },
  { q: 'The recording for a session isn’t there yet.', a: <>Recordings are added after the class. You can still give feedback for a class you missed by choosing “I didn’t attend”; you don’t need to watch the recording first.</> },
  { q: 'I watched a recording on another site. How do I mark it?', a: <>Open the recording from its session and press <strong>I’ve watched this recording</strong> when you’re done.</> },
  { q: 'When does my access end?', a: <>Every course gives six months of access from the day your payment is confirmed. Your end dates are in <Link href="/account/access">My access</Link>, and the course page reminds you in the last 30 days.</> },
  { q: 'How do I add another subject?', a: <>Choose the subject at the top of the page, or go to <Link href="/courses/v2">Explore courses</Link>. If you already have a course, you pay only the difference and keep your end date.</> },
  { q: 'I paid but can’t see my course.', a: <>Payments are confirmed before access opens, which usually takes a moment. Check your registrations on the checkout page. Please don’t pay again; contact us with your registration reference instead.</> },
];

/** Answers to common questions and how to reach the programme team. */
export default async function HelpPage() {
  await requirePortalRole('student');
  const studentName = await getMyDisplayName();
  const email = process.env.V2_SUPPORT_EMAIL?.trim();
  const phone = process.env.V2_SUPPORT_PHONE?.trim();
  return <div className="student-page"><StudentHeader studentName={studentName} /><main className="student-main"><div className={`student-container ${styles.page}`}>
    <header className={styles.intro}><h1>Help</h1><p>Quick answers, and how to reach the programme team.</p></header>
    <section aria-labelledby="questions-heading">
      <h2 id="questions-heading" className={styles.sectionTitle}>Common questions</h2>
      <div className={styles.questions}>{QUESTIONS.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div>
    </section>
    <section className={styles.contact} aria-labelledby="contact-heading">
      <h2 id="contact-heading">Still stuck? Contact the programme team</h2>
      <p>Tell us your name, your course and what you were trying to do. For payment questions, include your registration reference.</p>
      <ul>
        {email && <li><span>Email</span><strong>{email}</strong> <a href={`mailto:${email}`}>Write an email</a></li>}
        {phone && <li><span>Phone</span><strong>{phone}</strong></li>}
        {!email && !phone && <li><span>WhatsApp</span><a href={DEFAULT_WHATSAPP} target="_blank" rel="noreferrer">Message the programme team ↗</a></li>}
      </ul>
    </section>
  </div></main></div>;
}
