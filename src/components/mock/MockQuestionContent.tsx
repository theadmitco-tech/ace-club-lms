'use client';

import Image from 'next/image';
import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export type MockMediaAsset = {
  id: string;
  source_external_id: string;
  alt_text: string;
  url: string;
  width?: number;
  height?: number;
};

export type MockRenderOption = {
  response_slot_id: string;
  option_id: string;
  display_order: number;
  content: unknown;
};

type InteractionRow = { id: string; label: string };
type InteractionColumn = { id: string; label: string };

function records(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)) : [];
}

function labelledEntries(value: unknown): Array<{ id: string; label: string }> {
  return records(value).flatMap((entry) => typeof entry.id === 'string'
    ? [{ id: entry.id, label: typeof entry.label === 'string' ? entry.label : entry.id }]
    : []);
}

export function mockContentText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(mockContentText).join(' ').replace(/\s+/g, ' ').trim();
  if (!value || typeof value !== 'object') return '';
  const node = value as Record<string, unknown>;
  if (typeof node.text === 'string') return node.text;
  if (typeof node.value === 'string') return node.value;
  return mockContentText(node.children ?? node.blocks ?? node.content ?? '');
}

function InlineText({ value, slotControl }: { value: unknown; slotControl?: (slotId: string) => ReactNode }) {
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value);
    const parts = text.split(/(\{\{slot:[A-Za-z0-9_-]+\}\})/g);
    return <>{parts.map((part, index) => {
      const match = part.match(/^\{\{slot:([A-Za-z0-9_-]+)\}\}$/);
      return match && slotControl ? <span className="mock-inline-slot" key={`${match[1]}-${index}`}>{slotControl(match[1])}</span> : part;
    })}</>;
  }
  if (Array.isArray(value)) return <>{value.map((entry, index) => <InlineText key={index} slotControl={slotControl} value={entry} />)}</>;
  if (!value || typeof value !== 'object') return null;
  const node = value as Record<string, unknown>;
  if (typeof node.text === 'string') return <InlineText slotControl={slotControl} value={node.text} />;
  const children = <InlineText slotControl={slotControl} value={node.children ?? node.content ?? null} />;
  if (node.type === 'strong') return <strong>{children}</strong>;
  if (node.type === 'emphasis') return <em>{children}</em>;
  if (node.type === 'subscript') return <sub>{children}</sub>;
  if (node.type === 'superscript') return <sup>{children}</sup>;
  if (node.type === 'equation') return <span className="mock-equation">{mockContentText(node.value ?? node.content)}</span>;
  return children;
}

export function MockRichContent({ value, media = [], slotControl, eagerMedia = false }: { value: unknown; media?: MockMediaAsset[]; slotControl?: (slotId: string) => ReactNode; eagerMedia?: boolean }) {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number' || Array.isArray(value)) return <InlineText slotControl={slotControl} value={value} />;
  if (typeof value !== 'object') return null;
  const node = value as Record<string, unknown>;
  const assetId = typeof node.asset_id === 'string' ? node.asset_id : typeof node.assetId === 'string' ? node.assetId : null;
  if (assetId) {
    const asset = media.find((entry) => entry.id === assetId || entry.source_external_id === assetId);
    return asset ? <figure className="mock-graphic"><Image alt={asset.alt_text} className="mock-content-image" fetchPriority={eagerMedia ? 'high' : undefined} height={asset.height ?? 450} loading={eagerMedia ? 'eager' : 'lazy'} src={asset.url} unoptimized width={asset.width ?? 1200} /><figcaption className="sr-only">{asset.alt_text}</figcaption></figure> : <p role="status">Image unavailable in this preview.</p>;
  }
  const blocks = Array.isArray(node.blocks) ? node.blocks : null;
  if (blocks) return <div className="mock-rich-content">{blocks.map((block, index) => <MockContentBlock eagerMedia={eagerMedia} key={index} media={media} slotControl={slotControl} value={block} />)}</div>;
  return <InlineText slotControl={slotControl} value={node} />;
}

function MockContentBlock({ value, media, slotControl, eagerMedia }: { value: unknown; media: MockMediaAsset[]; slotControl?: (slotId: string) => ReactNode; eagerMedia: boolean }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const node = value as Record<string, unknown>;
  const children = <InlineText slotControl={slotControl} value={node.children ?? node.content ?? node.text} />;
  if (node.type === 'heading') return <h3>{children}</h3>;
  if (node.type === 'callout') return <aside className="mock-content-callout">{children}</aside>;
  if (node.type === 'image' || typeof node.asset_id === 'string') return <MockRichContent eagerMedia={eagerMedia} media={media} value={node} />;
  if (node.type === 'list') {
    const items = Array.isArray(node.items) ? node.items : Array.isArray(node.children) ? node.children : [];
    return <ul>{items.map((item, index) => <li key={index}><InlineText slotControl={slotControl} value={item} /></li>)}</ul>;
  }
  if (node.type === 'table' && Array.isArray(node.rows)) return <div className="mock-table-wrap"><table><tbody>{node.rows.map((row, rowIndex) => <tr key={rowIndex}>{(Array.isArray(row) ? row : [row]).map((cell, cellIndex) => <td key={cellIndex}><InlineText slotControl={slotControl} value={cell} /></td>)}</tr>)}</tbody></table></div>;
  if (node.type === 'equation') return <div className="mock-equation">{mockContentText(node.value ?? node.content)}</div>;
  return <p>{children}</p>;
}

