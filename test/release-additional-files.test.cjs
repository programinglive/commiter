'use strict';

// Path-safety and additional-file tests for the release allowlist. Every
// scenario uses a real Git repository and a local bare remote.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runRelease } = require('../lib/release');

const git = (cwd, ...args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const WRITER = [
  "'use strict';",
  "const fs = require('node:fs');",
  "const path = require('node:path');",
  "const target = process.env.EXTRA_FILE || 'docs/AI_CONTEXT.md';",
  "const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;",
  "fs.mkdirSync(path.dirname(target), { recursive: true });",
  "fs.writeFileSync(target, `# AI Context\\n\\nCurrent version: ${version}\\n`);"
].join('\n');

function fixture(t, { additionalFiles, extraFile = 'docs/AI_CONTEXT.md' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'commiter-additional-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const cwd = path.join(root, 'repo');
  const origin = path.join(root, 'origin.git');
  fs.mkdirSync(cwd);
  git(root, 'init', '--bare', origin);
  git(origin, 'symbolic-ref', 'HEAD', 'refs/heads/main');
  git(cwd, 'init', '-b', 'main');
  git(cwd, 'config', 'user.name', 'Test');
  git(cwd, 'config', 'user.email', 'test@example.com');

  const pkg = {
    name: 'additional-fixture',
    version: '1.0.0',
    scripts: { test: 'node -e "process.exit(0)"' },
    commiter: { release: { branch: 'main' } },
    'standard-version': { scripts: { postchangelog: 'node write-extra.cjs' } }
  };
  if (additionalFiles !== undefined) {
    pkg.commiter.release.additionalFiles = additionalFiles;
  }
  fs.writeFileSync(path.join(cwd, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
  fs.writeFileSync(path.join(cwd, 'write-extra.cjs'), `${WRITER}\n`);
  fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules/\n');
  fs.mkdirSync(path.join(cwd, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'docs', 'AI_CONTEXT.md'), '# AI Context\n\nCurrent version: 1.0.0\n');

  git(cwd, 'add', '.');
  git(cwd, 'commit', '-m', 'initial');
  git(cwd, 'remote', 'add', 'origin', origin);
  git(cwd, 'push', '-u', 'origin', 'main');

  return { root, cwd, origin, extraFile };
}

function release(fixtureValue) {
  process.env.EXTRA_FILE = fixtureValue.extraFile;
  try {
    return runRelease({ cwd: fixtureValue.cwd, log: () => {} });
  } finally {
    delete process.env.EXTRA_FILE;
  }
}

test('default allowlist stays strict: an unexpected generated file fails', (t) => {
  const f = fixture(t, { extraFile: 'docs/UNEXPECTED.md' });
  const before = git(f.cwd, 'rev-parse', 'HEAD');

  const result = release(f);

  assert.equal(result.state, 'FAILED', result.reason);
  assert.match(result.reason, /outside the allowlist/i);
  assert.equal(git(f.cwd, 'rev-parse', 'HEAD'), before);
  // The unexpected file is outside the allowlist, so the engine must not delete
  // it: it is left for the operator to inspect.
  assert.match(git(f.cwd, 'status', '--porcelain'), /docs\/UNEXPECTED\.md/);
});

test('a configured additional file is allowed and committed', (t) => {
  const f = fixture(t, { additionalFiles: ['docs/AI_CONTEXT.md'] });

  const result = release(f);

  assert.equal(result.ok, true, result.reason);
  assert.equal(result.state, 'PUBLISHED');
  const committed = git(f.cwd, 'show', '--name-only', '--pretty=format:', 'HEAD').split('\n').filter(Boolean);
  assert.ok(committed.includes('docs/AI_CONTEXT.md'), committed.join(','));
  assert.match(fs.readFileSync(path.join(f.cwd, 'docs', 'AI_CONTEXT.md'), 'utf8'), /1\.0\.1/);
});

test('an absolute additional path is rejected before any mutation', (t) => {
  const f = fixture(t, { additionalFiles: ['/etc/passwd'] });
  const before = git(f.cwd, 'rev-parse', 'HEAD');

  const result = release(f);

  assert.equal(result.state, 'FAILED', result.reason);
  assert.match(result.reason, /must be relative/i);
  assert.equal(git(f.cwd, 'rev-parse', 'HEAD'), before);
  assert.equal(git(f.cwd, 'status', '--porcelain'), '');
});

test('a parent-directory traversal is rejected', (t) => {
  const f = fixture(t, { additionalFiles: ['../outside.md'] });

  const result = release(f);

  assert.equal(result.state, 'FAILED', result.reason);
  assert.match(result.reason, /traverse/i);
});

test('a .git path is rejected', (t) => {
  const f = fixture(t, { additionalFiles: ['.git/config'] });

  const result = release(f);

  assert.equal(result.state, 'FAILED', result.reason);
  assert.match(result.reason, /\.git/i);
});

test('a symlink that escapes the repository is rejected', (t) => {
  const f = fixture(t, { additionalFiles: ['docs/link/secret.md'] });
  const outside = path.join(f.root, 'outside');
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, 'secret.md'), 'secret\n');
  const link = path.join(f.cwd, 'docs', 'link');
  fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');

  const result = release(f);

  assert.equal(result.state, 'FAILED', result.reason);
  assert.match(result.reason, /escapes the repository/i);
});

test('a file outside the configured additional files still fails', (t) => {
  const f = fixture(t, { additionalFiles: ['docs/AI_CONTEXT.md'], extraFile: 'docs/OTHER.md' });

  const result = release(f);

  assert.equal(result.state, 'FAILED', result.reason);
  assert.match(result.reason, /outside the allowlist/i);
  assert.match(git(f.cwd, 'status', '--porcelain'), /docs\/OTHER\.md/);
});

test('additionalFiles must be an array of non-empty strings', (t) => {
  const f = fixture(t, { additionalFiles: 'docs/AI_CONTEXT.md' });

  const result = release(f);

  assert.equal(result.state, 'FAILED', result.reason);
  assert.match(result.reason, /must be an array/i);
});
