'use client';

import type { ReactNode } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import styles from './studentAccess.module.css';

export default function StudentAccessTabs({ libraries, live }: { libraries: ReactNode; live: ReactNode }) {
  return <Tabs defaultSelectedKey="libraries" className={styles.tabs}>
    <TabList aria-label="Student access" className={styles.tabList}>
      <Tab id="libraries" className={styles.tab}>Subject libraries</Tab>
      <Tab id="live" className={styles.tab}>Live batches</Tab>
    </TabList>
    <TabPanel id="libraries" className={styles.tabPanel}>{libraries}</TabPanel>
    <TabPanel id="live" className={styles.tabPanel}>{live}</TabPanel>
  </Tabs>;
}
