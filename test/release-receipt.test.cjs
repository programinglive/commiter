'use strict';
// Release receipt: a durable record of which engine produced a release.
//
// The Git remote proves the commit and tag exist; it cannot prove the command
// that made them. These tests pin the receipt's contract:
//   * it is written only from verified facts;
//   * it never dirties the working tree and never joins the release commit;
//   * it records UNKNOWN and REJECTED as faithfully as PUBLISHED;
//   * it never stores a credential-bearing URL;
//   * a receipt failure never changes the release result.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {runRelease, sanitizeRemote, receiptDirectory, buildReceipt, writeReceipt} = require('../lib/release');

const git = (cwd, ...args) => execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'commiter-receipt-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const origin = path.join(root, 'origin.git');
  const cwd = path.join(root, 'repo');
  fs.mkdirSync(cwd);
  git(root, 'init', '--bare', origin);
  git(cwd, 'init', '-b', 'main');
  git(cwd, 'config', 'user.name', 'Test');
  git(cwd, 'config', 'user.email', 'test@example.com');
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({
    name: 'fixture', version: '1.0.0', scripts: {test: 'node -e "process.exit(0)"'}
  }, null, 2) + '\n');
  git(cwd, 'add', 'package.json');
  git(cwd, 'commit', '-m', 'initial');
  git(cwd, 'remote', 'add', 'origin', origin);
  git(cwd, 'push', '-u', 'origin', 'main');
  return {cwd, origin};
}

function receipts(cwd) {
  const dir = receiptDirectory(cwd);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => n.endsWith('.json')).map((n) => JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')));
}

test('a published release writes a receipt with the verified OIDs', (t) => {
  const {cwd} = fixture(t);
  const result = runRelease({cwd, log: () => {}});
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.state, 'PUBLISHED');

  const [receipt] = receipts(cwd);
  assert.ok(receipt, 'no receipt was written');
  assert.equal(receipt.result, 'PUBLISHED');
  assert.equal(receipt.tag, result.tag);
  assert.equal(receipt.releaseCommit, result.commit);
  assert.equal(receipt.remoteBranchOid, result.commit);
  assert.equal(receipt.localTagObject, git(cwd, 'rev-parse', `refs/tags/${result.tag}`));
  assert.equal(receipt.remoteTagObject, receipt.localTagObject);
  assert.equal(receipt.originalHead, git(cwd, 'rev-parse', `${result.commit}^`));
  assert.equal(receipt.branch, 'main');
  assert.equal(receipt.command, 'commiter release');
  assert.match(receipt.commiter.version, /^\d+\.\d+\.\d+/);
  assert.equal(receipt.commiter.name, '@programinglive/commiter');
  assert.ok(receipt.timestamp);
  assert.match(receipt.verification, /remote OID comparison/);
});