function SortableTable({ value }: { value: unknown }) {
  const node = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const columns = records(node.columns).flatMap((column) => typeof column.id === 'string' ? [{ id: column.id, label: typeof column.label === 'string' ? column.label : column.id, type: column.type, sortable: column.sortable !== false }] : []);
  const rows = records(node.rows);
  const [sort, setSort] = useState<{ id: string; direction: 'ascending'|'descending' } | null>(null);
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((entry) => entry.id === sort.id);
    return [...rows].sort((left, right) => {
      const leftCells = left.cells && typeof left.cells === 'object' ? left.cells as Record<string, unknown> : left;
      const rightCells = right.cells && typeof right.cells === 'object' ? right.cells as Record<string, unknown> : right;
      const a = leftCells[sort.id]; const b = rightCells[sort.id];
      const result = column?.type === 'number' ? Number(a) - Number(b) : String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true });
      return sort.direction === 'ascending' ? result : -result;
    });
  }, [columns, rows, sort]);
  if (!columns.length) return <MockRichContent value={value} />;
  return <div className="mock-table-wrap"><table className="mock-sortable-table"><caption className="sr-only">Sortable data table</caption><thead><tr>{columns.map((column) => <th aria-sort={sort?.id === column.id ? sort.direction : 'none'} key={column.id} scope="col">{column.sortable ? <button onClick={() => setSort((current) => ({ id: column.id, direction: current?.id === column.id && current.direction === 'ascending' ? 'descending' : 'ascending' }))} type="button">{column.label}<span aria-hidden="true">{sort?.id === column.id ? sort.direction === 'ascending' ? ' ▲' : ' ▼' : ' ↕'}</span></button> : column.label}</th>)}</tr></thead><tbody>{sortedRows.map((row, rowIndex) => { const cells = row.cells && typeof row.cells === 'object' ? row.cells as Record<string, unknown> : row; return <tr key={typeof row.id === 'string' ? row.id : rowIndex}>{columns.map((column) => <td key={column.id}>{String(cells[column.id] ?? '')}</td>)}</tr>; })}</tbody></table></div>;
}

function TabbedContent({ value, firstTabId }: { value: unknown; firstTabId?: string }) {
  const node = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const tabs = records(node.tabs).flatMap((tab) => typeof tab.id === 'string' ? [{ id: tab.id, label: typeof tab.label === 'string' ? tab.label : tab.id, content: tab.content }] : []);
  const initialId = tabs.some((tab) => tab.id === firstTabId) ? firstTabId! : tabs[0]?.id ?? '';
  const [activeId, setActiveId] = useState(initialId);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const baseId = useId().replace(/:/g, '');
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault(); setActiveId(tabs[next].id); refs.current[next]?.focus();
  }
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  if (!active) return <MockRichContent value={value} />;
  return <div className="mock-tabs"><div aria-label="Source documents" className="mock-tab-list" role="tablist">{tabs.map((tab, index) => <button aria-controls={`${baseId}-panel-${tab.id}`} aria-selected={tab.id === active.id} id={`${baseId}-tab-${tab.id}`} key={tab.id} onClick={() => setActiveId(tab.id)} onKeyDown={(event) => onKeyDown(event, index)} ref={(button) => { refs.current[index] = button; }} role="tab" tabIndex={tab.id === active.id ? 0 : -1} type="button">{tab.label}</button>)}</div><section aria-labelledby={`${baseId}-tab-${active.id}`} className="mock-tab-panel" id={`${baseId}-panel-${active.id}`} role="tabpanel"><MockRichContent value={active.content} /></section></div>;
}

export function MockStimulus({ kind, title, content, config, media = [], showCaption = true, eagerMedia = false }: { kind?: string; title?: string | null; content: unknown; config?: unknown; media?: MockMediaAsset[]; showCaption?: boolean; eagerMedia?: boolean }) {
  const configNode = config && typeof config === 'object' && !Array.isArray(config) ? config as Record<string, unknown> : {};
  return <aside className={`mock-stimulus mock-stimulus-${kind ?? 'rich_text'}`}>{title && <h2>{title}</h2>}{kind === 'sortable_table' ? <SortableTable value={content} /> : kind === 'tabbed_content' ? <TabbedContent firstTabId={typeof configNode.first_tab_id === 'string' ? configNode.first_tab_id : undefined} value={content} /> : <MockRichContent eagerMedia={eagerMedia} media={media} value={content} />}{showCaption && typeof configNode.caption === 'string' && <p className="mock-figure-caption">{configNode.caption}</p>}</aside>;
}

