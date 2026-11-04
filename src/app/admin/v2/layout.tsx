import { isV2ContentPublishingEnabled } from '@/lib/server/v2ContentPublishing';
import type { ReactNode } from 'react';
import WorkspaceNavigation from './WorkspaceNavigation';
import styles from './workspace.module.css';

export default function CourseWorkspaceLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>

    <WorkspaceNavigation contentEnabled={isV2ContentPublishingEnabled()} />
    {children}
  </div>;
}
