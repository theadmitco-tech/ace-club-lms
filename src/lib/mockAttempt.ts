export const MOCK_SECTIONS = ['quant', 'verbal', 'data_insights'] as const;
export type MockSection = (typeof MOCK_SECTIONS)[number];

export const SECTION_LABELS: Record<MockSection, string> = {
  quant: 'Quantitative Reasoning',
  verbal: 'Verbal Reasoning',
  data_insights: 'Data Insights',
};

export const SECTION_ORDERS: MockSection[][] = [
  ['quant', 'verbal', 'data_insights'],
  ['quant', 'data_insights', 'verbal'],
  ['verbal', 'quant', 'data_insights'],
  ['verbal', 'data_insights', 'quant'],
  ['data_insights', 'quant', 'verbal'],
  ['data_insights', 'verbal', 'quant'],
];

export function isSectionOrder(value: unknown): value is MockSection[] {
  return Array.isArray(value)
    && value.length === 3
    && MOCK_SECTIONS.every((section) => value.filter((item) => item === section).length === 1);
}

export function remainingSeconds(deadline: string | null, now = Date.now()) {
  if (!deadline) return null;
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000));
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`;
}
