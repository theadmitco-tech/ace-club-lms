import { BrandLogo } from '@/components/BrandLogo';
import './dashboard.css';

export default function DashboardLoading() {
  return (
    <div className="student-page">
      <div className="student-loading" role="status">
        <BrandLogo variant="light" className="loading-brand-logo" />
        <div>
          <strong>Loading your course</strong>
          <p>Preparing recommendations and your timeline…</p>
        </div>
      </div>
    </div>
  );
}
