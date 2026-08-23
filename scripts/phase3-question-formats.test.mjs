import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import parserModule from '../src/lib/server/mockQuestionPackage.ts';
import rendererModule from '../src/components/mock/MockQuestionContent.tsx';

const { parseMockQuestionPackage } = parserModule;
const { MockQuestionBody, MockResponseControl, MockStimulus } = rendererModule;
const defaultFixture = join(homedir(), 'Downloads', 'ACE-QUESTION-PACKAGE-UNNATI-20260822-d1737807-bb2d-40f3-ba5a-4b45324ee939.zip');
const fixturePath = process.env.ACE_PHASE3_PACKAGE || defaultFixture;

function context() {
  return {
    authorizedNamespaces: new Set(['UNNATI']),
    taxonomy: [],
    existing: { questions: new Map(), stimuli: new Map(), assets: new Map(), questionFingerprints: new Set(), stimulusFingerprints: new Set() },
    completedPackageFingerprints: new Set(),
    now: new Date('2026-08-23T00:00:00Z'),
  };
}

test('accepted Phase 3 V1.2 package preserves all format declarations and shared order', async (t) => {
  try { await access(fixturePath); } catch { t.skip(`Fixture not available at ${fixturePath}`); return; }
  const result = await parseMockQuestionPackage(await readFile(fixturePath), fixturePath, context());
  const preview = result.preview;
  assert.equal(preview.valid, true, JSON.stringify(preview.issues, null, 2));
  assert.equal(preview.package.schemaVersion, 'ace-gmat-question-package/1.0');
  assert.deepEqual(preview.byQuestionType, { PS: 1, DS: 1, CR: 1, RC: 4, GI: 1, TI: 1, MSR: 1, TPA: 1 });
  assert.equal(preview.counts.questions, 11);

  const byType = new Map(preview.package.questions.map((question) => [question.questionType, question]));
  for (const type of ['PS', 'DS', 'CR']) assert.deepEqual([...new Set(byType.get(type).options.map((option) => option.slotId))], ['answer']);
  assert.deepEqual([...new Set(byType.get('GI').options.map((option) => option.slotId))], ['blank1', 'blank2']);
  assert.deepEqual([...new Set(byType.get('TI').options.map((option) => option.slotId))], ['r1', 'r2', 'r3']);
  assert.deepEqual([...new Set(byType.get('MSR').options.map((option) => option.slotId))], ['r1', 'r2', 'r3']);
  assert.deepEqual([...new Set(byType.get('TPA').options.map((option) => option.slotId))], ['purse_i', 'purse_ii']);

  const rc = preview.package.questions.filter((question) => question.questionType === 'RC');
  assert.equal(new Set(rc.map((question) => question.sourceStimulusId)).size, 1);
  assert.deepEqual(rc.map((question) => question.stimulusGroupOrder), [1, 2, 3, 4]);
  const stimulusTypes = new Set(preview.package.stimuli.map((stimulus) => stimulus.stimulusType));
  for (const type of ['passage', 'graphic', 'sortable_table', 'tabbed_content']) assert.equal(stimulusTypes.has(type), true);
  assert.equal(preview.package.assets.length, 1);
  assert.ok(preview.package.assets[0].altText.length > 40);
  assert.equal(result.assetBytes.get(preview.package.assets[0].sourceAssetId)?.length, preview.package.assets[0].byteSize);
});

