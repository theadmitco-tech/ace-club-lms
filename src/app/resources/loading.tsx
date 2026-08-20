import { BrandLogo } from '@/components/BrandLogo';
import '../dashboard/dashboard.css';

export default function ResourcesLoading() {
  return <div className="student-page"><div className="student-loading" role="status">
    <BrandLogo variant="light" className="loading-brand-logo" /><div><strong>Loading Resources</strong><p>Checking what is available now…</p></div>
  </div></div>;
}
