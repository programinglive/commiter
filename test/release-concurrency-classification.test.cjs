'use strict';

// Targeted classification tests for concurrent releases and ambiguous pushes.
// Every scenario uses a real Git repository and a local bare remote.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runRelease } = require('../lib/release');

const git = (cwd, ...args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const gitSafe = (cwd, ...args) => {
  try {
    return git(cwd, ...args);
  } catch {
    return '';
  }
};

const posix = (value) => value.replace(/\\/g, '/');

function seed(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'commiter-classify-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const origin = path.join(root, 'origin.git');
  const base = path.join(root, 'base');
  fs.mkdirSync(base);
  git(root, 'init', '--bare', origin);
  git(origin, 'symbolic-ref', 'HEAD', 'refs/heads/main');
  git(base, 'init', '-b', 'main');
  git(base, 'config', 'user.name', 'Test');
  git(base, 'config', 'user.email', 'test@example.com');

  fs.writeFileSync(path.join(base, 'package.json'), `${JSON.stringify({
    name: 'classify-fixture',
    version: '1.0.0',
    scripts: { test: 'node -e "process.exit(0)"' },
    commiter: { release: { branch: 'main' } }
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(base, 'README.md'), '- **Versi**: 1.0.0 (tag `v1.0.0`)\n');
  fs.writeFileSync(path.join(base, '.gitignore'), 'node_modules/\n');
  fs.mkdirSync(path.join(base, 'src'), { recursive: true });
  fs.writeFileSync(path.join(base, 'src', 'app.js'), 'module.exports = 1;\n');
  fs.mkdirSync(path.join(base, 'docs', 'release-notes'), { recursive: true });
  fs.writeFileSync(path.join(base, 'docs', 'release-notes', 'RELEASE_NOTES.md'), [
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
  ].join('\n'));

  git(base, 'add', '.');
  git(base, 'commit', '-m', 'initial');
  git(base, 'remote', 'add', 'origin', origin);
  git(base, 'push', '-u', 'origin', 'main');

  return { root, origin, base };
}

function clone(root, origin, name) {
  const cwd = path.join(root, name);
  git(root, 'clone', '-b', 'main', origin, cwd);
  git(cwd, 'config', 'user.name', `Test ${name}`);
  git(cwd, 'config', 'user.email', `${name}@example.com`);
  return cwd;
}

function hook(repo, name, body) {
  const file = path.join(repo, 'hooks', name);
  fs.writeFileSync(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
}

// Create the "other releaser" commit and annotated tag without pushing it.
function winnerRelease(cwd, version) {
  const pkgPath = path.join(cwd, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  git(cwd, 'add', 'package.json');
  git(cwd, 'commit', '-m', `chore(release): v${version}`);
  git(cwd, 'tag', '-a', `v${version}`, '-m', `chore(release): v${version}`);
  return {
    commit: git(cwd, 'rev-parse', 'HEAD'),
    tag: git(cwd, 'rev-parse', `refs/tags/v${version}`)
  };
}

function concurrentFixture(t, winnerVersion) {
  const { root, origin, base } = seed(t);
  const winner = clone(root, origin, 'winner');
  const loser = clone(root, origin, 'loser');
  const winnerRefs = winnerRelease(winner, winnerVersion);
  // The loser's push is preceded by the winner's push, so the remote moves
  // after the loser's preflight and the loser's atomic push is rejected.
  hook(path.join(loser, '.git'), 'pre-push', [
    `git -C "${posix(winner)}" push origin main "refs/tags/v${winnerVersion}:refs/tags/v${winnerVersion}"`,
    'exit 0'
  ].join('\n'));
  return { root, origin, base, winner, loser, winnerRefs };
}

test('1. two concurrent patch releases: loser is REJECTED_CONCURRENT_UPDATE', (t) => {
  const { loser, winnerRefs } = concurrentFixture(t, '1.0.1');
  const before = git(loser, 'rev-parse', 'HEAD');

  const result = runRelease({ cwd: loser, log: () => {} });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'REJECTED_CONCURRENT_UPDATE', result.reason);
  assert.equal(git(loser, 'rev-parse', 'HEAD'), before, 'local commit must be rolled back');
  assert.equal(git(loser, 'tag', '-l'), '', 'local tag must be removed');
  assert.equal(git(loser, 'ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0], winnerRefs.commit);
  assert.equal(git(loser, 'ls-remote', 'origin', 'refs/tags/v1.0.1').split(/\s+/)[0], winnerRefs.tag);
});

test('2. patch and minor concurrently: loser is REJECTED_CONCURRENT_UPDATE', (t) => {
  const { loser, winnerRefs } = concurrentFixture(t, '1.1.0');
  const before = git(loser, 'rev-parse', 'HEAD');

  const result = runRelease({ cwd: loser, log: () => {} });

  assert.equal(result.state, 'REJECTED_CONCURRENT_UPDATE', result.reason);
  assert.equal(git(loser, 'rev-parse', 'HEAD'), before);
  assert.equal(git(loser, 'tag', '-l'), '');
  assert.equal(git(loser, 'ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0], winnerRefs.commit);
  assert.equal(git(loser, 'ls-remote', 'origin', 'refs/tags/v1.0.1'), '');
});

test('3. remote branch changes after preflight: FAILED with a clean tree', (t) => {
  const { root, origin, base } = seed(t);
  // The verify script pushes the winner's refs, so the remote moves after the
  // engine's preflight but before its final check.
  fs.writeFileSync(path.join(base, 'push-winner.cjs'), [
    "'use strict';",
    "const { execFileSync } = require('node:child_process');",
    "execFileSync('git', ['-C', process.env.WINNER_PATH, 'push', 'origin', 'main', 'refs/tags/v1.0.1'], { stdio: 'inherit' });"
  ].join('\n'));
  const pkgPath = path.join(base, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.commiter.release.verify = 'node push-winner.cjs';
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  git(base, 'add', '.');
  git(base, 'commit', '-m', 'test: verify pushes the winner');
  git(base, 'push', 'origin', 'main');

  const winner = clone(root, origin, 'winner');
  const loser = clone(root, origin, 'loser');
  winnerRelease(winner, '1.0.1');

  const before = git(loser, 'rev-parse', 'HEAD');
  process.env.WINNER_PATH = winner;
  let result;
  try {
    result = runRelease({ cwd: loser, log: () => {} });
  } finally {
    delete process.env.WINNER_PATH;
  }

  assert.equal(result.state, 'FAILED', result.reason);
  assert.match(result.reason, /Origin branch changed/i);
  assert.equal(git(loser, 'rev-parse', 'HEAD'), before);
  assert.equal(git(loser, 'tag', '-l'), '');
  assert.equal(git(loser, 'status', '--porcelain'), '');
});

test('4. concurrency loser with verified remote state names both refs', (t) => {
  const { loser, winnerRefs } = concurrentFixture(t, '1.0.1');

  const result = runRelease({ cwd: loser, log: () => {} });

  assert.equal(result.state, 'REJECTED_CONCURRENT_UPDATE', result.reason);
  assert.match(result.reason, new RegExp(winnerRefs.commit));
  assert.match(result.reason, new RegExp(winnerRefs.tag));
});

test('5. push succeeds but the response is lost: PUBLISHED', (t) => {
  const { root, origin } = seed(t);
  const cwd = clone(root, origin, 'lost-response');
  // The hook performs the atomic push itself, then aborts the engine's push so
  // the engine sees a non-zero exit while the remote already holds the refs.
  hook(path.join(cwd, '.git'), 'pre-push', [
    'git push --no-verify --atomic origin HEAD:refs/heads/main refs/tags/v1.0.1:refs/tags/v1.0.1',
    'exit 1'
  ].join('\n'));

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.ok, true, result.reason);
  assert.equal(result.state, 'PUBLISHED');
  assert.equal(git(cwd, 'ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0], result.commit);
  assert.equal(git(cwd, 'ls-remote', 'origin', 'refs/tags/v1.0.1').split(/\s+/)[0], git(cwd, 'rev-parse', 'refs/tags/v1.0.1'));
});

test('6. remote verification unavailable: UNKNOWN, local refs preserved', (t) => {
  const { root, origin } = seed(t);
  const cwd = clone(root, origin, 'no-verify');
  const missing = posix(path.join(root, 'missing.git'));
  // The push lands, then the remote URL becomes unreadable.
  hook(origin, 'post-receive', `git --git-dir="${posix(cwd)}/.git" remote set-url origin "${missing}"`);

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'UNKNOWN', result.reason);
  assert.equal(git(cwd, 'tag', '-l'), 'v1.0.1');
  assert.equal(git(cwd, 'rev-parse', 'refs/tags/v1.0.1^{commit}'), git(cwd, 'rev-parse', 'HEAD'));
});

test('7. remote branch changed and the target tag already exists', (t) => {
  const { loser, winnerRefs } = concurrentFixture(t, '1.0.1');

  const result = runRelease({ cwd: loser, log: () => {} });

  assert.equal(result.state, 'REJECTED_CONCURRENT_UPDATE', result.reason);
  assert.match(result.reason, /already|moved|Concurrent/i);
  assert.equal(git(loser, 'ls-remote', 'origin', 'refs/tags/v1.0.1').split(/\s+/)[0], winnerRefs.tag);
});

test('8. UNKNOWN does not roll back destructively', (t) => {
  const { root, origin } = seed(t);
  const cwd = clone(root, origin, 'unknown-safe');
  const missing = posix(path.join(root, 'missing.git'));
  hook(origin, 'post-receive', `git --git-dir="${posix(cwd)}/.git" remote set-url origin "${missing}"`);

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.state, 'UNKNOWN', result.reason);
  const head = git(cwd, 'rev-parse', 'HEAD');
  assert.equal(git(cwd, 'rev-parse', 'refs/tags/v1.0.1^{commit}'), head);
  assert.equal(git(cwd, 'status', '--porcelain'), '');
});

test('9. rejection cleanup keeps files the release did not generate', (t) => {
  const { root, origin } = seed(t);
  const cwd = clone(root, origin, 'cleanup-safe');
  hook(origin, 'pre-receive', 'exit 1');
  const appBefore = git(cwd, 'rev-parse', 'HEAD:src/app.js');

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.state, 'REJECTED', result.reason);
  assert.equal(git(cwd, 'rev-parse', 'HEAD:src/app.js'), appBefore);
  assert.equal(git(cwd, 'diff', '--', 'src/app.js'), '');
  assert.match(git(cwd, 'status', '--short'), /package\.json/);
});

test('10. a lightweight tag history does not disturb the new annotated tag', (t) => {
  const { root, origin } = seed(t);
  const cwd = clone(root, origin, 'lightweight');
  const original = git(cwd, 'rev-parse', 'HEAD');
  git(cwd, 'tag', 'v1.0.0');

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.ok, true, result.reason);
  assert.equal(git(cwd, 'cat-file', '-t', 'refs/tags/v1.0.1'), 'tag');
  assert.equal(git(cwd, 'cat-file', '-t', 'refs/tags/v1.0.0'), 'commit');
  assert.equal(git(cwd, 'rev-parse', 'refs/tags/v1.0.0'), original);
});
