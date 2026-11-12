'use strict';

// Fault injection per release phase. The engine has no dependency injection, so
// each failure is produced by a real repository condition: a failing
// standard-version lifecycle script, a failing verify command, a rejecting
// commit hook, an unwritable tag ref, a rejecting remote, and a remote that
// accepts the push but loses the tag.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runRelease } = require('../lib/release');

const git = (cwd, ...args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function fixture(t, { verify = 'node -e "process.exit(0)"', pkgExtra = {}, files = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'commiter-fault-'));
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
    commiter: { release: { verify } },
    ...pkgExtra
  };
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

function hook(repo, name, body) {
  const file = path.join(repo, 'hooks', name);
  fs.writeFileSync(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
}

test('generate failure: standard-version lifecycle fails, tree is restored', (t) => {
  const { cwd } = fixture(t, {
    pkgExtra: { 'standard-version': { scripts: { postchangelog: 'exit 1' } } }
  });
  const before = git(cwd, 'rev-parse', 'HEAD');

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'FAILED', result.reason);
  assert.equal(git(cwd, 'status', '--porcelain'), '');
  assert.equal(git(cwd, 'rev-parse', 'HEAD'), before);
  assert.equal(git(cwd, 'tag', '-l'), '');
});

test('verify failure: tree is restored and the reason names the output', (t) => {
  const { cwd } = fixture(t, {
    verify: 'node verify-fail.cjs',
    files: { 'verify-fail.cjs': 'console.error("VERIFY-BOOM");\nprocess.exit(1);\n' }
  });
  const before = git(cwd, 'rev-parse', 'HEAD');

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.state, 'FAILED', result.reason);
  assert.match(result.reason, /VERIFY-BOOM/);
  assert.equal(git(cwd, 'status', '--porcelain'), '');
  assert.equal(git(cwd, 'rev-parse', 'HEAD'), before);
});

test('commit failure: a rejecting pre-commit hook leaves a clean tree', (t) => {
  const { cwd } = fixture(t);
  hook(path.join(cwd, '.git'), 'pre-commit', 'exit 1');
  const before = git(cwd, 'rev-parse', 'HEAD');

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.state, 'FAILED', result.reason);
  assert.equal(git(cwd, 'status', '--porcelain'), '');
  assert.equal(git(cwd, 'rev-parse', 'HEAD'), before);
  assert.equal(git(cwd, 'tag', '-l'), '');
});

test('tag failure: the commit is rolled back and generated files are preserved', (t) => {
  const { cwd } = fixture(t);
  const before = git(cwd, 'rev-parse', 'HEAD');
  // A stale lock file makes `git tag` fail after the release commit exists.
  fs.mkdirSync(path.join(cwd, '.git', 'refs', 'tags'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.git', 'refs', 'tags', 'v1.0.1.lock'), 'stale');

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.state, 'FAILED', result.reason);
  assert.equal(git(cwd, 'rev-parse', 'HEAD'), before);
  assert.equal(git(cwd, 'tag', '-l'), '');
  assert.match(git(cwd, 'status', '--short'), /package\.json/);
});

test('push failure: a rejecting remote rolls back the commit, no fallback', (t) => {
  const { cwd, origin } = fixture(t);
  hook(origin, 'pre-receive', 'exit 1');
  const before = git(cwd, 'rev-parse', 'HEAD');

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.state, 'FAILED', result.reason);
  assert.equal(git(cwd, 'rev-parse', 'HEAD'), before);
  assert.equal(git(cwd, 'tag', '-l'), '');
  assert.equal(git(cwd, 'ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0], before);
  assert.equal(git(cwd, 'ls-remote', 'origin', 'refs/tags/v1.0.1'), '');
});

test('atomic push rejection: the release fails instead of falling back', (t) => {
  const { cwd, origin } = fixture(t);
  git(origin, 'config', 'receive.advertiseAtomic', 'false');
  const before = git(cwd, 'rev-parse', 'HEAD');

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.state, 'FAILED', result.reason);
  assert.match(result.reason, /Atomic push ditolak|atomic/i);
  assert.equal(git(cwd, 'rev-parse', 'HEAD'), before);
  assert.equal(git(cwd, 'ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0], before);
  assert.equal(git(cwd, 'ls-remote', 'origin', 'refs/tags/v1.0.1'), '');
});

test('remote verification failure: state is UNKNOWN and local refs are preserved', (t) => {
  const { cwd, origin } = fixture(t);
  // The push is accepted, then the tag disappears from the remote.
  hook(origin, 'post-receive', 'git update-ref -d refs/tags/v1.0.1');

  const result = runRelease({ cwd, log: () => {} });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'UNKNOWN', result.reason);
  assert.match(result.reason, /UNKNOWN/);
  const remoteHead = git(cwd, 'ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0];
  assert.equal(git(cwd, 'rev-parse', 'HEAD'), remoteHead);
  assert.equal(git(cwd, 'rev-parse', 'refs/tags/v1.0.1^{commit}'), remoteHead);
});
