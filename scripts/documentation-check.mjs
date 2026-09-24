import fs from 'node:fs';
import path from 'node:path';

const repositoryRoot = process.cwd();
const errors = [];

function walk(relativeDirectory) {
  const absoluteDirectory = path.join(repositoryRoot, relativeDirectory);
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    return entry.isDirectory() ? walk(relativePath) : [relativePath];
  });
}

const documentationArtifacts = [
  ...walk('docs'),
  ...walk('instruction'),
].filter((file) => /\.(md|sql|json|csv)$/i.test(file)).sort();

const markdownFiles = documentationArtifacts.filter((file) => file.endsWith('.md'));

function report(message) {
  errors.push(message);
}

function removeLinkDecoration(rawTarget) {
  const withoutTitle = rawTarget.trim().split(/\s+["']/u)[0];
  const withoutAngles = withoutTitle.replace(/^<|>$/gu, '');
  return decodeURIComponent(withoutAngles.split('#')[0].split('?')[0]);
}

for (const file of markdownFiles) {
  const source = fs.readFileSync(path.join(repositoryRoot, file), 'utf8');
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/gu;

  for (const match of source.matchAll(linkPattern)) {
    const rawTarget = match[1].trim();
    if (
      rawTarget.startsWith('#')
      || /^(https?:|mailto:|tel:|data:)/iu.test(rawTarget)
    ) continue;

    const target = removeLinkDecoration(rawTarget);
    if (!target) continue;

    const resolved = path.resolve(repositoryRoot, path.dirname(file), target);
    if (!fs.existsSync(resolved)) {
      report(`${file}: broken relative link ${rawTarget}`);
    }
  }
}

const livingDocuments = [
  'docs/PROJECT_MANUAL.md',
  'docs/CURRENT_STATE.md',
  'docs/README.md',
  'docs/governance/engineering-handbook.md',
  'docs/governance/documentation-consolidation-project.md',
  'instruction/README.md',
];

for (const file of livingDocuments) {
  const absolutePath = path.join(repositoryRoot, file);
  if (!fs.existsSync(absolutePath)) {
    report(`Missing canonical living document: ${file}`);
    continue;
  }

  const source = fs.readFileSync(absolutePath, 'utf8');
  if (!source.startsWith('# ')) report(`${file}: missing level-one title`);
  if (!/^Status: /mu.test(source)) report(`${file}: missing Status header`);
  if (!/^Owner: /mu.test(source)) report(`${file}: missing Owner header`);
  if (!/^(Last updated|As of): /mu.test(source)) report(`${file}: missing update timestamp header`);
}

const requiredCurrentStateSections = [
  '## 1. Production identity',
  '## 2. Staging state',
  '## 3. Source-control state',
  '## 4. Confirmed user-visible state',
  '## 6. Active documentation release',
  '## 7. Exact next action',
  '## 9. Rollback for this documentation project',
  '## 11. Pending decisions and confirmations',
];

const currentState = fs.readFileSync(path.join(repositoryRoot, 'docs/CURRENT_STATE.md'), 'utf8');
for (const heading of requiredCurrentStateSections) {
  if (!currentState.includes(heading)) report(`docs/CURRENT_STATE.md: missing required section ${heading}`);
}

const archivedContinuationDocuments = [
  'docs/handoffs/ace-club-lms-running-handoff.md',
  'docs/handoffs/pilot-iterations-running-handoff.md',
  'docs/pilot-v2/README.md',
];

for (const file of archivedContinuationDocuments) {
  const source = fs.readFileSync(path.join(repositoryRoot, file), 'utf8');
  if (!/^Status: Archived/mu.test(source)) {
    report(`${file}: competing continuation document must remain Archived`);
  }
  if (!source.includes('CURRENT_STATE.md')) {
    report(`${file}: archived continuation document must point to Current State`);
  }
}

const inventoryPath = path.join(repositoryRoot, 'docs/governance/document-inventory.csv');
if (!fs.existsSync(inventoryPath)) {
  report('Missing documentation inventory.');
} else {
  const inventory = fs.readFileSync(inventoryPath, 'utf8');
  const inventoryPaths = new Set(
    inventory.split('\n').slice(1).filter(Boolean).map((line) => line.match(/^"([^"]+)"/u)?.[1]).filter(Boolean),
  );

  for (const file of documentationArtifacts) {
    if (!inventoryPaths.has(file)) report(`Inventory missing artifact: ${file}`);
  }

  for (const file of inventoryPaths) {
    if (!documentationArtifacts.includes(file)) report(`Inventory references missing artifact: ${file}`);
  }
}

if (errors.length > 0) {
  console.error(`Documentation checks failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Documentation checks passed: ${markdownFiles.length} Markdown files and ${documentationArtifacts.length} inventoried artifacts.`);
