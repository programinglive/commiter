'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { updateReleaseNotes } = require('./release-notes');

const VALID_RELEASE_TYPES = new Set(['patch', 'minor', 'major', 'premajor', 'preminor', 'prepatch', 'prerelease']);
const DEFAULT_RELEASE_TYPE = 'patch';
const DEFAULT_NOTES = 'docs/release-notes/RELEASE_NOTES.md';
const VERSION_LINE = /(^- \*\*Versi\*\*:\s*)\S+(\s*\(tag\s*`v)[^`]+`/gm;
const SAFE_ARGS = new Set(['--dry-run', '--first-release']);

class ReleaseError extends Error {
  constructor(message, state = 'FAILED') { super(message); this.name = 'ReleaseError'; this.state = state; }
}

function execute(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    ...options
  });
  if (result.error || result.status !== 0) {
    throw new ReleaseError(`${command} ${args.join(' ')} gagal: ${String(result.stderr || result.error?.message || `exit ${result.status}`).trim().slice(0, 1000)}`);
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
function changedPaths(cwd) {
  const raw = gitOptional(cwd, 'status', '--porcelain=v1', '-z', '--untracked-files=all').stdout;
  return raw.split('\0').filter(Boolean).map((entry) => entry.slice(3));
}
function semverParts(version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) throw new ReleaseError(`package.json version bukan semver valid: ${version}`);
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
  throw new ReleaseError(`Tipe rilis tidak dikenal: ${type}`);
}
function parseReleaseOptions({type = null, extraArgs = []} = {}) {
  if (type !== null && !VALID_RELEASE_TYPES.has(type)) throw new ReleaseError(`Tipe rilis tidak dikenal: ${type}`);
  if (!Array.isArray(extraArgs)) throw new ReleaseError('Argumen rilis tidak valid');
  for (const arg of extraArgs) if (!SAFE_ARGS.has(arg)) throw new ReleaseError(`Argumen dilarang: ${String(arg)}. Hanya --dry-run dan --first-release.`);
  if (new Set(extraArgs).size !== extraArgs.length) throw new ReleaseError('Flag rilis tidak boleh duplikat');
  if (extraArgs.includes('--first-release') && type !== null) throw new ReleaseError('--first-release tidak boleh dipasangkan dengan release type');
  return { type: type || DEFAULT_RELEASE_TYPE, dryRun: extraArgs.includes('--dry-run'), firstRelease: extraArgs.includes('--first-release') };
}
function loadPackage(cwd) {
  const json = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  if (typeof json.version !== 'string') throw new ReleaseError('package.json tidak memiliki version');
  semverParts(json.version);
  return json;
}
function safeRelativePath(input) {
  if (typeof input !== 'string' || !input || input.includes('\\') || path.posix.isAbsolute(input) || input.split('/').includes('..') || input.split('/').includes('.')) throw new ReleaseError('releaseNotes path harus relatif, tanpa traversal');
  return input;
}
function configFor(pkg) {
  const raw = pkg.commiter?.release || {};
  const verify = raw.verify === undefined ? 'npm test' : raw.verify;
  if (typeof verify !== 'string' || !verify.trim()) throw new ReleaseError('commiter.release.verify harus command non-empty');
  const branch = raw.branch === undefined ? 'main' : raw.branch;
  if (typeof branch !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch) || branch.includes('..') || branch.endsWith('/') || branch.includes('//')) throw new ReleaseError('commiter.release.branch tidak valid');
  return {verify, branch, notesPath: safeRelativePath(raw.releaseNotes === undefined ? DEFAULT_NOTES : raw.releaseNotes)};
}
function checkClean(cwd) {
  if (git(cwd, 'status', '--porcelain=v1', '--untracked-files=all')) throw new ReleaseError('Working tree tidak bersih');
}
function ensurePathInside(cwd, relative) {
  const full = path.resolve(cwd, relative);
  const root = fs.realpathSync(cwd);
  if (full !== root && !full.startsWith(root + path.sep)) throw new ReleaseError(`Path keluar repository: ${relative}`);
  if (fs.existsSync(full) && !fs.realpathSync(full).startsWith(root + path.sep)) throw new ReleaseError(`Symlink keluar repository: ${relative}`);
  return full;
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
  log('Berkas hasil generate dikembalikan ke keadaan semula; pohon kerja bersih.');
}
function exactRemoteOid(cwd, ref) {
  const lines = git(cwd, 'ls-remote', 'origin', ref).split('\n').filter(Boolean);
  if (lines.length === 0) return null;
  const hit = lines.filter(line => line.split('\t')[1] === ref);
  if (hit.length !== 1) throw new ReleaseError(`Remote ref ambigu: ${ref}`, 'UNKNOWN');
  return hit[0].split(/\s+/)[0];
}
function localOid(cwd, ref) { return git(cwd, 'rev-parse', '--verify', ref); }
function existsLocalRef(cwd, ref) { return gitOptional(cwd, 'show-ref', '--verify', '--quiet', ref).code === 0; }
function ensureNoTag(cwd, tag) {
  const ref = `refs/tags/${tag}`;
  if (existsLocalRef(cwd, ref) || exactRemoteOid(cwd, ref)) throw new ReleaseError(`Tag ${tag} sudah ada, release dibatalkan`);
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
    throw new ReleaseError(`Verify gagal (${verify}) exit ${result.status}${tail ? `:\n${tail}` : ''}`);
  }
}
function verifyUnmodifiedSince(cwd, baselineStatus) {
  const current = git(cwd, 'status', '--porcelain=v1', '--untracked-files=all');
  if (current !== baselineStatus) throw new ReleaseError('Verify script memodifikasi release tree; hentikan sebelum commit. Periksa perubahan manual.');
}
function resolveCli() {
  try { return require.resolve('standard-version/bin/cli.js'); }
  catch { throw new ReleaseError('standard-version belum terinstal sebagai dependency'); }
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
  if (unexpected.length) throw new ReleaseError(`Generator mengubah file di luar allowlist: ${unexpected.join(', ')}`);
  if (!names.length) throw new ReleaseError('Tidak ada perubahan versi untuk di-commit');
  git(cwd, 'add', '--', ...names);
  return names;
}
function cleanupLocal({cwd, originalHead, createdCommit, createdTag, log}) {
  if (createdTag && existsLocalRef(cwd, `refs/tags/${createdTag}`)) git(cwd, 'tag', '-d', createdTag);
  if (createdCommit && localOid(cwd, 'HEAD') === createdCommit) {
    git(cwd, 'reset', '--mixed', originalHead);
    log('Commit lokal di-rollback ke HEAD semula; perubahan file tetap berada di working tree.');
  }
}
function runRelease({cwd = process.cwd(), type = null, extraArgs = [], log = console.log} = {}) {
  let originalHead, createdCommit = null, createdTag = null, publishStarted = false, allowed = null;
  try {
    const args = parseReleaseOptions({type, extraArgs});
    const pkg = loadPackage(cwd);
    const cfg = configFor(pkg);
    if (git(cwd, 'rev-parse', '--is-inside-work-tree') !== 'true') throw new ReleaseError('Bukan repository Git');
    const branch = git(cwd, 'symbolic-ref', '--quiet', '--short', 'HEAD');
    if (branch !== cfg.branch) throw new ReleaseError(`Harus release dari branch ${cfg.branch}, sekarang ${branch}`);
    checkClean(cwd);
    originalHead = localOid(cwd, 'HEAD');
    // Read-only dry run: fetch is intentionally skipped.
    if (!args.dryRun) git(cwd, 'fetch', '--no-tags', 'origin', `+refs/heads/${cfg.branch}:refs/remotes/origin/${cfg.branch}`);
    const remoteRef = `refs/heads/${cfg.branch}`;
    const remoteHead = exactRemoteOid(cwd, remoteRef);
    if (!remoteHead || remoteHead !== originalHead) throw new ReleaseError(`HEAD lokal (${originalHead}) tidak identik dengan origin/${cfg.branch} (${remoteHead || 'absent'})`);
    const predicted = predictVersion(pkg.version, args.type, args.firstRelease);
    if (args.firstRelease && pkg.version !== '0.0.0') throw new ReleaseError('--first-release hanya diterima dari package version 0.0.0');
    const tag = `v${predicted}`;
    ensureNoTag(cwd, tag);
    if (args.dryRun) {
      log(`DRY RUN (read-only): ${pkg.version} -> ${predicted}; branch ${cfg.branch}; tag ${tag}; verify=${cfg.verify}; atomic push branch + tag`);
      return {ok:true, dryRun:true, tag, state:'PLAN_ONLY'};
    }
    log(`Generate ${tag} dari ${originalHead}`);
    // The allowlist is fixed before generation so a failure can restore exactly
    // the paths the generator is allowed to touch, and nothing else (D1).
    allowed = new Set(['package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'CHANGELOG.md', 'README.md', cfg.notesPath]);
    const cli = resolveCli();
    execute(process.execPath, [cli, '--release-as', args.firstRelease ? '0.0.1' : args.type, '--skip.commit', '--skip.tag'], cwd, {stdio:'inherit', env: childEnv()});
    const actual = loadPackage(cwd).version;
    if (actual !== predicted) throw new ReleaseError(`Versi actual ${actual} tidak sesuai predicted ${predicted}; periksa standard-version config`);
    const notesFile = ensurePathInside(cwd, cfg.notesPath);
    if (fs.existsSync(notesFile)) updateReleaseNotes({rootDir: cwd, releaseNotesRelativePath:cfg.notesPath});
    syncReadme(cwd, actual);
    const staged = stageChanged(cwd, allowed);
    const beforeVerify = git(cwd, 'status', '--porcelain=v1', '--untracked-files=all');
    execVerify(cwd, cfg.verify, log);
    verifyUnmodifiedSince(cwd, beforeVerify);
    // A final no-mutation preflight: origin may have changed while verify ran.
    if (exactRemoteOid(cwd, remoteRef) !== originalHead) throw new ReleaseError('Origin branch berubah saat generate/verify; perlu sinkronisasi ulang');
    ensureNoTag(cwd, tag);
    git(cwd, 'commit', '-m', `chore(release): ${tag}`);
    createdCommit = localOid(cwd, 'HEAD');
    // `rev-list --parents` works on a root commit, where `HEAD^` does not (D3).
    const parents = git(cwd, 'rev-list', '--parents', '-n', '1', 'HEAD').split(/\s+/).slice(1);
    if (parents.length !== 1 || parents[0] !== originalHead) throw new ReleaseError('Release commit bukan child langsung original HEAD');
    const committedPaths = git(cwd, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split('\n').filter(Boolean);
    const unexpectedCommit = committedPaths.filter(name => !allowed.has(name));
    if (unexpectedCommit.length) throw new ReleaseError(`Commit hook menambahkan file di luar allowlist: ${unexpectedCommit.join(', ')}`);
    if (git(cwd, 'status', '--porcelain=v1', '--untracked-files=all')) throw new ReleaseError('Commit hook menghasilkan working tree kotor; tidak publish');
    git(cwd, 'tag', '-a', tag, '-m', `chore(release): ${tag}`, createdCommit);
    createdTag = tag;
    const localTag = localOid(cwd, `refs/tags/${tag}`);
    if (git(cwd, 'rev-parse', `${tag}^{commit}`) !== createdCommit) throw new ReleaseError('Tag tidak menunjuk release commit');
    publishStarted = true;
    const pushed = gitOptional(cwd, 'push', '--atomic', 'origin', `HEAD:${remoteRef}`, `refs/tags/${tag}:refs/tags/${tag}`);
    // Even nonzero exit can mean remote received the push: verify before choosing rollback.
    let remoteCommit, remoteTag;
    try {
      remoteCommit = exactRemoteOid(cwd, remoteRef);
      remoteTag = exactRemoteOid(cwd, `refs/tags/${tag}`);
    } catch (error) {
      throw new ReleaseError(`State publikasi UNKNOWN. Jangan ulangi release. Tag lokal ${tag}, commit ${createdCommit}. ${error.message}`, 'UNKNOWN');
    }
    if (remoteCommit === createdCommit && remoteTag === localTag) {
      if (pushed.code !== 0) log('Push melaporkan error, tetapi branch dan tag remote cocok persis; publication confirmed.');
      return {ok:true, tag, commit:createdCommit, state:'PUBLISHED', files:staged};
    }
    if (remoteCommit === originalHead && remoteTag === null && pushed.code !== 0) {
      publishStarted = false;
      throw new ReleaseError(`Atomic push ditolak tanpa perubahan refs: ${pushed.stderr}`);
    }
    throw new ReleaseError(`State publikasi UNKNOWN: branch=${remoteCommit}, tag=${remoteTag}. Jangan retry tanpa inspeksi.`, 'UNKNOWN');
  } catch (error) {
    if (error.state === 'UNKNOWN' || publishStarted) return {ok:false, state:'UNKNOWN', tag:createdTag, reason:error.message};
    if (originalHead && (createdCommit || createdTag)) {
      try { cleanupLocal({cwd, originalHead, createdCommit, createdTag, log}); }
      catch (cleanupError) { return {ok:false, state:'MANUAL_RECOVERY', reason:`${error.message}; rollback gagal: ${cleanupError.message}`}; }
    } else if (originalHead && allowed) {
      // Nothing was committed yet, so the generator's writes are the only
      // change. Restore them instead of leaving a tree the operator must clean.
      try { restoreGenerated({cwd, originalHead, allowed, log}); }
      catch (restoreError) { return {ok:false, state:'MANUAL_RECOVERY', reason:`${error.message}; restore gagal: ${restoreError.message}`}; }
    }
    return {ok:false, state:'FAILED', reason:error.message};
  }
}

module.exports = { runRelease, VALID_RELEASE_TYPES, DEFAULT_RELEASE_TYPE, parseReleaseOptions, predictVersion, syncReadme, configFor, ReleaseError };
