import { createHash } from 'node:crypto';
import type {
  MockQuestionType,
  MockResponseType,
  MockSection,
  RichContentV1,
} from './types';

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'list', 'table', 'equation', 'image', 'callout']);
const INLINE_TYPES = new Set(['text', 'emphasis', 'strong', 'subscript', 'superscript', 'equation', 'asset']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype', 'html', 'script', 'style', 'iframe']);
const EXECUTABLE_URL = /^(?:javascript|data|vbscript):/i;

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(',')}}`;
}

export function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function validateSafeJson(value: unknown, path = '$', depth = 0): string[] {
  if (depth > 20) return [`${path} exceeds the maximum JSON depth of 20`];
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return [];
  if (typeof value === 'string') {
    if (EXECUTABLE_URL.test(value.trim())) return [`${path} contains an executable URL`];
    return [];
  }
  if (Array.isArray(value)) {
    if (value.length > 5000) return [`${path} exceeds the maximum array length of 5000`];
    return value.flatMap((child, index) => validateSafeJson(child, `${path}[${index}]`, depth + 1));
  }
  if (typeof value !== 'object') return [`${path} contains an unsupported JSON value`];
  const errors: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) errors.push(`${path}.${key} is not allowed`);
    errors.push(...validateSafeJson(child, `${path}.${key}`, depth + 1));
  }
  return errors;
}

function validateInlineNodes(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) return [`${path} must be an array`];
  const errors: string[] = [];
  value.forEach((node, index) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      errors.push(`${path}[${index}] must be an object`);
      return;
    }
    const record = node as Record<string, unknown>;
    if (typeof record.type !== 'string' || !INLINE_TYPES.has(record.type)) {
      errors.push(`${path}[${index}].type is not an allowed inline type`);
    }
    if (record.type === 'text' && typeof record.text !== 'string') {
      errors.push(`${path}[${index}].text must be text`);
    }
    if (record.children !== undefined) errors.push(...validateInlineNodes(record.children, `${path}[${index}].children`));
  });
  return errors;
}

export function validateRichContent(value: unknown): { value: RichContentV1 | null; errors: string[] } {
  const errors = validateSafeJson(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { value: null, errors: [...errors, 'Rich content must be an object'] };
  }
  const record = value as Record<string, unknown>;
  if (record.version !== 1) errors.push('Rich content version must be 1');
  if (record.type !== undefined && record.type !== 'doc') errors.push('Rich content type must be doc when supplied');
  if (!Array.isArray(record.blocks) || record.blocks.length === 0) {
    errors.push('Rich content blocks must be a non-empty array');
  } else {
    record.blocks.forEach((block, index) => {
      if (!block || typeof block !== 'object' || Array.isArray(block)) {
        errors.push(`blocks[${index}] must be an object`);
        return;
      }
      const blockRecord = block as Record<string, unknown>;
      if (typeof blockRecord.type !== 'string' || !BLOCK_TYPES.has(blockRecord.type)) {
        errors.push(`blocks[${index}].type is not allowed`);
      }
      if (blockRecord.children !== undefined) {
        errors.push(...validateInlineNodes(blockRecord.children, `blocks[${index}].children`));
      }
      if (blockRecord.type === 'image' && typeof blockRecord.alt !== 'string') {
        errors.push(`blocks[${index}].alt is required for an image`);
      }
    });
  }
  return { value: errors.length ? null : value as RichContentV1, errors };
}

export function expectedSection(questionType: MockQuestionType): MockSection {
  if (questionType === 'PS' || questionType === 'DS') return 'quant';
  if (questionType === 'CR' || questionType === 'RC') return 'verbal';
  return 'data_insights';
}

export function responseTypeAllowed(questionType: MockQuestionType, responseType: MockResponseType): boolean {
  if (['PS', 'DS', 'CR', 'RC'].includes(questionType)) return responseType === 'single_choice';
  if (questionType === 'GI' || questionType === 'MSR') return responseType === 'single_choice' || responseType === 'dropdowns';
  if (questionType === 'TI') return responseType === 'binary_matrix';
  return responseType === 'two_part_matrix';
}

export function getImageMetadata(bytes: Buffer): { mimeType: string; width: number; height: number } | null {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mimeType: 'image/png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length >= 12 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { mimeType: 'image/jpeg', height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
      }
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      const length = bytes.readUInt16BE(offset + 2);
      if (length < 2) return null;
      offset += 2 + length;
    }
  }
  if (bytes.length >= 30 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    const kind = bytes.toString('ascii', 12, 16);
    if (kind === 'VP8X') {
      return {
        mimeType: 'image/webp',
        width: 1 + bytes.readUIntLE(24, 3),
        height: 1 + bytes.readUIntLE(27, 3),
      };
    }
    if (kind === 'VP8 ' && bytes.length >= 30) {
      return { mimeType: 'image/webp', width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    }
    if (kind === 'VP8L' && bytes.length >= 25) {
      const bits = bytes.readUInt32LE(21);
      return { mimeType: 'image/webp', width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
    }
  }
  return null;
}