export function MockResponseControl({ responseType, interaction, options, response, disabled = false, onChange }: { responseType?: string; interaction?: unknown; options: MockRenderOption[]; response: Record<string, string>; disabled?: boolean; onChange: (next: Record<string, string>) => void }) {
  const interactionNode = interaction && typeof interaction === 'object' && !Array.isArray(interaction) ? interaction as Record<string, unknown> : {};
  const setSlot = (slotId: string, optionId: string) => onChange({ ...response, [slotId]: optionId });
  const dropdown = (slotId: string) => <label className="mock-dropdown"><span className="sr-only">Select an answer for {slotId}</span><select aria-label={`Select an answer for ${slotId}`} disabled={disabled} onChange={(event) => setSlot(slotId, event.target.value)} value={response[slotId] ?? ''}><option value="">Select…</option>{options.filter((option) => option.response_slot_id === slotId).sort((a,b) => a.display_order-b.display_order).map((option) => <option key={option.option_id} value={option.option_id}>{mockContentText(option.content)}</option>)}</select></label>;
  if (responseType === 'dropdowns') {
    const slots = labelledEntries(interactionNode.slots);
    return <div className="mock-dropdown-question"><MockRichContent slotControl={dropdown} value={interactionNode.stem} />{slots.map((slot) => <div className="mock-dropdown-fallback" key={slot.id}><span>{slot.label}</span>{dropdown(slot.id)}</div>)}</div>;
  }
  if (responseType === 'binary_matrix') {
    const rows: InteractionRow[] = labelledEntries(interactionNode.rows);
    const columns: InteractionColumn[] = labelledEntries(interactionNode.columns);
    return <div className="mock-table-wrap"><table className="mock-response-matrix"><caption>Choose one answer for each statement.</caption><thead><tr><th scope="col">Statement</th>{columns.map((column) => <th key={column.id} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><th scope="row">{row.label}</th>{columns.map((column) => <td key={column.id}><input aria-label={`${row.label}: ${column.label}`} checked={response[row.id] === column.id} disabled={disabled} name={row.id} onChange={() => setSlot(row.id, column.id)} type="radio" /></td>)}</tr>)}</tbody></table></div>;
  }
  if (responseType === 'two_part_matrix') {
    const columns: InteractionColumn[] = labelledEntries(interactionNode.columns);
    const candidateIds = [...new Set(options.map((option) => option.option_id))];
    return <div className="mock-table-wrap"><table className="mock-response-matrix mock-two-part"><caption>Choose one answer in each column.</caption><thead><tr><th scope="col">Answer</th>{columns.map((column) => <th key={column.id} scope="col">{column.label}</th>)}</tr></thead><tbody>{candidateIds.map((optionId) => { const representative = options.find((option) => option.option_id === optionId); const label = mockContentText(representative?.content); return <tr key={optionId}><th scope="row">{label}</th>{columns.map((column) => <td key={column.id}><input aria-label={`${column.label}: ${label}`} checked={response[column.id] === optionId} disabled={disabled} name={column.id} onChange={() => setSlot(column.id, optionId)} type="radio" /></td>)}</tr>; })}</tbody></table></div>;
  }
  return <fieldset className="mock-single-choice"><legend className="sr-only">Choose one answer</legend>{[...options].sort((a,b) => a.display_order-b.display_order).map((option) => { const selected = response[option.response_slot_id] === option.option_id; return <label className={selected ? 'selected' : ''} key={`${option.response_slot_id}-${option.option_id}`}><input checked={selected} disabled={disabled} name={option.response_slot_id} onChange={() => setSlot(option.response_slot_id, option.option_id)} type="radio"/><span><MockRichContent value={option.content}/></span></label>; })}</fieldset>;
}

export function MockQuestionBody({ stem, responseType, interaction, options, response, disabled, media, onChange }: { stem: unknown; responseType?: string; interaction?: unknown; options: MockRenderOption[]; response: Record<string,string>; disabled?: boolean; media?: MockMediaAsset[]; onChange: (next: Record<string,string>) => void }) {
  const hasInlineSlots = /\{\{slot:[A-Za-z0-9_-]+\}\}/.test(JSON.stringify(stem));
  const setSlot = (slotId: string, optionId: string) => onChange({ ...response, [slotId]: optionId });
  const dropdown = (slotId: string) => <label className="mock-dropdown"><span className="sr-only">Select an answer for {slotId}</span><select aria-label={`Select an answer for ${slotId}`} disabled={disabled} onChange={(event) => setSlot(slotId, event.target.value)} value={response[slotId] ?? ''}><option value="">Select…</option>{options.filter((option) => option.response_slot_id === slotId).sort((a,b) => a.display_order-b.display_order).map((option) => <option key={option.option_id} value={option.option_id}>{mockContentText(option.content)}</option>)}</select></label>;
  return <><article className="mock-stem"><MockRichContent media={media} slotControl={responseType === 'dropdowns' ? dropdown : undefined} value={stem}/></article>{responseType === 'dropdowns' && hasInlineSlots ? null : <div className="mock-options"><MockResponseControl disabled={disabled} interaction={interaction} onChange={onChange} options={options} response={response} responseType={responseType}/></div>}</>;
}
