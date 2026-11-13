'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { updateReleaseNotes } = require('./release-notes');

const VALID_RELEASE_TYPES = new Set(['patch', 'minor', 'major', 'premajor', 'preminor', 'prepatch', 'prerelease']);
const DEFAULT_RELEASE_TYPE = 'patch';
const DEFAULT_NOTES = 'docs/release-notes/RELEASE_NOTES.md';
// Consumer repositories write the version line as `- **Versi**: 1.4.0 (tag
// `v1.4.0`)`. `Versi` is the legacy data format, not a message; `Version` is
// accepted for repositories that have already translated it.
const VERSION_LINE = /(^- \*\*(?:Versi|Version)\*\*:\s*)\S+(\s*\(tag\s*`v)[^`]+`/gm;
const SAFE_ARGS = new Set(['--dry-run', '--first-release']);

// A transport failure is not a rejection: the push may still be in flight on
// the server. Only a server-side rejection proves the push did not land.
const TRANSPORT_FAILURE = /(timed out|timeout|could not resolve host|connection (refused|reset|closed|timed out)|unable to access|network is unreachable|remote end hung up|early eof|rpc failed|ssl|tls|broken pipe|operation timed out)/i;
const SERVER_REJECTION = /(\[rejected\]|\[remote rejected\]|remote rejected|non-fast-forward|pre-receive hook declined|hook declined|does not support --atomic|atomic push failed|fetch first)/i;

class ReleaseError extends Error {
  constructor(message, state = 'FAILED') { super(message); this.name = 'ReleaseError'; this.state = state; }
}

function execute(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    ...options
  });
  if (result.error || result.status !== 0) {
    throw new ReleaseError(`${command} ${args.join(' ')} failed: ${String(result.stderr || result.error?.message || `exit ${result.status}`).trim().slice(0, 1000)}`);
  }
  return (result.stdout || '').trim();
}

function git(cwd, ...args) { return execute('git', args, cwd); }
function gitOptional(cwd, ...args) {
  const r = spawnSync('git', args, {cwd, encoding: 'utf8'});
  if (r.error) throw new ReleaseError(r.error.message);
  return { code: r.status, stdout: r.stdout || '', stderr: (r.stderr || '').trim() };
}
// `--porcelain=v1 -z` never quotes paths, so a name with a space survives
// intact. The non -z form wraps such a name in quotes and `slice(3)` then
// yields a path git cannot stage (D2).
function classifyPushFailure(stderr) {
  const text = String(stderr || '');
  // A server rejection can include a transport-ish tail (the atomic rejection
  // says "the remote end hung up unexpectedly" after refusing the request), so
  // the explicit rejection markers win.
  if (SERVER_REJECTION.test(text)) return 'rejected';
  if (TRANSPORT_FAILURE.test(text)) return 'transport';
  return 'unknown';
}
function changedPaths(cwd) {
  const raw = gitOptional(cwd, 'status', '--porcelain=v1', '-z', '--untracked-files=all').stdout;
  return raw.split('\0').filter(Boolean).map((entry) => entry.slice(3));
}
function semverParts(version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) throw new ReleaseError(`package.json version is not valid semver: ${version}`);
  return {major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), pre: match[4] || ''};
}
function predictVersion(version, type, firstRelease = false) {
  if (firstRelease) return '0.0.1';
  const v = semverParts(version);
  if (type === 'major') return `${v.major + (v.minor || v.patch || !v.pre ? 1 : 0)}.0.0`;
  if (type === 'minor') return `${v.major}.${v.minor + (v.patch || !v.pre ? 1 : 0)}.0`;
  if (type === 'patch') return `${v.major}.${v.minor}.${v.patch + (v.pre ? 0 : 1)}`;
  if (type === 'premajor') return `${v.major + 1}.0.0-0`;
  if (type === 'preminor') return `${v.major}.${v.minor + 1}.0-0`;
  if (type === 'prepatch') return `${v.major}.${v.minor}.${v.patch + 1}-0`;
  if (type === 'prerelease') {
    if (!v.pre) return `${v.major}.${v.minor}.${v.patch + 1}-0`;
    const pieces = v.pre.split('.');
    const index = pieces.findLastIndex(x => /^\d+$/.test(x));
    if (index === -1) pieces.push('0');
    else pieces[index] = String(Number(pieces[index]) + 1);
    return `${v.major}.${v.minor}.${v.patch}-${pieces.join('.')}`;
  }
  throw new ReleaseError(`Unknown release type: ${type}`);
}
function parseReleaseOptions({type = null, extraArgs = []} = {}) {
  if (type !== null && !VALID_RELEASE_TYPES.has(type)) throw new ReleaseError(`Unknown release type: ${type}`);
  if (!Array.isArray(extraArgs)) throw new ReleaseError('Invalid release arguments');
  for (const arg of extraArgs) if (!SAFE_ARGS.has(arg)) throw new ReleaseError(`Forbidden argument: ${String(arg)}. Only --dry-run and --first-release are allowed.`);
  if (new Set(extraArgs).size !== extraArgs.length) throw new ReleaseError('Release flags must not be duplicated');
  if (extraArgs.includes('--first-release') && type !== null) throw new ReleaseError('--first-release cannot be combined with a release type');
  return { type: type || DEFAULT_RELEASE_TYPE, dryRun: extraArgs.includes('--dry-run'), firstRelease: extraArgs.includes('--first-release') };
}
function loadPackage(cwd) {
  const json = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  if (typeof json.version !== 'string') throw new ReleaseError('package.json has no version');
  semverParts(json.version);
  return json;
}
function safeRelativePath(input) {
  if (typeof input !== 'string' || !input || input.includes('\\') || path.posix.isAbsolute(input) || input.split('/').includes('..') || input.split('/').includes('.')) throw new ReleaseError('releaseNotes path must be relative and must not traverse');
  return input;
}
function configFor(pkg, cwd = process.cwd()) {
  const raw = pkg.commiter?.release || {};
  const verify = raw.verify === undefined ? 'npm test' : raw.verify;
  if (typeof verify !== 'string' || !verify.trim()) throw new ReleaseError('commiter.release.verify must be a non-empty command');
  const branch = raw.branch === undefined ? 'main' : raw.branch;
  if (typeof branch !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch) || branch.includes('..') || branch.endsWith('/') || branch.includes('//')) throw new ReleaseError('commiter.release.branch is invalid');
  return {
    verify,
    branch,
    notesPath: safeRelativePath(raw.releaseNotes === undefined ? DEFAULT_NOTES : raw.releaseNotes),
    additionalFiles: safeAdditionalFiles(cwd, raw.additionalFiles)
  };
}
function checkClean(cwd) {
  if (git(cwd, 'status', '--porcelain=v1', '--untracked-files=all')) throw new ReleaseError('Working tree is not clean');
}
function ensurePathInside(cwd, relative) {
  const root = fs.realpathSync(cwd);
  const full = path.resolve(root, relative);
  if (full !== root && !full.startsWith(root + path.sep)) throw new ReleaseError(`Path escapes the repository: ${relative}`);
  // Resolve the nearest existing ancestor so a symlinked parent directory
  // cannot smuggle the path outside the repository.
  let probe = full;
  while (!fs.existsSync(probe)) {
    const parent = path.dirname(probe);
    if (parent === probe) break;
    probe = parent;
  }
  if (fs.existsSync(probe)) {
    const real = fs.realpathSync(probe);
    if (real !== root && !real.startsWith(root + path.sep)) throw new ReleaseError(`Path escapes the repository: ${relative}`);
  }
  return full;
}
// Additional release files are repository configuration, never a way to widen
// the allowlist arbitrarily. Every entry must be a relative path inside the
// repository, with no traversal, no .git access, and no symlink escape.
function safeAdditionalFiles(cwd, input) {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw new ReleaseError('commiter.release.additionalFiles must be an array');
  const result = [];
  for (const item of input) {
    if (typeof item !== 'string' || !item.trim()) throw new ReleaseError('commiter.release.additionalFiles entries must be non-empty strings');
    const value = item.trim();
    if (value.includes('\\')) throw new ReleaseError(`additionalFiles must use forward slashes: ${value}`);
    if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
      throw new ReleaseError(`additionalFiles must be relative: ${value}`);
    }
    const parts = value.split('/');
    if (parts.includes('') || parts.includes('..') || parts.includes('.')) {
      throw new ReleaseError(`additionalFiles must not traverse or contain empty segments: ${value}`);
    }
    if (parts[0] === '.git') throw new ReleaseError(`additionalFiles must not touch .git: ${value}`);
    ensurePathInside(cwd, value);
    result.push(value);
  }
  return result;
}
// Undo the generator's writes when a release fails before it creates a commit.
// Only allowlisted paths are touched: a file that existed at the original HEAD
// is restored from it, a file the generator created is deleted (D1).
function restoreGenerated({cwd, originalHead, allowed, log}) {
  const paths = [...allowed];
  if (!paths.length) return;
  gitOptional(cwd, 'reset', '--quiet', originalHead, '--', ...paths);
  for (const relative of paths) {
    const existed = gitOptional(cwd, 'cat-file', '-e', `${originalHead}:${relative}`).code === 0;
    if (existed) {
      // checkout-index rewrites the file from the index; the follow-up add
      // refreshes the stat cache. With core.autocrlf the restored file is
      // larger than the index blob, and git keeps reporting it as modified
      // until the index entry is rewritten.
      gitOptional(cwd, 'checkout-index', '-f', '--', relative);
      gitOptional(cwd, 'add', '--', relative);
    } else {
      const full = path.join(cwd, relative);
      if (fs.existsSync(full)) fs.rmSync(full, {force: true, recursive: true});
    }
  }
  log('Generated files restored to their original state; working tree is clean.');
}
function exactRemoteOid(cwd, ref) {
  const lines = git(cwd, 'ls-remote', 'origin', ref).split('\n').filter(Boolean);
  if (lines.length === 0) return null;
  const hit = lines.filter(line => line.split('\t')[1] === ref);
  if (hit.length !== 1) throw new ReleaseError(`Remote ref is ambiguous: ${ref}`, 'UNKNOWN');
  return hit[0].split(/\s+/)[0];
}
function localOid(cwd, ref) { return git(cwd, 'rev-parse', '--verify', ref); }
// Returns true/false when the ancestry is provable, null when the object is
// missing or git cannot answer. A null result must never be treated as "not
// published": the caller falls back to UNKNOWN.
function isAncestor(cwd, ancestor, descendant) {
  if (!ancestor || !descendant) return null;
  const result = gitOptional(cwd, 'merge-base', '--is-ancestor', ancestor, descendant);
  if (result.code === 0) return true;
  if (result.code === 1) return false;
  return null;
}
function existsLocalRef(cwd, ref) { return gitOptional(cwd, 'show-ref', '--verify', '--quiet', ref).code === 0; }
function ensureNoTag(cwd, tag) {
  const ref = `refs/tags/${tag}`;
  if (existsLocalRef(cwd, ref) || exactRemoteOid(cwd, ref)) throw new ReleaseError(`Tag ${tag} already exists; release cancelled`);
}
function syncReadme(cwd, version) {
  const name = 'README.md';
  const file = ensurePathInside(cwd, name);
  if (!fs.existsSync(file)) return false;
  const old = fs.readFileSync(file, 'utf8');
  const next = old.replace(VERSION_LINE, (match, prefix, tagPrefix) => `${prefix}${version}${tagPrefix}${version}\``);
  if (next === old) return false;
  fs.writeFileSync(file, next);
  return true;
}
function execVerify(cwd, verify, log) {
  const isWindows = process.platform === 'win32';
  const result = spawnSync(
    isWindows ? 'cmd.exe' : '/bin/sh',
    isWindows ? ['/d', '/s', '/c', verify] : ['-c', verify],
    {cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024}
  );
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (output) log(output);
  if (result.error || result.status !== 0) {
    const tail = output.split(/\r?\n/).slice(-20).join('\n');
    throw new ReleaseError(`Verify failed (${verify}) exit ${result.status}${tail ? `:\n${tail}` : ''}`);
  }
}
function verifyUnmodifiedSince(cwd, baselineStatus) {
  const current = git(cwd, 'status', '--porcelain=v1', '--untracked-files=all');
  if (current !== baselineStatus) throw new ReleaseError('Verify script modified the release tree; stopping before commit. Inspect the changes manually.');
}
function resolveCli() {
  try { return require.resolve('standard-version/bin/cli.js'); }
  catch { throw new ReleaseError('standard-version is not installed as a dependency'); }
}
// standard-version 9.5.0 still reads the deprecated `fs.F_OK`. The preload
// rewrites that module in memory; it must be injected into the child process
// because the generator no longer runs in this process.
function preloadFlag() {
  const file = path.join(__dirname, '..', 'scripts', 'preload', 'fs-f-ok.cjs');
  if (!fs.existsSync(file)) return null;
  const escaped = file.includes(' ') ? `"${file.replace(/"/g, '\\"')}"` : file;
  return `--require ${escaped}`;
}
function childEnv() {
  const flag = preloadFlag();
  if (!flag) return process.env;
  const existing = typeof process.env.NODE_OPTIONS === 'string' ? process.env.NODE_OPTIONS.trim() : '';
  return {...process.env, NODE_OPTIONS: existing ? `${existing} ${flag}` : flag};
}
function stageChanged(cwd, allowed) {
  const names = changedPaths(cwd);
  const unexpected = names.filter(name => !allowed.has(name));
  if (unexpected.length) throw new ReleaseError(`Generator changed files outside the allowlist: ${unexpected.join(', ')}`);
  if (!names.length) throw new ReleaseError('No version change to commit');
  // Re-validate immediately before staging: a hook can replace a directory
  // with a symlink after the configuration was validated.
  for (const name of names) ensurePathInside(cwd, name);
  git(cwd, 'add', '--', ...names);
  return names;
}
function cleanupLocal({cwd, originalHead, createdCommit, createdTag, log}) {
  if (createdTag && existsLocalRef(cwd, `refs/tags/${createdTag}`)) git(cwd, 'tag', '-d', createdTag);
  if (createdCommit && localOid(cwd, 'HEAD') === createdCommit) {
    git(cwd, 'reset', '--mixed', originalHead);
    log('Local commit rolled back to the original HEAD; file changes remain in the working tree.');
  }
}
function runRelease({cwd = process.cwd(), type = null, extraArgs = [], log = console.log} = {}) {
  let originalHead, createdCommit = null, createdTag = null, publishStarted = false, allowed = null;
  try {
    const args = parseReleaseOptions({type, extraArgs});
    const pkg = loadPackage(cwd);
    const cfg = configFor(pkg, cwd);
    if (git(cwd, 'rev-parse', '--is-inside-work-tree') !== 'true') throw new ReleaseError('Not a Git repository');
    const branch = git(cwd, 'symbolic-ref', '--quiet', '--short', 'HEAD');
    if (branch !== cfg.branch) throw new ReleaseError(`Must release from branch ${cfg.branch}, currently ${branch}`);
    checkClean(cwd);
    originalHead = localOid(cwd, 'HEAD');
    // Read-only dry run: fetch is intentionally skipped.
    if (!args.dryRun) git(cwd, 'fetch', '--no-tags', 'origin', `+refs/heads/${cfg.branch}:refs/remotes/origin/${cfg.branch}`);
    const remoteRef = `refs/heads/${cfg.branch}`;
    const remoteHead = exactRemoteOid(cwd, remoteRef);
    if (!remoteHead || remoteHead !== originalHead) throw new ReleaseError(`Local HEAD (${originalHead}) is not identical to origin/${cfg.branch} (${remoteHead || 'absent'})`);
    const predicted = predictVersion(pkg.version, args.type, args.firstRelease);
    if (args.firstRelease && pkg.version !== '0.0.0') throw new ReleaseError('--first-release is only accepted from package version 0.0.0');
    const tag = `v${predicted}`;
    ensureNoTag(cwd, tag);
    if (args.dryRun) {
      log(`DRY RUN (read-only): ${pkg.version} -> ${predicted}; branch ${cfg.branch}; tag ${tag}; verify=${cfg.verify}; atomic push branch + tag`);
      return {ok:true, dryRun:true, tag, state:'PLAN_ONLY'};
    }
    log(`Generating ${tag} from ${originalHead}`);
    // The allowlist is fixed before generation so a failure can restore exactly
    // the paths the generator is allowed to touch, and nothing else (D1).
    allowed = new Set(['package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'CHANGELOG.md', 'README.md', cfg.notesPath, ...cfg.additionalFiles]);
    const cli = resolveCli();
    execute(process.execPath, [cli, '--release-as', args.firstRelease ? '0.0.1' : args.type, '--skip.commit', '--skip.tag'], cwd, {stdio:'inherit', env: childEnv()});
    const actual = loadPackage(cwd).version;
    if (actual !== predicted) throw new ReleaseError(`Actual version ${actual} does not match predicted ${predicted}; check the standard-version config`);
    const notesFile = ensurePathInside(cwd, cfg.notesPath);
    if (fs.existsSync(notesFile)) updateReleaseNotes({rootDir: cwd, releaseNotesRelativePath:cfg.notesPath});
    syncReadme(cwd, actual);
    const staged = stageChanged(cwd, allowed);
    const beforeVerify = git(cwd, 'status', '--porcelain=v1', '--untracked-files=all');
    execVerify(cwd, cfg.verify, log);
    verifyUnmodifiedSince(cwd, beforeVerify);
    // A final no-mutation preflight: origin may have changed while verify ran.
    if (exactRemoteOid(cwd, remoteRef) !== originalHead) throw new ReleaseError('Origin branch changed during generate/verify; re-sync required');
    ensureNoTag(cwd, tag);
    git(cwd, 'commit', '-m', `chore(release): ${tag}`);
    createdCommit = localOid(cwd, 'HEAD');
    // `rev-list --parents` works on a root commit, where `HEAD^` does not (D3).
    const parents = git(cwd, 'rev-list', '--parents', '-n', '1', 'HEAD').split(/\s+/).slice(1);
    if (parents.length !== 1 || parents[0] !== originalHead) throw new ReleaseError('Release commit is not a direct child of the original HEAD');
    const committedPaths = git(cwd, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split('\n').filter(Boolean);
    const unexpectedCommit = committedPaths.filter(name => !allowed.has(name));
    if (unexpectedCommit.length) throw new ReleaseError(`Commit hook added files outside the allowlist: ${unexpectedCommit.join(', ')}`);
    if (git(cwd, 'status', '--porcelain=v1', '--untracked-files=all')) throw new ReleaseError('Commit hook left a dirty working tree; not publishing');
    git(cwd, 'tag', '-a', tag, '-m', `chore(release): ${tag}`, createdCommit);
    createdTag = tag;
    const localTag = localOid(cwd, `refs/tags/${tag}`);
    if (git(cwd, 'rev-parse', `${tag}^{commit}`) !== createdCommit) throw new ReleaseError('Tag does not point at the release commit');
    publishStarted = true;
    const pushed = gitOptional(cwd, 'push', '--atomic', 'origin', `HEAD:${remoteRef}`, `refs/tags/${tag}:refs/tags/${tag}`);
    // Even nonzero exit can mean remote received the push: verify before choosing rollback.
    let remoteCommit, remoteTag;
    try {
      remoteCommit = exactRemoteOid(cwd, remoteRef);
      remoteTag = exactRemoteOid(cwd, `refs/tags/${tag}`);
    } catch (error) {
      throw new ReleaseError(`Publication state UNKNOWN. Do not retry the release. Local tag ${tag}, commit ${createdCommit}. ${error.message}`, 'UNKNOWN');
    }
    if (remoteCommit === createdCommit && remoteTag === localTag) {
      if (pushed.code !== 0) log('Push reported an error, but the remote branch and tag match exactly; publication confirmed.');
      return {ok:true, tag, commit:createdCommit, state:'PUBLISHED', files:staged};
    }
    if (pushed.code !== 0 && classifyPushFailure(pushed.stderr) === 'rejected') {
      // The server rejected the push. Fetch the moved branch so ancestry can be
      // checked locally, then take a second remote snapshot. If the remote
      // changed between the two reads, the state is still moving and cannot be
      // proven. A transport failure never reaches this branch: it stays UNKNOWN
      // because the push may still be in flight on the server.
      gitOptional(cwd, 'fetch', '--no-tags', 'origin', `+refs/heads/${cfg.branch}:refs/remotes/origin/${cfg.branch}`);
      let remoteCommitAfter, remoteTagAfter;
      try {
        remoteCommitAfter = exactRemoteOid(cwd, remoteRef);
        remoteTagAfter = exactRemoteOid(cwd, `refs/tags/${tag}`);
      } catch (error) {
        throw new ReleaseError(`Publication state UNKNOWN. Do not retry the release. Local tag ${tag}, commit ${createdCommit}. ${error.message}`, 'UNKNOWN');
      }
      if (remoteCommitAfter !== remoteCommit || remoteTagAfter !== remoteTag) {
        throw new ReleaseError(
          `Publication state UNKNOWN: the remote changed while it was being inspected ` +
          `(branch ${remoteCommit} -> ${remoteCommitAfter}, tag ${remoteTag} -> ${remoteTagAfter}). ` +
          'Do not retry without inspection.',
          'UNKNOWN'
        );
      }

      // Our commit is published only if it is an ancestor of the remote branch.
      // A null answer (missing object, failed fetch) is never "not published".
      const ourCommitPublished = isAncestor(cwd, createdCommit, remoteCommit);
      // A concurrent release moves the branch forward from the original head.
      // A rewritten branch is not a concurrent release; it is ambiguous.
      const remoteMovedForward = isAncestor(cwd, originalHead, remoteCommit);

      if (remoteCommit === originalHead && remoteTag === null) {
        publishStarted = false;
        throw new ReleaseError(`Atomic push rejected without changing refs: ${pushed.stderr}`, 'REJECTED');
      }

      // A concurrent releaser moved the branch forward and our refs are
      // provably not on the remote: our commit is not an ancestor of the remote
      // branch, our tag object is not the remote tag, and the remote branch is
      // a descendant of the original head (not a rewrite).
      if (
        remoteCommit !== createdCommit &&
        remoteTag !== localTag &&
        remoteCommit !== originalHead &&
        ourCommitPublished === false &&
        remoteMovedForward === true
      ) {
        publishStarted = false;
        throw new ReleaseError(
          `Concurrent release detected: origin/${cfg.branch} moved to ${remoteCommit} and tag ${tag} is ${remoteTag || 'absent'}. ` +
          'This release was not published; the local commit and tag were rolled back. Re-sync and release again.',
          'REJECTED_CONCURRENT_UPDATE'
        );
      }
    }
    throw new ReleaseError(`Publication state UNKNOWN: branch=${remoteCommit}, tag=${remoteTag}. Do not retry without inspection.`, 'UNKNOWN');
  } catch (error) {
    const state = error.state || 'FAILED';
    if (state === 'UNKNOWN' || publishStarted) return {ok:false, state:'UNKNOWN', tag:createdTag, reason:error.message};
    if (originalHead && (createdCommit || createdTag)) {
      try { cleanupLocal({cwd, originalHead, createdCommit, createdTag, log}); }
      catch (cleanupError) { return {ok:false, state:'MANUAL_RECOVERY', reason:`${error.message}; rollback failed: ${cleanupError.message}`}; }
    } else if (originalHead && allowed) {
      // Nothing was committed yet, so the generator's writes are the only
      // change. Restore them instead of leaving a tree the operator must clean.
      try { restoreGenerated({cwd, originalHead, allowed, log}); }
      catch (restoreError) { return {ok:false, state:'MANUAL_RECOVERY', reason:`${error.message}; restore failed: ${restoreError.message}`}; }
    }
    return {ok:false, state, reason:error.message};
  }
}

module.exports = { runRelease, VALID_RELEASE_TYPES, DEFAULT_RELEASE_TYPE, parseReleaseOptions, predictVersion, syncReadme, configFor, ReleaseError };