test('Student renderer uses protected media, slot-keyed responses and accessible native controls', async () => {
  const [player, renderer, styles, attemptMigration, taxonomyGrant, builderGrant, mediaReuse] = await Promise.all([
    readFile(new URL('../src/app/mocks/[attemptId]/MockPlayer.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/mock/MockQuestionContent.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/mocks/mocks.css', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20260822213000_add_mock_attempt_player.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20260823100000_allow_mock_import_taxonomy_labels.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20260823101000_allow_mock_builder_server_mutations.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20260823102000_allow_reused_mock_media_bytes.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(player, /response:next/);
  assert.match(player, /\/api\/student\/mock-attempts\/\$\{attemptId\}\/media\/\$\{asset\.id\}/);
  assert.match(renderer, /role="tablist"/);
  assert.match(renderer, /ArrowRight/);
  assert.match(renderer, /aria-sort=/);
  assert.match(renderer, /type="radio"/);
  assert.match(renderer, /<select/);
  assert.match(renderer, /alt=\{asset\.alt_text\}/);
  assert.match(styles, /\.mock-content-image\{[^}]*max-width:100%;height:auto/);
  assert.match(styles, /:focus-visible\{outline:3px solid/);
  assert.match(styles, /\.mock-player \.sr-only\{[^}]*clip:rect/);
  assert.match(styles, /@media \(max-width:1050px\)\{\.mock-passage-workspace\{grid-template-columns:1fr/);
  assert.match(attemptMigration, /create table private\.mock_attempt_keys/);
  assert.match(attemptMigration, /revoke all on private\.mock_attempt_keys from anon, authenticated/);
  assert.doesNotMatch(attemptMigration, /grant select on private\.mock_attempt_keys/);
  assert.match(taxonomyGrant, /grant insert on table public\.mock_topics to service_role/);
  assert.match(builderGrant, /grant insert, update on table public\.mock_assessments to service_role/);
  assert.match(builderGrant, /grant insert on table public\.mock_assessment_assignments to service_role/);
  assert.match(mediaReuse, /drop constraint mock_media_namespace_id_sha256_key/);
  assert.match(mediaReuse, /create index mock_media_namespace_sha256_idx/);
});

test('accepted fixture renders native controls for GI, TI, MSR and TPA', async (t) => {
  try { await access(fixturePath); } catch { t.skip(`Fixture not available at ${fixturePath}`); return; }
  const { preview } = await parseMockQuestionPackage(await readFile(fixturePath), fixturePath, context());
  const byType = new Map(preview.package.questions.map((question) => [question.questionType, question]));
  const options = (question) => question.options.map((option) => ({ response_slot_id: option.slotId, option_id: option.optionId, display_order: option.displayOrder, content: option.content }));
  const stimulus = (question) => preview.package.stimuli.find((entry) => entry.sourceStimulusId === question.sourceStimulusId);
  const media = preview.package.assets.map((asset) => ({ id: asset.sourceAssetId, source_external_id: asset.sourceAssetId, alt_text: asset.altText, url: `https://example.invalid/${asset.sourceAssetId}.png`, width: asset.widthPx, height: asset.heightPx }));

  const gi = byType.get('GI');
  const giStimulus = stimulus(gi);
  const giHtml = renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement(MockStimulus, { kind: giStimulus.stimulusType, content: giStimulus.content, config: giStimulus.config, media }),
    React.createElement(MockQuestionBody, { stem: gi.stem, responseType: gi.responseType, interaction: gi.interaction, options: options(gi), response: {}, onChange() {} }),
  ));
  assert.equal((giHtml.match(/<select/g) ?? []).length, 2);
  assert.match(giHtml, new RegExp(`alt="${preview.package.assets[0].altText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));

  const ti = byType.get('TI'); const tiStimulus = stimulus(ti);
  const tiHtml = renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement(MockStimulus, { kind: tiStimulus.stimulusType, content: tiStimulus.content, config: tiStimulus.config }),
    React.createElement(MockResponseControl, { responseType: ti.responseType, interaction: ti.interaction, options: options(ti), response: {}, onChange() {} }),
  ));
  assert.match(tiHtml, /aria-sort="none"/);
  assert.equal((tiHtml.match(/type="radio"/g) ?? []).length, 6);

  const msr = byType.get('MSR'); const msrStimulus = stimulus(msr);
  const msrHtml = renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement(MockStimulus, { kind: msrStimulus.stimulusType, content: msrStimulus.content, config: msrStimulus.config }),
    React.createElement(MockResponseControl, { responseType: msr.responseType, interaction: msr.interaction, options: options(msr), response: {}, onChange() {} }),
  ));
  assert.equal((msrHtml.match(/role="tab"/g) ?? []).length, 3);
  assert.equal((msrHtml.match(/type="radio"/g) ?? []).length, 6);

  const tpa = byType.get('TPA');
  const tpaHtml = renderToStaticMarkup(React.createElement(MockResponseControl, { responseType: tpa.responseType, interaction: tpa.interaction, options: options(tpa), response: {}, onChange() {} }));
  assert.equal((tpaHtml.match(/type="radio"/g) ?? []).length, 10);
  assert.equal((tpaHtml.match(/name="purse_i"/g) ?? []).length, 5);
  assert.equal((tpaHtml.match(/name="purse_ii"/g) ?? []).length, 5);
});
