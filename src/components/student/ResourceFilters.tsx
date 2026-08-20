'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

type FilterOption = {
  label: string;
  value: string;
};

export function ResourceFilters({
  sections,
  topics,
  categories,
  selectedSection,
  selectedTopic,
  selectedCategory,
}: {
  sections: FilterOption[];
  topics: FilterOption[];
  categories: FilterOption[];
  selectedSection?: string;
  selectedTopic?: string;
  selectedCategory?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(filters: { section?: string; topic?: string; category?: string }) {
    const query = new URLSearchParams();
    if (filters.section) query.set('section', filters.section);
    if (filters.topic) query.set('topic', filters.topic);
    if (filters.category) query.set('category', filters.category);
    const value = query.toString();
    startTransition(() => router.replace(value ? `${pathname}?${value}` : pathname, { scroll: false }));
  }

  return (
    <section className="resource-filter-panel" aria-label="Resource filters" aria-busy={isPending}>
      <label className="resource-filter-group">
        <strong>Sections</strong>
        <select
          disabled={isPending}
          onChange={(event) => navigate({ section: event.target.value || undefined })}
          value={selectedSection ?? ''}
        >
          <option value="">All sections</option>
          {sections.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      <label className="resource-filter-group">
        <strong>Topic</strong>
        <select
          disabled={isPending}
          onChange={(event) => navigate({
            section: selectedSection,
            topic: event.target.value || undefined,
          })}
          value={selectedTopic ?? ''}
        >
          <option value="">All topics</option>
          {topics.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      <label className="resource-filter-group">
        <strong>Category</strong>
        <select
          disabled={isPending}
          onChange={(event) => navigate({
            section: selectedSection,
            topic: selectedTopic,
            category: event.target.value || undefined,
          })}
          value={selectedCategory ?? ''}
        >
          <option value="">All categories</option>
          {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    </section>
  );
}
