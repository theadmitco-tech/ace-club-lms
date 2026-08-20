import { BrandLogo } from '@/components/BrandLogo';
import '../dashboard/dashboard.css';

export default function ScheduleLoading() {
  return <div className="student-page"><div className="student-loading" role="status">
    <BrandLogo variant="light" className="loading-brand-logo" /><div><strong>Loading Schedule</strong><p>Preparing your published events…</p></div>
  </div></div>;
}
