export const MOCK_SECTIONS = ['quant', 'verbal', 'data_insights'] as const;
export type MockSection = (typeof MOCK_SECTIONS)[number];
export const MOCK_CATEGORIES = ['qa', 'rc', 'cr', 'va', 'di'] as const;
export type MockCategory = (typeof MOCK_CATEGORIES)[number];
export const CATEGORY_LABELS: Record<MockCategory, string> = { qa: 'Quantitative Ability', rc: 'Reading Comprehension', cr: 'Critical Reasoning', va: 'Verbal Ability', di: 'Data Insights' };
export const CATEGORY_PARENT: Record<MockCategory, MockSection> = { qa: 'quant', rc: 'verbal', cr: 'verbal', va: 'verbal', di: 'data_insights' };
export function categoryForQuestionType(questionType: string): MockCategory {
  if (questionType === 'RC') return 'rc';
  if (questionType === 'CR') return 'cr';
  if (questionType === 'PS' || questionType === 'DS') return 'qa';
  return 'di';
}

export const SECTION_LABELS: Record<MockSection, string> = {
  quant: 'Quantitative Reasoning',
  verbal: 'Verbal Reasoning',
  data_insights: 'Data Insights',
};

export const FULL_SECTION_QUESTION_COUNTS: Record<MockSection, number> = { quant: 21, verbal: 23, data_insights: 20 };
export const FULL_SECTION_TIME_SECONDS = 45 * 60;

export function sectionTimeSeconds(section: MockSection, questionCount: number) {
  return Math.max(60, Math.round(FULL_SECTION_TIME_SECONDS * questionCount / FULL_SECTION_QUESTION_COUNTS[section]));
}

export const SECTION_ORDERS: MockSection[][] = [
  ['quant', 'verbal', 'data_insights'],
  ['quant', 'data_insights', 'verbal'],
  ['verbal', 'quant', 'data_insights'],
  ['verbal', 'data_insights', 'quant'],
  ['data_insights', 'quant', 'verbal'],
  ['data_insights', 'verbal', 'quant'],
];

export type MockUnit = MockSection | MockCategory;
export function isSectionOrder(value: unknown): value is MockUnit[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => [...MOCK_SECTIONS, ...MOCK_CATEGORIES].includes(item as never))
    && new Set(value).size === value.length;
}

export function sectionOrders<T extends string>(sections: T[]): T[][] {
  return sections.length <= 1 ? [sections] : sections.flatMap((section, index) => sectionOrders([...sections.slice(0, index), ...sections.slice(index + 1)]).map((rest) => [section, ...rest]));
}

export function mockUnitLabel(unit: MockUnit) { return unit in CATEGORY_LABELS ? CATEGORY_LABELS[unit as MockCategory] : SECTION_LABELS[unit as MockSection]; }

export function remainingSeconds(deadline: string | null, now = Date.now()) {
  if (!deadline) return null;
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000));
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`;
}
