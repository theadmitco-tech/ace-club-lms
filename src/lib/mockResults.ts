import type { MockSection } from './mockAttempt';

export type AnswerMap = Record<string, string>;
export type MockResultOutcome = 'correct' | 'incorrect' | 'unanswered';

export type MockResultItemInput = {
  id: string;
  section: MockSection;
  timeSpentMs: number;
  selectedAnswer: unknown;
  correctAnswer: unknown;
  topic: string;
  subtopic: string | null;
};

export type MockDiagnostic = {
  label: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracy: number;
  timeSpentMs: number;
};

export function answerMap(value: unknown): AnswerMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0));
}

export function resultOutcome(selectedValue: unknown, correctValue: unknown): MockResultOutcome {
  const selected = answerMap(selectedValue);
  const correct = answerMap(correctValue);
  if (Object.keys(selected).length === 0) return 'unanswered';
  const correctEntries = Object.entries(correct);
  if (correctEntries.length > 0 && Object.keys(selected).length === correctEntries.length
    && correctEntries.every(([slot, option]) => selected[slot] === option)) return 'correct';
  return 'incorrect';
}

function diagnostic(label: string, items: MockResultItemInput[]): MockDiagnostic {
  const outcomes = items.map((item) => resultOutcome(item.selectedAnswer, item.correctAnswer));
  const correct = outcomes.filter((outcome) => outcome === 'correct').length;
  const incorrect = outcomes.filter((outcome) => outcome === 'incorrect').length;
  const unanswered = outcomes.filter((outcome) => outcome === 'unanswered').length;
  return {
    label,
    total: items.length,
    correct,
    incorrect,
    unanswered,
    accuracy: items.length ? Math.round((correct / items.length) * 100) : 0,
    timeSpentMs: items.reduce((sum, item) => sum + Math.max(0, item.timeSpentMs), 0),
  };
}

export function groupDiagnostics(items: MockResultItemInput[], labelFor: (item: MockResultItemInput) => string) {
  const groups = new Map<string, MockResultItemInput[]>();
  for (const item of items) {
    const label = labelFor(item);
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  return [...groups.entries()].map(([label, group]) => diagnostic(label, group));
}

export function buildMockResultSummary(items: MockResultItemInput[]) {
  return {
    overall: diagnostic('Overall', items),
    sections: groupDiagnostics(items, (item) => item.section),
    topics: groupDiagnostics(items, (item) => item.topic || 'Uncategorized'),
    subtopics: groupDiagnostics(items, (item) => item.subtopic || 'No subtopic'),
  };
}

export function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0 ? `${hours}h ${minutes}m ${remainder}s` : `${minutes}m ${remainder}s`;
}
