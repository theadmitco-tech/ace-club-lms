'use client';

import { StudentRouteError } from '@/components/student/StudentRouteError';
import '../dashboard/dashboard.css';

export default function ScheduleError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <StudentRouteError {...props} destination="Schedule" />;
}