test('the receipt never dirties the working tree or joins the release commit', (t) => {
  const {cwd} = fixture(t);
  const result = runRelease({cwd, log: () => {}});
  assert.equal(result.ok, true, result.reason);

  assert.equal(git(cwd, 'status', '--porcelain'), '', 'the receipt dirtied the working tree');
  const committed = git(cwd, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split('\n').filter(Boolean);
  assert.ok(!committed.some((n) => n.includes('commiter-receipts')), 'the receipt joined the release commit');
  // The tag still points at the release commit, not at a receipt commit.
  assert.equal(git(cwd, 'rev-parse', `${result.tag}^{commit}`), result.commit);
});

test('a failed release records the failure instead of staying silent', (t) => {
  const {cwd} = fixture(t);
  fs.writeFileSync(path.join(cwd, 'dirty.tmp'), 'dirty');
  const result = runRelease({cwd, log: () => {}});
  assert.equal(result.ok, false);

  const [receipt] = receipts(cwd);
  assert.ok(receipt, 'a failed release wrote no receipt');
  assert.notEqual(receipt.result, 'PUBLISHED');
  assert.ok(receipt.reason, 'the failure reason was not recorded');
});

test('a dry run writes no receipt', (t) => {
  const {cwd} = fixture(t);
  const result = runRelease({cwd, extraArgs: ['--dry-run'], log: () => {}});
  assert.equal(result.state, 'PLAN_ONLY');
  assert.deepEqual(receipts(cwd), []);
});

test('the receipt never stores a credential-bearing remote URL', (t) => {
  const {cwd} = fixture(t);
  // Point the remote at a credential-bearing URL only for the builder, so the
  // release itself still runs against the reachable local origin.
  git(cwd, 'remote', 'set-url', 'origin', 'https://user:secret-token@example.invalid/repo.git');
  const receipt = buildReceipt({
    cwd, branch: 'main', releaseType: 'patch', originalHead: 'a'.repeat(40),
    createdCommit: 'b'.repeat(40), createdTag: 'v1.0.1',
    facts: {localTag: 'c'.repeat(40), remoteCommit: 'b'.repeat(40), remoteTag: 'c'.repeat(40)},
    result: 'PUBLISHED'
  });
  assert.ok(!JSON.stringify(receipt).includes('secret-token'), 'the receipt leaked a token');
  assert.equal(receipt.repository.remote, 'https://example.invalid/repo.git');
});

test('sanitizeRemote strips credentials and leaves a clean URL alone', () => {
  assert.equal(sanitizeRemote('https://user:pass@host/x.git'), 'https://host/x.git');
  assert.equal(sanitizeRemote('https://host/x.git'), 'https://host/x.git');
  assert.equal(sanitizeRemote('git@github.com:org/repo.git'), 'git@github.com:org/repo.git');
  assert.equal(sanitizeRemote(null), null);
});

test('a receipt write failure does not change the release result', (t) => {
  const {cwd} = fixture(t);
  // Make the receipt directory impossible to create by putting a file in its place.
  fs.writeFileSync(path.join(cwd, '.git', 'commiter-receipts'), 'not a directory');
  const result = runRelease({cwd, log: () => {}});
  assert.equal(result.ok, true, 'a receipt failure must not fail a published release');
  assert.equal(result.state, 'PUBLISHED');
});

test('two receipts written in the same millisecond never collide', (t) => {
  const {cwd} = fixture(t);
  const base = {
    cwd, branch: 'main', releaseType: 'patch', originalHead: 'a'.repeat(40),
    createdCommit: 'b'.repeat(40), createdTag: 'v1.0.1',
    facts: {localTag: 'c'.repeat(40), remoteCommit: 'b'.repeat(40), remoteTag: 'c'.repeat(40)},
    result: 'PUBLISHED'
  };
  const first = buildReceipt(base);
  const second = buildReceipt(base);
  // Force the same timestamp so only the unique suffix can separate them.
  second.timestamp = first.timestamp;
  const fileA = writeReceipt(cwd, first);
  const fileB = writeReceipt(cwd, second);
  assert.ok(fileA && fileB);
  assert.notEqual(fileA, fileB, 'two receipts in the same millisecond shared a filename');
  assert.equal(receipts(cwd).length, 2);
});

test('an existing receipt is never overwritten', (t) => {
  const {cwd} = fixture(t);
  const receipt = buildReceipt({
    cwd, branch: 'main', releaseType: 'patch', originalHead: 'a'.repeat(40),
    createdCommit: 'b'.repeat(40), createdTag: 'v1.0.1',
    facts: {localTag: 'c'.repeat(40), remoteCommit: 'b'.repeat(40), remoteTag: 'c'.repeat(40)},
    result: 'PUBLISHED'
  });
  const file = writeReceipt(cwd, receipt);
  assert.ok(file);
  const before = fs.readFileSync(file, 'utf8');
  // A second write with the same name must not replace the first.
  const again = writeReceipt(cwd, receipt);
  assert.notEqual(again, file, 'the second write reused the first filename');
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'the first receipt was overwritten');
});
