import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/v2ReadingEmbed.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, URL, URLSearchParams });
const embed = value => { const result = exports.v2ReadingEmbed(value); return result && { ...result }; };

test('readings the site serves open in place, as documents or video', () => {
  assert.deepEqual(embed('/api/v2/content/file?batchId=b&sessionKey=s&itemKey=i&format=pdf'), { kind: 'document', src: '/api/v2/content/file?batchId=b&sessionKey=s&itemKey=i&format=pdf', external: false });
  assert.equal(embed('/api/v2/content/file?batchId=b&format=mp4').kind, 'video');
  assert.equal(embed('/api/v2/materials/file?batchId=b&sessionKey=s&itemKey=i').kind, 'document');
});

test('Google, Drive and Canva links use their embeddable views', () => {
  assert.equal(embed('https://docs.google.com/document/d/AbC_1-2/edit?usp=sharing').src, 'https://docs.google.com/document/d/AbC_1-2/preview');
  assert.equal(embed('https://docs.google.com/presentation/d/Xy9/edit#slide=id.p').src, 'https://docs.google.com/presentation/d/Xy9/preview');
  assert.equal(embed('https://docs.google.com/spreadsheets/d/Q1/edit').src, 'https://docs.google.com/spreadsheets/d/Q1/preview');
  assert.equal(embed('https://drive.google.com/file/d/F1le_Id/view?usp=drive_link').src, 'https://drive.google.com/file/d/F1le_Id/preview');
  assert.equal(embed('https://drive.google.com/open?id=Op3n').src, 'https://drive.google.com/file/d/Op3n/preview');
  assert.equal(embed('https://www.canva.com/design/DAF1/abc/view').src, 'https://www.canva.com/design/DAF1/abc/view?embed');
});

test('other https links open in place; unsafe or broken links do not', () => {
  assert.deepEqual(embed('https://example.test/reading.pdf'), { kind: 'document', src: 'https://example.test/reading.pdf', external: true });
  for (const value of [null, 'http://insecure.test/a', 'javascript:alert(1)', 'not a url']) assert.equal(embed(value), null);
});
