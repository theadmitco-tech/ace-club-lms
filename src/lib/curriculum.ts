import { Session } from './types';

export interface CurriculumSession {
  week: number;
  day: 'Saturday' | 'Sunday';
  title: string;
  category: 'Orientation' | 'Quants' | 'Verbal' | 'Data Insights';
  description?: string;
}

export const DEFAULT_CURRICULUM: CurriculumSession[] = [
  // Week 1
  { week: 1, day: 'Saturday', category: 'Orientation', title: 'Orientation' },
  { week: 1, day: 'Sunday', category: 'Quants', title: 'Fractions + Percentages + Ratios & Mixtures + SI/CI' },
  
  // Week 2
  { week: 2, day: 'Saturday', category: 'Verbal', title: 'RC + CR (Strengthen the Conclusion)' },
  { week: 2, day: 'Sunday', category: 'Quants', title: 'Pipes & Cisterns + Work & Time + Speed, Time, Distance' },
  
  // Week 3
  { week: 3, day: 'Saturday', category: 'Verbal', title: 'RC + CR (Find the Assumption)' },
  { week: 3, day: 'Sunday', category: 'Quants', title: 'Probability + Permutation & Combination' },
  
  // Week 4
  { week: 4, day: 'Saturday', category: 'Verbal', title: 'RC + CR (Evaluate the Conclusion + Boldface Qs)' },
  { week: 4, day: 'Sunday', category: 'Quants', title: 'Polynomials + Functions + Equations + Inequalities' },
  
  // Week 5
  { week: 5, day: 'Saturday', category: 'Verbal', title: 'RC + CR (Paradox Qs + Draw Inferences)' },
  { week: 5, day: 'Sunday', category: 'Quants', title: 'Number Properties + Multiples & Factors + Power & Roots + Exponents' },
  
  // Week 6
  { week: 6, day: 'Saturday', category: 'Verbal', title: 'RC + CR (Weaken Argument + Complete the Argument)' },
  { week: 6, day: 'Sunday', category: 'Quants', title: 'Averages + Descriptive Stats + Set Theory + Progressions' },
  
  // Week 7
  { week: 7, day: 'Saturday', category: 'Data Insights', title: 'Data Sufficiency' },
  { week: 7, day: 'Sunday', category: 'Data Insights', title: 'Graphical Interpretation + Table Analysis' },
  
  // Week 8
  { week: 8, day: 'Saturday', category: 'Data Insights', title: 'Multi-Source Reasoning' },
  { week: 8, day: 'Sunday', category: 'Data Insights', title: 'Two-Part Analysis' },
];

/**
 * Generates actual session dates based on a start Saturday.
 * Allows for skipping specific weeks.
 */
export function generateSchedule(startDate: Date, skippedWeeks: number[] = []): (CurriculumSession & { date: string })[] {
  const schedule: (CurriculumSession & { date: string })[] = [];
  let currentWeekOffset = 0;

  for (let w = 1; w <= 8; w++) {
    // Check if this week should be skipped
    while (skippedWeeks.includes(w + currentWeekOffset)) {
      currentWeekOffset++;
    }

    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (w - 1 + currentWeekOffset) * 7);

    // Saturday Session
    const sat = DEFAULT_CURRICULUM.find(s => s.week === w && s.day === 'Saturday');
    if (sat) {
      const satDate = new Date(weekStart);
      schedule.push({ ...sat, date: satDate.toISOString() });
    }

    // Sunday Session
    const sun = DEFAULT_CURRICULUM.find(s => s.week === w && s.day === 'Sunday');
    if (sun) {
      const sunDate = new Date(weekStart);
      sunDate.setDate(weekStart.getDate() + 1);
      schedule.push({ ...sun, date: sunDate.toISOString() });
    }
  }

  return schedule;
}
