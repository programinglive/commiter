'use strict';

// Regression tests for the four findings the v2 audit raised before the engine
// could be adopted: D1 (dirty tree after a pre-commit failure), D2 (paths with
// spaces), D3 (single-commit repository) and D4 (verify output in the reason).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runRelease } = require('../lib/release');

const git = (cwd, ...args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const NOTES_WITH_TABLE = [
  '# Release Notes',
  '',
  '| Version | Date | Highlight |',
  '| :--- | :--- | :--- |',
  '| 0.9.0 | 2026-01-01 | previous |',
  '',
  '## 0.9.0',
  '',
  'Previous release.',
  ''
].join('\n');

/**
 * Build a temporary repository with a local bare remote. Every file is
 * committed before the release so the working tree starts clean.
 */
function fixture(t, { verify = 'node -e "process.exit(0)"', notesPath = null, files = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'commiter-defect-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const cwd = path.join(root, 'repo');
  const origin = path.join(root, 'origin.git');
  fs.mkdirSync(cwd);
  git(root, 'init', '--bare', origin);
  git(cwd, 'init', '-b', 'main');
  git(cwd, 'config', 'user.name', 'Test');
  git(cwd, 'config', 'user.email', 'test@example.com');

  const pkg = {
    name: 'fixture',
    version: '1.0.0',
    scripts: { test: 'node -e "process.exit(0)"' },
    commiter: { release: { verify } }
  };
  if (notesPath) {
    pkg.commiter.release.releaseNotes = notesPath;
  }

  fs.writeFileSync(path.join(cwd, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);

  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(cwd, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }

  git(cwd, 'add', '.');
  git(cwd, 'commit', '-m', 'initial');
  git(cwd, 'remote', 'add', 'origin', origin);
  git(cwd, 'push', '-u', 'origin', 'main');

  return { cwd, origin };
}

test('D1: a verify failure after generation leaves the tree clean', (t) => {
  const { cwd } = fixture(t, { verify: 'node verify-fail.cjs', files: { 'verify-fail.cjs': 'process.exit(1);\n' } });
  const before = git(cwd, 'rev-parse', 'HEAD');

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'FAILED', result.reason);
  assert.equal(git(cwd, 'status', '--porcelain'), '', 'generated files must be restored');
  assert.equal(git(cwd, 'rev-parse', 'HEAD'), before);
  assert.equal(git(cwd, 'tag', '-l'), '');
});

test('D2: a changed file whose name contains a space is staged', (t) => {
  const notesPath = 'docs/release notes/RELEASE NOTES.md';
  const { cwd } = fixture(t, { notesPath, files: { [notesPath]: NOTES_WITH_TABLE } });

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.ok, true, result.reason);
  assert.equal(result.state, 'PUBLISHED');
  const committed = git(cwd, 'show', '--name-only', '--pretty=format:', 'HEAD')
    .split('\n')
    .filter(Boolean);
  assert.ok(committed.includes(notesPath), `expected ${notesPath} in ${committed.join(', ')}`);
});

test('D3: a repository with exactly one commit can release', (t) => {
  const { cwd } = fixture(t);
  assert.equal(git(cwd, 'rev-list', '--count', 'HEAD'), '1');

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.ok, true, result.reason);
  assert.equal(result.state, 'PUBLISHED');
});

test('D4: a verify failure reason names the failing output', (t) => {
  const { cwd } = fixture(t, {
    verify: 'node verify-fail.cjs',
    files: { 'verify-fail.cjs': 'console.error("BOOM-UNIQUE-42");\nprocess.exit(1);\n' }
  });

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.ok, false);
  assert.match(result.reason, /BOOM-UNIQUE-42/);
});
