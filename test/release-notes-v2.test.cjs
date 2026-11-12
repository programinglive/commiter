'use strict';

// D9: the v2 release-notes helper is a rewrite, not a move. These tests prove
// the three shapes the audit called out: a file without a table, a file without
// a `## ` section, and a table that must receive the row in the right place.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  insertReleaseNotesEntry,
  updateReleaseNotes
} = require('../lib/release-notes');

const TABLE = [
  '| Version | Date | Highlight |',
  '| :--- | :--- | :--- |',
  '| 0.9.0 | 2026-01-01 | previous |'
].join('\n');

test('a file without a table still receives the release section', () => {
  const next = insertReleaseNotesEntry({
    content: '# Release Notes\n\nNo table here.\n',
    version: '1.2.0',
    releaseDate: '2026-11-12',
    highlight: 'A change',
    detailBullets: ['First bullet', 'Second bullet']
  });

  assert.match(next, /## 1\.2\.0/);
  assert.match(next, /Released on \*\*2026-11-12\*\*\./);
  assert.match(next, /- First bullet/);
  assert.match(next, /- Second bullet/);
});

test('a file without a following `## ` section appends the detail at the end', () => {
  const next = insertReleaseNotesEntry({
    content: `# Release Notes\n\n${TABLE}\n`,
    version: '1.2.0',
    releaseDate: '2026-11-12',
    highlight: 'A change',
    detailBullets: ['Only bullet']
  });

  const lines = next.split('\n');
  const rowIndex = lines.findIndex((line) => line.startsWith('| 1.2.0 |'));
  const separatorIndex = lines.findIndex((line) => /^\|\s*:?-{3,}/.test(line));

  assert.equal(rowIndex, separatorIndex + 1, 'the new row must follow the separator');
  assert.ok(next.indexOf('## 1.2.0') > rowIndex, 'the detail section must come after the table');
});

test('the detail section is inserted before the next `## ` heading', () => {
  const content = `# Release Notes\n\n${TABLE}\n\n## 0.9.0\n\nPrevious release.\n`;
  const next = insertReleaseNotesEntry({
    content,
    version: '1.2.0',
    releaseDate: '2026-11-12',
    highlight: 'A change',
    detailBullets: ['Only bullet']
  });

  assert.ok(next.indexOf('## 1.2.0') < next.indexOf('## 0.9.0'));
  assert.ok(next.indexOf('| 1.2.0 |') < next.indexOf('## 1.2.0'));
});

test('updateReleaseNotes skips a version that is already documented', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'commiter-notes-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.mkdirSync(path.join(root, 'docs', 'release-notes'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '1.2.0' }));
  fs.writeFileSync(path.join(root, 'CHANGELOG.md'), '## 1.2.0\n\n* A change\n');
  fs.writeFileSync(
    path.join(root, 'docs', 'release-notes', 'RELEASE_NOTES.md'),
    `# Release Notes\n\n${TABLE}\n\n## 1.2.0\n\nAlready here.\n`
  );

  const changed = updateReleaseNotes({ rootDir: root });

  assert.equal(changed, false);
});

test('updateReleaseNotes returns false when the notes file is missing', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'commiter-notes-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '1.2.0' }));
  fs.writeFileSync(path.join(root, 'CHANGELOG.md'), '## 1.2.0\n\n* A change\n');

  assert.equal(updateReleaseNotes({ rootDir: root }), false);
});
