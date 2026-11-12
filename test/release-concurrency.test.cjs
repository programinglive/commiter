'use strict';

// Two releases from the same parent must not both succeed. Each clone has its
// own working tree, so the only shared state is the bare remote: exactly one
// push can win, and the loser must report the remote state instead of retrying.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile, execFileSync } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const ENGINE = path.join(__dirname, '..', 'lib', 'release.js');

const git = (cwd, ...args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function seed(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'commiter-concurrency-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const origin = path.join(root, 'origin.git');
  const seedRepo = path.join(root, 'seed');
  fs.mkdirSync(seedRepo);
  git(root, 'init', '--bare', origin);
  git(seedRepo, 'init', '-b', 'main');
  git(seedRepo, 'config', 'user.name', 'Test');
  git(seedRepo, 'config', 'user.email', 'test@example.com');
  fs.writeFileSync(
    path.join(seedRepo, 'package.json'),
    `${JSON.stringify({ name: 'fixture', version: '1.0.0', scripts: { test: 'node -e "process.exit(0)"' } }, null, 2)}\n`
  );
  git(seedRepo, 'add', '.');
  git(seedRepo, 'commit', '-m', 'initial');
  git(seedRepo, 'remote', 'add', 'origin', origin);
  git(seedRepo, 'push', '-u', 'origin', 'main');

  return { root, origin };
}

function clone(root, origin, name) {
  const cwd = path.join(root, name);
  git(root, 'clone', origin, cwd);
  // Distinct identities keep the two release commits distinct even when both
  // processes run inside the same second; otherwise identical trees and
  // timestamps would produce the same OID and the race would be a no-op.
  git(cwd, 'config', 'user.name', `Test ${name}`);
  git(cwd, 'config', 'user.email', `${name}@example.com`);
  return cwd;
}

function releaseIn(cwd, resultFile) {
  const script = [
    `const {runRelease}=require(${JSON.stringify(ENGINE)});`,
    `const r=runRelease({cwd:${JSON.stringify(cwd)},log:()=>{}});`,
    `require('fs').writeFileSync(${JSON.stringify(resultFile)},JSON.stringify(r));`
  ].join('');
  return execFileAsync(process.execPath, ['-e', script], { cwd, encoding: 'utf8' })
    .then(() => JSON.parse(fs.readFileSync(resultFile, 'utf8')));
}

async function runPair(t, firstType, secondType) {
  const { root, origin } = seed(t);
  const first = clone(root, origin, 'first');
  const second = clone(root, origin, 'second');

  const firstResult = await releaseIn(first, path.join(root, 'first.json'));
  const secondResult = await releaseIn(second, path.join(root, 'second.json'));

  assert.equal(firstResult.ok, true, firstResult.reason);
  assert.equal(firstResult.state, 'PUBLISHED');
  assert.equal(secondResult.ok, false, 'the second release must not succeed');
  assert.match(secondResult.reason, /origin|remote|Tag|tidak identik/i);

  return { firstResult, secondResult };
}

test('same type: only the first release succeeds', async (t) => {
  await runPair(t, 'patch', 'patch');
});

test('patch then minor: only the first release succeeds', async (t) => {
  await runPair(t, 'patch', 'minor');
});

test('minor then major: only the first release succeeds', async (t) => {
  await runPair(t, 'minor', 'major');
});

test('two concurrent processes from the same parent: exactly one publishes', async (t) => {
  const { root, origin } = seed(t);
  const first = clone(root, origin, 'first');
  const second = clone(root, origin, 'second');

  const settled = await Promise.allSettled([
    releaseIn(first, path.join(root, 'first.json')),
    releaseIn(second, path.join(root, 'second.json'))
  ]);
  const results = settled.map((entry) => {
    assert.equal(entry.status, 'fulfilled', entry.reason && entry.reason.message);
    return entry.value;
  });

  const published = results.filter((result) => result.ok === true);
  const rejected = results.filter((result) => result.ok === false);

  assert.equal(published.length, 1, `expected exactly one publisher, got ${JSON.stringify(results)}`);
  assert.equal(published[0].state, 'PUBLISHED');
  assert.equal(rejected.length, 1);
  assert.ok(['FAILED', 'UNKNOWN'].includes(rejected[0].state), rejected[0].state);
  assert.match(rejected[0].reason, /origin|remote|Tag|tidak identik/i);
});
