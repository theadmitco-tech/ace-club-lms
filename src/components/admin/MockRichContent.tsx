import type { ReactNode } from 'react';

function inlineText(value: unknown): ReactNode {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map((item, index) => <span key={index}>{inlineText(item)}</span>);
  if (!value || typeof value !== 'object') return null;
  const node = value as Record<string, unknown>;
  const children = node.text ?? node.children ?? node.content ?? null;
  if (node.type === 'strong') return <strong>{inlineText(children)}</strong>;
  if (node.type === 'emphasis') return <em>{inlineText(children)}</em>;
  if (node.type === 'subscript') return <sub>{inlineText(children)}</sub>;
  if (node.type === 'superscript') return <sup>{inlineText(children)}</sup>;
  if (node.type === 'equation') return <code>{inlineText(node.value ?? children)}</code>;
  if (node.type === 'asset') return <span className="mock-asset-placeholder">Protected image</span>;
  return inlineText(children);
}

function renderBlock(block: unknown, index: number) {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return null;
  const node = block as Record<string, unknown>;
  const children = inlineText(node.children ?? node.content ?? node.text);
  if (node.type === 'heading') return <h4 key={index}>{children}</h4>;
  if (node.type === 'equation') return <div key={index}><code>{inlineText(node.value ?? children)}</code></div>;
  if (node.type === 'callout') return <aside key={index} className="mock-content-callout">{children}</aside>;
  if (node.type === 'image') return <figure key={index} className="mock-asset-placeholder"><div>Protected image</div><figcaption>{typeof node.alt === 'string' ? node.alt : 'Alternative text missing'}</figcaption></figure>;
  if (node.type === 'list' && Array.isArray(node.items)) return <ul key={index}>{node.items.map((item, itemIndex) => <li key={itemIndex}>{inlineText(item)}</li>)}</ul>;
  if (node.type === 'table' && Array.isArray(node.rows)) return <div key={index} className="admin-table-container"><table className="admin-table"><tbody>{node.rows.map((row, rowIndex) => <tr key={rowIndex}>{Array.isArray(row) ? row.map((cell, cellIndex) => <td key={cellIndex}>{inlineText(cell)}</td>) : <td>{inlineText(row)}</td>}</tr>)}</tbody></table></div>;
  return <p key={index}>{children}</p>;
}

export function MockRichContent({ value }: { value: unknown }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return <p>Preview unavailable.</p>;
  const blocks = (value as Record<string, unknown>).blocks;
  if (!Array.isArray(blocks)) return <pre className="mock-json-preview">{JSON.stringify(value, null, 2)}</pre>;
  return <div className="mock-rich-content">{blocks.map(renderBlock)}</div>;
}
