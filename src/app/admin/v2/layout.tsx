import type { ReactNode } from 'react';
import WorkspaceNavigation from './WorkspaceNavigation';
import styles from './workspace.module.css';

export default function CourseWorkspaceLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>
    <div className={styles.context}><span>ADMIN / COURSE WORKSPACE</span><span>Content, with room to grow.</span></div>
    <WorkspaceNavigation />
    {children}
  </div>;
}
