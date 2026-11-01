import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import { getMyV2Meeting } from '@/lib/server/v2StudentDelivery';
import { StudentHeader } from '@/components/student/StudentHeader';
import '../../../../../dashboard/dashboard.css';

export default async function LiveClassPage({params}:{params:Promise<{batchId:string;eventKey:string}>}) {
  if (!isV2StudentScheduleEnabled()) notFound();
  await requirePortalRole('student');
  const {batchId,eventKey}=await params;
  const meeting=await getMyV2Meeting(batchId,eventKey);
  return <div className="student-page"><StudentHeader studentName="Student" /><main className="student-main"><div className="student-container">
    <Link className="student-button" href="/schedule/v2">Back to enrolled batches</Link>
    <section className="student-state"><span className="student-eyebrow">Live class</span><h1>{meeting ? 'The class is ready to join' : 'Meeting unavailable'}</h1>
      {meeting ? <><p>The meeting opens in Google Meet. Course access and registration are checked again when the join button is selected.</p>
        <a className="student-button" href={`/api/v2/meeting?batchId=${batchId}&eventKey=${eventKey}`} target="_blank" rel="noopener noreferrer">Join Google Meet</a></>
        : <><p>The class may be completed or its meeting link may not be published. Active course access, batch enrollment and live registration are required.</p>
          <Link className="student-button" href="/account/access" prefetch={false}>Review course access</Link><p>The programme team can confirm live registration.</p></>}
    </section></div></main></div>;
}
